import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole, UserRole } from "@/hooks/useRole";
import {
  LayoutDashboard, Package, Briefcase, MessageSquare, LogOut, Menu, X,
  Images, Users, CreditCard, UserCog, Globe, Settings, Receipt, Wallet,
  ChevronDown, Key, Loader2, Search
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  GlobalSearch
} from "./GlobalSearch";
import {
    Search as SearchIcon
} from "lucide-react";

// ─── Nav Group Definitions ────────────────────────────────────────────────────

interface NavItem {
  to: string;
  icon: any;
  label: string;
  roles: UserRole[];
}

interface NavGroup {
  id: string;
  label: string;
  roles: UserRole[]; // group is shown if user role is in this list
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "sales",
    label: "Sales",
    roles: ["admin", "manager", "sales", "ops"],
    items: [
      { to: "/admin/customers", icon: Users, label: "Customers", roles: ["admin", "manager", "sales"] },
      { to: "/admin/bookings", icon: CreditCard, label: "Bookings", roles: ["admin", "manager", "sales", "ops"] },
      { to: "/admin/inquiries", icon: MessageSquare, label: "Inquiries", roles: ["admin", "manager", "sales"] },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    roles: ["admin", "manager"],
    items: [
      { to: "/admin/packages", icon: Package, label: "Packages", roles: ["admin", "manager"] },
      { to: "/admin/services", icon: Briefcase, label: "Services", roles: ["admin", "manager"] },
      { to: "/admin/agents", icon: Users, label: "Agents Registry", roles: ["admin", "manager"] },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    roles: ["admin", "manager"],
    items: [
      { to: "/admin/agent-ledger", icon: Wallet, label: "Agent Ledger", roles: ["admin", "manager"] },
      { to: "/admin/expenses", icon: Receipt, label: "Expenses", roles: ["admin"] },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    roles: ["admin", "manager"],
    items: [
      { to: "/admin/settings", icon: Settings, label: "Site Settings", roles: ["admin"] },
      { to: "/admin/staff", icon: UserCog, label: "Staff", roles: ["admin"] },
      { to: "/admin/gallery", icon: Images, label: "Ads & Promotions", roles: ["admin", "manager"] },
      { to: "/admin/testimonials", icon: MessageSquare, label: "Testimonials", roles: ["admin", "manager"] },
      { to: "/", icon: Globe, label: "View Website", roles: ["admin", "manager", "sales", "ops"] },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "apt_sidebar_collapsed";

function loadCollapsedState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCollapsedState(state: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminLayout() {
  const { role, loading: roleLoading } = useRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(loadCollapsedState);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-expand the group that contains the active route
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((g) =>
      g.items.some((item) => item.to === location.pathname)
    );
    if (activeGroup && collapsed[activeGroup.id]) {
      const next = { ...collapsed, [activeGroup.id]: false };
      setCollapsed(next);
      saveCollapsedState(next);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Phase 1B: Global Search Command Palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);


  useEffect(() => {
    if (!roleLoading && !role) navigate("/admin/login");
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };
    fetchUnread();
    const channel = supabase
      .channel("admin-inquiries-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "inquiries" }, (payload) => {
        if (payload.eventType === "INSERT") toast.success("New inquiry received!");
        fetchUnread();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleGroup = (id: string) => {
    const next = { ...collapsed, [id]: !collapsed[id] };
    setCollapsed(next);
    saveCollapsedState(next);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message || "Failed to update password.");
    } else {
      toast.success("Password updated successfully!");
      setShowChangePassword(false);
      setNewPassword("");
    }
    setUpdatingPassword(false);
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-muted flex">
        <div className="hidden lg:flex flex-col w-60 bg-secondary border-r border-sidebar-border p-6 gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-sidebar-accent animate-pulse" />
            <div className="h-3.5 w-28 bg-sidebar-accent rounded animate-pulse" />
          </div>
          <div className="space-y-2 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-sidebar-accent/60 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-14 bg-card border-b border-border animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex">

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-secondary text-secondary-foreground flex flex-col transform transition-transform duration-200 no-print ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-gold/40 flex items-center justify-center bg-transparent shadow-sm">
            <img src="/logo-main.png" alt="Logo" className="w-full h-full object-cover mix-blend-multiply contrast-125" />
          </div>
          <div>
            <p className="font-display text-xs font-black uppercase text-gold tracking-tight leading-tight">Akbar Pura</p>
            <p className="text-[10px] text-secondary-foreground/50 font-medium">Travels Suite</p>
          </div>
        </div>

        {/* Scroll area */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">

          {/* Dashboard — always visible */}
          <Link
            to="/admin/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              location.pathname === "/admin/dashboard"
                ? "sidebar-link-active"
                : "text-secondary-foreground/65 hover:bg-sidebar-accent hover:text-secondary-foreground"
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${location.pathname === "/admin/dashboard" ? "text-gold" : ""}`} />
            Dashboard
          </Link>

          {/* Groups */}
          {NAV_GROUPS.map((group) => {
            // Filter items by role
            const visibleItems = group.items.filter((item) => role && item.roles.includes(role));
            // Hide group entirely if user has no role in group or no visible items
            if (!role || !group.roles.includes(role) || visibleItems.length === 0) return null;

            const isOpen = !collapsed[group.id];
            const hasActive = visibleItems.some((item) => item.to === location.pathname);

            return (
              <Collapsible key={group.id} open={isOpen} onOpenChange={() => toggleGroup(group.id)}>
                <CollapsibleTrigger asChild>
                  <button
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                      hasActive
                        ? "text-gold"
                        : "text-secondary-foreground/40 hover:text-secondary-foreground/70"
                    }`}
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pb-1">
                  {visibleItems.map((item) => {
                    const active = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                          active
                            ? "sidebar-link-active"
                            : "text-secondary-foreground/65 hover:bg-sidebar-accent hover:text-secondary-foreground"
                        }`}
                      >
                        <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-gold" : ""}`} />
                        <span className="flex-1">{item.label}</span>
                        {item.label === "Inquiries" && unreadCount > 0 && (
                          <span className="text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full font-black">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-sidebar-border space-y-0.5 shrink-0">
          <button
            onClick={() => setShowChangePassword(true)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-secondary-foreground/60 hover:bg-sidebar-accent hover:text-secondary-foreground transition-colors w-full"
          >
            <Key className="w-4 h-4" /> Change Password
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-secondary-foreground/60 hover:bg-sidebar-accent hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top header */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 lg:px-5 no-print shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground">
            <Menu className="w-6 h-6" />
          </button>

          {/* Page title */}
          <h1 className="font-display text-base font-bold text-foreground uppercase tracking-tight">
            {[...NAV_GROUPS.flatMap((g) => g.items), { to: "/admin/dashboard", label: "Dashboard" }]
              .find((l) => l.to === location.pathname)?.label || "Admin"}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            {/* Ctrl+K hint — placeholder for Phase 1B */}
            <button
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted border border-border/60 transition-colors"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon className="w-3.5 h-3.5" />
              <span>Search</span>
              <kbd className="text-[10px] bg-muted border border-border px-1.5 py-0.5 rounded font-mono">Ctrl+K</kbd>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet context={{ unreadCount }} />
        </main>
      </div>

      {/* ── Change Password Dialog ── */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleChangePassword}>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>Enter your new password below.</DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <label className="text-sm font-medium mb-2 block">New Password</label>
              <Input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowChangePassword(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gold hover:bg-gold/90 text-white font-bold" disabled={updatingPassword}>
                {updatingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Global Search Command Palette ── */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
