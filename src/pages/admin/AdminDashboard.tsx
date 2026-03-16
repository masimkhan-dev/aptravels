import { useEffect, useState } from "react";
import {
  Package, Briefcase, MessageSquare, TrendingUp,
  DollarSign, Wallet, Users, ArrowUpRight,
  Plane, BriefcaseIcon, FileText, Loader2,
  Calendar, ArrowRight
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

interface RecentBooking {
  booking_id: string;
  invoice_no: string;
  customer_name: string;
  total_price: number;
  booking_type: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      // 1. Fetch Financial & Count Stats
      const { data: dbStats } = await (supabase.from("admin_dashboard_stats" as any) as any).select("*").single();

      // 2. Fetch Inquiry Stats (Fallback for older tables)
      const { count: totalInq } = await supabase.from("inquiries").select("*", { count: 'exact', head: true });
      const { count: unreadInq } = await supabase.from("inquiries").select("*", { count: 'exact', head: true }).eq("is_read", false);

      // 3. Fetch Recent Bookings
      const { data: recent } = await (supabase
        .from("booking_ledger_view" as any) as any)
        .select("booking_id, invoice_no, customer_name, total_price, booking_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (dbStats) {
        setStats({
          ...dbStats,
          total_inquiries: totalInq || 0,
          unread_inquiries: unreadInq || 0
        });
      }

      if (recent) setRecentBookings(recent as any);

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Voided": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-blue-500/10 text-blue-500 border-blue-500/20";
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50 pb-8">
        <div>
          <h1 className="text-4xl font-display font-black text-foreground tracking-tight flex items-center gap-3">
            Executive <span className="text-gold">Dashboard</span>
          </h1>
          <p className="text-muted-foreground text-base font-medium mt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-ping" />
            Welcome back, Captain. Here is your business at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-2xl border border-border shadow-inner">
          <div className="px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground bg-background rounded-xl shadow-sm border border-border">System Live</div>
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-blue-500">HQ</div>
            <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-gold">786</div>
          </div>
        </div>
      </div>

      {/* Main Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainCards.map((c) => (
          <div key={c.label} className={`group bg-card rounded-[2rem] p-7 border ${c.border} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className={`w-14 h-14 rounded-2xl ${c.bg} ${c.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                <c.icon className="w-7 h-7" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground block mb-1">{c.label}</span>
                <p className="font-display text-2xl font-black text-foreground tracking-tight">{c.value}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground/80 relative z-10">
              <span className="flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                {c.desc}
              </span>
              <span className="bg-muted px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider group-hover:bg-gold group-hover:text-gold-foreground transition-colors italic">Report</span>
            </div>
            {/* Background Accent */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 ${c.bg} opacity-[0.03] rounded-full blur-2xl group-hover:scale-150 transition-transform`} />
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

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-sm uppercase tracking-[0.3em] text-muted-foreground">Recent Ledger Activity</h3>
            <Link to="/admin/bookings" className="group text-[11px] font-black uppercase text-gold hover:text-gold/80 transition-all flex items-center gap-2 tracking-widest bg-gold/5 px-4 py-2 rounded-xl border border-gold/10 hover:border-gold/30">
              Explore Ledger <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="bg-card rounded-[2rem] border border-border shadow-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50">
                    <th className="px-8 py-6 text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em]">Transaction / Inv</th>
                    <th className="px-8 py-6 text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em]">Customer Persona</th>
                    <th className="px-8 py-6 text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em]">Sector</th>
                    <th className="px-8 py-6 text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em] text-right text-gold">Value</th>
                    <th className="px-8 py-6 text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em]">Auth Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {recentBookings.map((b) => (
                    <tr key={b.booking_id} className="hover:bg-muted/20 transition-all group cursor-default">
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-mono font-black text-muted-foreground group-hover:text-gold transition-colors">{b.invoice_no}</span>
                          <span className="text-[9px] text-muted-foreground/60 uppercase font-black tracking-widest">Entry: {new Date(b.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground group-hover:bg-gold group-hover:text-gold-foreground transition-all">
                            {b.customer_name?.[0]}
                          </div>
                          <p className="text-sm font-black text-foreground tracking-tight">{b.customer_name}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase bg-muted/50 text-muted-foreground border border-border shadow-sm group-hover:border-gold/20 transition-all`}>
                          {b.booking_type}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right text-base font-black text-foreground tracking-tighter">Rs {Number(b.total_price).toLocaleString()}</td>
                      <td className="px-8 py-6">
                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase border shadow-sm ${getStatusColor(b.status)}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentBookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground italic font-medium">No recent activity detected in this cycle.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-8">
          {/* Service Distribution */}
          <div className="bg-card rounded-[2.5rem] border border-border p-8 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className="font-black text-sm uppercase tracking-[0.3em] text-muted-foreground">Service Mix</h3>
              <TrendingUp className="w-5 h-5 text-gold animate-pulse" />
            </div>
            <div className="space-y-6 relative z-10">
              {[
                { label: 'Umrah', count: stats?.umrah_count, color: 'bg-primary', icon: Package },
                { label: 'Tickets', count: stats?.ticket_count, color: 'bg-blue-500', icon: Plane },
                { label: 'Visas', count: stats?.visa_count, color: 'bg-gold', icon: FileText },
              ].map((item) => {
                const percentage = Math.round(((item.count || 0) / (stats?.total_bookings || 1)) * 100);
                return (
                  <div key={item.label} className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border hover:border-gold/20 transition-colors">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                      <span className="flex items-center gap-2">
                        <item.icon className={`w-4 h-4 ${item.label === 'Visas' ? 'text-gold' : item.label === 'Tickets' ? 'text-blue-500' : 'text-primary'}`} />
                        {item.label}
                      </span>
                      <span className="text-foreground">{item.count} Cases</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(0,0,0,0.1)]`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] text-muted-foreground font-bold italic">{percentage}% Share</span>
                      <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Background design element */}
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-gold/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          </div>

          {/* Business Vitality Sidebar */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-gradient-to-br from-card to-muted/20 rounded-[2rem] border border-border p-7 shadow-lg flex items-center justify-between group hover:border-gold/30 transition-all">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Inquiries</span>
                <p className="text-3xl font-display font-black text-foreground">{stats?.unread_inquiries}</p>
                <span className="text-[10px] font-bold text-gold italic">Awaiting Response</span>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-card to-muted/20 rounded-[2rem] border border-border p-7 shadow-lg flex items-center justify-between group hover:border-blue-500/30 transition-all">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Total Sales</span>
                <p className="text-3xl font-display font-black text-foreground">{stats?.total_bookings}</p>
                <span className="text-[10px] font-bold text-blue-500 italic">Confirmed Cycle</span>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <Calendar className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
