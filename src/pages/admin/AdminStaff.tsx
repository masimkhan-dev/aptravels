import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Plus,
    UserCog,
    Shield,
    Loader2,
    Trash2,
    User,
    Briefcase,
    CheckCircle2,
    X,
    Info,
    Globe,
    CreditCard,
    Key,
    UserPlus,
    Eye
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AppRole = "admin" | "manager" | "sales" | "ops";

interface StaffMember {
    id: string; // user_roles row ID
    user_id: string;
    role: AppRole;
    email?: string;
    full_name?: string;
}

const ROLES = [
    {
        id: 'admin',
        title: 'Administrator',
        description: 'Full System & Access Control.',
        icon: Shield,
        color: 'text-red-500',
        bg: 'bg-red-50',
        darkBg: 'dark:bg-red-500/10',
        border: 'border-red-200 dark:border-red-500/20'
    },
    {
        id: 'manager',
        title: 'Manager',
        description: 'Team & Operations Oversight.',
        icon: Briefcase,
        color: 'text-blue-500',
        bg: 'bg-blue-50',
        darkBg: 'dark:bg-blue-500/10',
        border: 'border-blue-200 dark:border-blue-500/20'
    },
    {
        id: 'sales',
        title: 'Sales',
        description: 'Inquiries & Bookings handling.',
        icon: CreditCard,
        color: 'text-green-500',
        bg: 'bg-green-50',
        darkBg: 'dark:bg-green-500/10',
        border: 'border-green-200 dark:border-green-500/20'
    },
    {
        id: 'ops',
        title: 'Operations',
        description: 'Logistics & backend operations.',
        icon: Eye,
        color: 'text-amber-500',
        bg: 'bg-amber-50',
        darkBg: 'dark:bg-amber-500/10',
        border: 'border-amber-200 dark:border-amber-500/20'
    }
];

