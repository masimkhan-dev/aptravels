import { useEffect, useState } from "react";
import {
  Package, Briefcase, MessageSquare, TrendingUp,
  DollarSign, Wallet, Users, ArrowUpRight,
  Plane, BriefcaseIcon, FileText, Loader2,
  Calendar, ArrowRight, History
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Stats {
  total_sales: number;
  total_collected: number;
  total_balance: number;
  active_cases: number;
  total_bookings: number;
  umrah_count: number;
  ticket_count: number;
  visa_count: number;
  total_inquiries: number;
  unread_inquiries: number;
  cash_balance: number;
  bank_balance: number;
  total_liquidity: number;
}

interface AuditLog {
  id: string;
  table_name: string;
  action: string;
  performed_at: string;
  notes: string | null;
}

interface RecentBooking {
  booking_id: string;
  invoice_no: string;
  customer_name: string;
  total_price: number;
  booking_type: string;
  status: string;
  created_at: string;
  balance_due?: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [pendingTasks, setPendingTasks] = useState<RecentBooking[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      // 1. Fetch Financial & Count Stats
      const { data: dbStats } = await (supabase.from("admin_dashboard_stats" as any) as any).select("*").single();

      // 2. Fetch Inquiry Stats (Fallback for older tables)
      const { count: totalInq } = await supabase.from("inquiries").select("*", { count: 'exact', head: true });
      const { count: unreadInq } = await supabase.from("inquiries").select("*", { count: 'exact', head: true }).eq("is_read", false);

      const { data: recent } = await (supabase
        .from("booking_ledger_view" as any) as any)
        .select("booking_id, invoice_no, customer_name, total_price, booking_type, status, created_at, balance_due")
        .order("created_at", { ascending: false })
        .limit(5);

      // 4. Fetch Pending Tasks (Actionable)
      const { data: pending } = await (supabase
        .from("booking_ledger_view" as any) as any)
        .select("*")
        .or("status.eq.Pending,balance_due.gt.100000")
        .limit(5);

      // 5. Fetch Audit Trail (Phase 1E)
      const { data: audits } = await supabase
        .from("audit_logs")
        .select("*")
        .order("performed_at", { ascending: false })
        .limit(5);

      if (dbStats) {
        setStats({
          ...dbStats,
          total_inquiries: totalInq || 0,
          unread_inquiries: unreadInq || 0
        });
      }

      if (recent) setRecentBookings(recent as any);
      if (pending) setPendingTasks(pending as any);
      if (audits) setAuditLogs(audits as any);

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Voided": return "bg-red-50 text-red-700 border-red-200/50 shadow-sm";
      case "Pending": return "bg-amber-50 text-amber-800 border-amber-200 animate-pulse-subtle shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]";
      case "Draft": return "bg-slate-100 text-slate-700 border-slate-200 animate-pulse-subtle";
      case "Confirmed": return "bg-blue-50 text-blue-700 border-blue-200/50 shadow-sm";
      case "Completed": return "bg-emerald-50 text-emerald-700 border-emerald-200/50 shadow-sm";
      default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
      <Loader2 className="w-10 h-10 animate-spin text-gold" />
      <p className="font-medium animate-pulse italic">Assembling Business Intelligence...</p>
    </div>
  );

  const mainCards = [
    { label: "Gross Sales", value: `Rs ${stats?.total_sales.toLocaleString()}`, icon: DollarSign, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", desc: "Total Booked Value" },
    { label: "Cash Collected", value: `Rs ${stats?.total_collected.toLocaleString()}`, icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", desc: "Realized Revenue" },
    { label: "Market Balance", value: `Rs ${stats?.total_balance.toLocaleString()}`, icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", desc: "Pending Collections" },
    { label: "Net Profit", value: `Rs ${(stats as any)?.total_margin?.toLocaleString() || '0'}`, icon: Briefcase, color: "text-gold", bg: "bg-gold/10", border: "border-gold/20", desc: "Total Revenue Margin" },
  ];

  const treasuryCards = [
    { label: "Cash in Hand", value: `Rs ${stats?.cash_balance.toLocaleString()}`, icon: Wallet, color: "text-emerald-500", desc: "Physical Cash Availability", bg: "from-emerald-500/5 to-transparent" },
    { label: "Bank Balance", value: `Rs ${stats?.bank_balance.toLocaleString()}`, icon: BriefcaseIcon, color: "text-blue-500", desc: "Online Fund Balance", bg: "from-blue-500/5 to-transparent" },
    { label: "Total Liquidity", value: `Rs ${stats?.total_liquidity.toLocaleString()}`, icon: TrendingUp, color: "text-amber-500", desc: "Combined Available Funds", bg: "from-amber-500/5 to-transparent" },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-8">
        <div>
          <h1 className="text-4xl font-display font-black text-foreground tracking-tight">
            Operational <span className="text-muted-foreground font-medium">Center</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live business status for Akbar Pura Travels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/bookings" className="px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm hover:opacity-90 transition-all">
            + New Sale
          </Link>
          <div className="px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-foreground bg-muted/30 rounded-xl border border-border">
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map((c) => (
          <div key={c.label} className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col gap-4 group hover:border-slate-400 transition-all">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${c.bg} ${c.color}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{c.label}</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-foreground tracking-tight">{c.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground italic">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Treasury & Liquidity Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <h3 className="font-black text-sm uppercase tracking-[0.3em] text-muted-foreground whitespace-nowrap">Treasury & Liquidity</h3>
          <div className="h-px w-full bg-gradient-to-r from-border to-transparent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {treasuryCards.map((t) => (
            <div key={t.label} className={`bg-gradient-to-br ${t.bg} backdrop-blur-md rounded-[2rem] p-8 border border-border/60 shadow-lg flex flex-col gap-6 group hover:border-gold/30 hover:shadow-gold/5 transition-all duration-500`}>
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-full bg-background border border-border shadow-sm flex items-center justify-center ${t.color} group-hover:rotate-12 transition-transform`}>
                  <t.icon className="w-5 h-5 shadow-sm" />
                </div>
                <div className="px-3 py-1 bg-background/50 rounded-full border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-gold group-hover:border-gold/30 transition-colors">Verified</div>
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">{t.label}</span>
                <p className="text-3xl font-display font-black text-foreground tracking-tight leading-none mb-3">{t.value}</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-[11px] font-bold text-muted-foreground italic opacity-80">{t.desc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Action Center - Pending Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-red-600">Critical Tasks</h3>
            <div className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full">{pendingTasks.length}</div>
            <div className="h-px flex-1 bg-red-100" />
          </div>

          <div className="bg-white rounded-2xl border-2 border-red-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-red-50">
              {pendingTasks.map((t) => (
                <Link 
                  key={t.booking_id} 
                  to={`/admin/bookings/${t.booking_id}`}
                  className="flex items-center justify-between p-5 hover:bg-red-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                      {t.status === "Pending" ? <Calendar className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 group-hover:text-red-600 transition-colors">{t.customer_name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {t.status === "Pending" ? "Awaiting Confirmation" : `High Balance: Rs ${t.balance_due?.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(t.status)}`}>
                      {t.status}
                    </div>
                    <ArrowRight className="w-4 h-4 text-red-300 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
              {pendingTasks.length === 0 && (
                <div className="p-10 text-center">
                  <p className="text-sm font-bold text-muted-foreground italic">No critical pending tasks. Everything is on track.</p>
                </div>
              )}
            </div>
            <Link to="/admin/bookings" className="block w-full py-4 text-center text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
              View Complete Ledger
            </Link>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Recent Activity</h3>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 border-b border-border/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Inv / Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Client</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Value</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentBookings.map((b) => (
                  <tr key={b.booking_id} className="hover:bg-muted/20 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-mono font-bold text-muted-foreground group-hover:text-slate-900">{b.invoice_no}</span>
                        <span className="text-[9px] text-muted-foreground/60 font-bold uppercase">{new Date(b.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-foreground">{b.customer_name}</p>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-black text-foreground">Rs {Number(b.total_price).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase border ${getStatusColor(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

          {/* System Audit Trail (Phase 1E) */}
          <div className="bg-slate-900 rounded-[2rem] border border-slate-800 p-8 shadow-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">Security Audit</h3>
              <History className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-4 relative z-10">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex gap-3 items-start border-l-2 border-slate-800 pl-4 py-1 hover:border-emerald-500 transition-colors">
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-200 uppercase tracking-tight">
                      {log.action} <span className="text-slate-500">on</span> {log.table_name}
                    </p>
                    <p className="text-[9px] text-slate-500 font-medium">
                      {new Date(log.performed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.notes || "System Action"}
                    </p>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p className="text-[10px] text-slate-500 italic">No recent system logs.</p>
              )}
            </div>
          </div>

          {/* Business Vitality Sidebar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm group hover:border-gold transition-all">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Inquiries</span>
                <p className="text-xl font-black text-foreground">{stats?.unread_inquiries}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                  <span className="text-[8px] font-bold text-gold uppercase tracking-tighter">Awaiting</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm group hover:border-blue-500 transition-all">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total Sales</span>
                <p className="text-xl font-black text-foreground">{stats?.total_bookings}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[8px] font-bold text-blue-500 uppercase tracking-tighter">Cycle Count</span>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
