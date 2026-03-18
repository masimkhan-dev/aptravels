import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole, UserRole } from "@/hooks/useRole";
import {
  LayoutDashboard, Package, Briefcase, MessageSquare, LogOut, Menu, X, Plane, Images, Users, CreditCard, UserCog, Globe, Settings, Receipt, Wallet, History, Key, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NavLink {
  to: string;
  icon: any;
  label: string;
  roles: UserRole[];
}

const links: NavLink[] = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ['admin'] },
  { to: "/admin/expenses", icon: Receipt, label: "Expenses", roles: ['admin'] },
  { to: "/admin/agents", icon: Users, label: "Agents Registry", roles: ['admin', 'manager'] },
  { to: "/admin/agent-ledger", icon: Wallet, label: "Agent Ledger", roles: ['admin', 'manager'] },
  { to: "/admin/inquiries", icon: MessageSquare, label: "Inquiries", roles: ['admin', 'manager', 'sales'] },
  { to: "/admin/customers", icon: Users, label: "Customers", roles: ['admin', 'manager', 'sales'] },
  { to: "/admin/bookings", icon: CreditCard, label: "Bookings", roles: ['admin', 'manager', 'sales', 'ops'] },
  { to: "/admin/packages", icon: Package, label: "Packages", roles: ['admin', 'manager'] },
  { to: "/admin/services", icon: Briefcase, label: "Services", roles: ['admin', 'manager'] },
  { to: "/admin/gallery", icon: Images, label: "Ads & Promotions", roles: ['admin', 'manager'] },
  { to: "/admin/settings", icon: Settings, label: "Site Settings", roles: ['admin'] },
  { to: "/admin/testimonials", icon: MessageSquare, label: "Testimonials", roles: ['admin', 'manager'] },
  { to: "/admin/staff", icon: UserCog, label: "Staff", roles: ['admin'] },
  { to: "/", icon: Globe, label: "View Website", roles: ['admin', 'manager', 'sales', 'ops'] },
];

export default function AdminLayout() {
  const { role, loading: roleLoading } = useRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!roleLoading && !role) {
      navigate("/admin/login");
    }
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inquiries",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            toast.success("New inquiry received!");
          }
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

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
        {/* Skeleton sidebar */}
        <div className="hidden lg:flex flex-col w-64 bg-secondary border-r border-sidebar-border p-6 gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-sidebar-accent animate-pulse" />
            <div className="h-3.5 w-28 bg-sidebar-accent rounded animate-pulse" />
          </div>
          <div className="space-y-2 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-sidebar-accent/60 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
        {/* Skeleton main */}
        <div className="flex-1 flex flex-col">
          <div className="h-14 bg-card border-b border-border animate-pulse" />
          <div className="flex-1 p-6 space-y-4">
            <div className="h-8 w-48 bg-muted-foreground/10 rounded-xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted-foreground/8 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
            <div className="h-64 rounded-2xl bg-muted-foreground/8 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const filteredLinks = links.filter(link => link.roles.includes(role));

  return (
    <div className="min-h-screen bg-muted flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-secondary text-secondary-foreground transform transition-transform duration-200 no-print ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold/50 flex items-center justify-center bg-transparent shadow-gold relative">
              <img src="/logo-main.png" alt="Akbar Pura Logo" className="w-[110%] h-[110%] object-cover mix-blend-multiply contrast-125 transition-transform hover:scale-110" />
            </div>
            <div className="text-center">
              <p className="font-display text-sm font-black leading-tight uppercase text-gold tracking-tighter">Akbar Pura Travels</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {filteredLinks.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? "sidebar-link-active"
                    : "text-secondary-foreground/70 hover:bg-sidebar-accent hover:text-secondary-foreground hover:translate-x-0.5"
                }`}
              >
                <l.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-gold" : ""}`} />
                {l.label}
                {l.label === "Inquiries" && unreadCount > 0 && (
                  <span className="ml-auto text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full font-black">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 focus:outline-none space-y-2">
          <button
            onClick={() => setShowChangePassword(true)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-secondary-foreground/70 hover:bg-sidebar-accent hover:text-secondary-foreground transition-colors w-full"
          >
            <Key className="w-4 h-4" /> Change Password
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-secondary-foreground/70 hover:bg-sidebar-accent hover:text-red-500 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-4 lg:px-6 no-print">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground uppercase tracking-tight">
            {links.find((l) => l.to === location.pathname)?.label || "Admin"}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-gold hover:bg-gold/10 transition-colors border border-gold/20"
              title="Visit Website"
            >
              <Globe className="w-3.5 h-3.5" />
              Visit Site
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet context={{ unreadCount }} />
        </main>
      </div>

      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleChangePassword}>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your new password below.
              </DialogDescription>
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
    </div>
  );
}