export default function AdminStaff() {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalTab, setModalTab] = useState<'create' | 'link'>('create');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Create Mode Form
    const [createData, setCreateData] = useState({
        full_name: "",
        email: "",
        password: "",
        role: "manager" as AppRole
    });

    // Link Mode Form (Fallback)
    const [linkData, setLinkData] = useState({
        user_id: "",
        role: "manager" as AppRole
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get current logged in user so they don't delete themselves
            const { data: authData } = await supabase.auth.getUser();
            if (authData.user) {
                setCurrentUserId(authData.user.id);
            }

            const { data: rolesData, error: rolesError } = await supabase.from("user_roles").select("*");
            if (rolesError) throw rolesError;

            const { data: profilesData, error: profilesError } = await supabase.from("staff_profiles").select("*");
            if (profilesError) throw profilesError;

            const enrichedStaff = rolesData?.map(role => {
                const profile = profilesData?.find(p => p.id === role.user_id);
                return {
                    ...role,
                    email: profile?.email || "Unknown Email",
                    full_name: profile?.full_name || "Unknown Staff"
                };
            }) || [];

            setStaff(enrichedStaff);
        } catch (error: any) {
            toast.error("Failed to fetch staff data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateFinal = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('create-staff-user', {
                body: createData
            });

            if (error) {
                if (error.message.includes('Function not found') || error.message.includes('Failed to send a request')) {
                    toast.error("Edge Function not deployed! Run 'supabase functions deploy create-staff-user' in your terminal, or use the 'Link Existing' tab as a fallback.", {
                        duration: 8000
                    });
                } else {
                    toast.error(`Error: ${error.message}`);
                }
                setLoading(false);
                return;
            }

            toast.success("Staff member created successfully!");
            setShowModal(false);
            setCreateData({ full_name: "", email: "", password: "", role: "manager" });
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Failed to create user.");
        } finally {
            setLoading(false);
        }
    };

    const handleLinkFinal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkData.user_id) return;

        setLoading(true);
        try {
            const { error } = await supabase.from("user_roles").insert([{
                ...linkData,
                role: linkData.role as AppRole
            }]);
            if (error) throw error;

            toast.success("User linked successfully");
            setShowModal(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to revoke this user's access?")) return;
        try {
            const { error } = await supabase.from("user_roles").delete().eq("id", id);
            if (error) throw error;
            toast.success("Access revoked successfully");
            fetchData();
        } catch (error) {
            toast.error("Failed to revoke access");
        }
    };

    const getRoleConfig = (role: string) => {
        return ROLES.find(r => r.id === role.toLowerCase()) || ROLES[1];
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-foreground">
                        <div className="p-2 bg-gold/10 rounded-xl">
                            <UserCog className="w-6 h-6 text-gold" />
                        </div>
                        Staff Management
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Currently managing <span className="font-bold text-foreground">{staff.length}</span> active team members.
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold/90 text-secondary rounded-xl font-medium text-sm transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add New Staff
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-border/50 bg-muted/20 flex items-center justify-between gap-4">
                            <h3 className="font-semibold text-sm sm:text-base">Team Directory</h3>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-background px-2 py-1 rounded border border-border sm:hidden">
                                Swipe &rarr;
                            </span>
                        </div>
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-border">
                            <table className="w-full text-left text-xs sm:text-sm min-w-[600px] sm:min-w-0">
                                <thead>
                                    <tr className="bg-muted/10 border-b border-border/50">
                                        <th className="px-4 sm:px-6 py-4 font-medium text-muted-foreground">Team Member</th>
                                        <th className="px-4 sm:px-6 py-4 font-medium text-muted-foreground">Role</th>
                                        <th className="px-4 sm:px-6 py-4 text-right font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50 text-foreground">
                                    {loading ? (
                                        <tr><td colSpan={3} className="px-6 py-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gold" />Loading records...</td></tr>
                                    ) : staff.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                                            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="font-medium text-foreground">No active staff</p>
                                            <p className="text-sm">Click 'Add New Staff' to get started.</p>
                                        </td></tr>
                                    ) : (
                                        staff.map((s) => {
                                            const config = getRoleConfig(s.role);
                                            return (
                                                <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border", config.bg, config.darkBg, config.border)}>
                                                                <config.icon className={cn("w-5 h-5", config.color)} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-foreground group-hover:text-gold transition-colors">{s.full_name}</span>
                                                                <span className="text-xs text-muted-foreground">{s.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
                                                            config.bg, config.darkBg, config.color, config.border
                                                        )}>
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            {config.title}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {s.user_id === currentUserId ? (
                                                            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 px-3 py-1.5 bg-muted/50 rounded-full border border-border/50">Current User</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleDelete(s.id)}
                                                                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                                title="Revoke Access"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-6 bg-card rounded-2xl border border-border/50 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-4">
                            <Shield className="w-5 h-5 text-gold" />
                            <h4 className="font-semibold">Role Permissions</h4>
                        </div>
                        <div className="space-y-5">
                            {ROLES.map((item, idx) => (
                                <div key={idx} className="flex gap-3">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border shrink-0", item.bg, item.darkBg, item.border, item.color)}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden shadow-black/20">
                        <div className="flex items-center justify-between p-5 border-b border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gold/10 rounded-lg text-gold">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Add Staff Member</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-6 pt-4 gap-6 border-b border-border/50">
                            <button
                                onClick={() => setModalTab('create')}
                                className={cn("pb-3 text-sm font-medium transition-all", modalTab === 'create' ? "border-b-2 border-gold text-foreground" : "border-b-2 border-transparent text-muted-foreground hover:text-foreground")}
                            >
                                Create Account
                            </button>
                            <button
                                onClick={() => setModalTab('link')}
                                className={cn("pb-3 text-sm font-medium transition-all", modalTab === 'link' ? "border-b-2 border-gold text-foreground" : "border-b-2 border-transparent text-muted-foreground hover:text-foreground")}
                            >
                                Link Existing
                            </button>
                        </div>

                        {modalTab === 'create' ? (
                            <form onSubmit={handleCreateFinal} className="p-6 space-y-4">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                required
                                                placeholder="e.g. John Doe"
                                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm transition-all"
                                                value={createData.full_name}
                                                onChange={e => setCreateData({ ...createData, full_name: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground">Email Address</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                required
                                                type="email"
                                                placeholder="john@akbarpuratravels.com"
                                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm transition-all"
                                                value={createData.email}
                                                onChange={e => setCreateData({ ...createData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-foreground">Password</label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Set password"
                                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm transition-all"
                                                    value={createData.password}
                                                    onChange={e => setCreateData({ ...createData, password: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-foreground">Role</label>
                                            <select
                                                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm transition-all"
                                                value={createData.role}
                                                onChange={e => setCreateData({ ...createData, role: e.target.value as AppRole })}
                                            >
                                                {ROLES.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-border/50">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-gold hover:bg-gold/90 text-secondary rounded-xl text-sm font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create User"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleLinkFinal} className="p-6 space-y-4">
                                <div className="p-3 bg-muted/50 border border-border/50 rounded-lg flex gap-3 text-sm text-muted-foreground">
                                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                    Use if user already exists in Auth but needs a role.
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground">User ID (Supabase UID)</label>
                                        <input
                                            required
                                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                            className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm font-mono transition-all"
                                            value={linkData.user_id}
                                            onChange={e => setLinkData({ ...linkData, user_id: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground">Select Role</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-sm transition-all"
                                            value={linkData.role}
                                            onChange={e => setLinkData({ ...linkData, role: e.target.value as AppRole })}
                                        >
                                            {ROLES.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end gap-3 border-t border-border/50 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !linkData.user_id}
                                        className="px-4 py-2 bg-gold hover:bg-gold/90 text-secondary rounded-xl text-sm font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link Profile"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
