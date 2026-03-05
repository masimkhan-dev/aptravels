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
    { label: "Gross Sales", value: `Rs ${stats?.total_sales.toLocaleString()}`, icon: DollarSign, color: "text-blue-500", bg: "bg-blue-500/10", desc: "Total Booked Value" },
    { label: "Cash Collected", value: `Rs ${stats?.total_collected.toLocaleString()}`, icon: Wallet, color: "text-green-500", bg: "bg-green-500/10", desc: "Realized Revenue" },
    { label: "Market Balance", value: `Rs ${stats?.total_balance.toLocaleString()}`, icon: TrendingUp, color: "text-gold", bg: "bg-gold/10", desc: "Pending Collections" },
    { label: "Net Profit", value: `Rs ${(stats as any)?.total_margin?.toLocaleString() || '0'}`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", desc: "Total Revenue Margin" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-foreground tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Welcome back, Captain. Here is your business at a glance.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-card rounded shadow-sm border border-border">Live Feed</div>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mx-2" />
        </div>
      </div>

      {/* Main Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {mainCards.map((c) => (
          <div key={c.label} className="bg-card rounded-2xl p-5 sm:p-6 border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
              <div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">{c.label}</span>
                <p className="font-display text-xl sm:text-2xl font-black text-foreground">{c.value}</p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${c.bg} ${c.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform flex-shrink-0`}>
                <c.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-muted-foreground relative z-10">
              <ArrowUpRight className="w-3 h-3 text-green-500" />
              {c.desc}
            </div>
            {/* Background design */}
            <div className={`absolute -right-4 -bottom-4 w-20 h-20 sm:w-24 sm:h-24 ${c.bg} opacity-5 rounded-full`} />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Recent Ledger Activity</h3>
            <Link to="/admin/bookings" className="text-[10px] font-black uppercase text-gold hover:underline flex items-center gap-1">
              View All Ledger <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Inv #</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Customer</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentBookings.map((b) => (
                    <tr key={b.booking_id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 text-xs font-mono font-bold text-muted-foreground">{b.invoice_no}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-foreground leading-none mb-1">{b.customer_name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-medium">{new Date(b.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase bg-muted text-muted-foreground border border-border`}>
                          {b.booking_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-black text-foreground">Rs {Number(b.total_price).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${getStatusColor(b.status)}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* Service Distribution — Stat Cards */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground mb-5">Service Mix</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center">
                <BriefcaseIcon className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-black text-primary leading-none">{stats?.umrah_count}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-primary/70 mt-1">Umrah</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  {Math.round(((stats?.umrah_count || 0) / (stats?.total_bookings || 1)) * 100)}%
                </p>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 text-center">
                <Plane className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-blue-500 leading-none">{stats?.ticket_count}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-blue-500/70 mt-1">Tickets</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  {Math.round(((stats?.ticket_count || 0) / (stats?.total_bookings || 1)) * 100)}%
                </p>
              </div>
              <div className="bg-gold/5 border border-gold/10 rounded-xl p-4 text-center">
                <FileText className="w-5 h-5 text-gold mx-auto mb-2" />
                <p className="text-2xl font-black text-gold leading-none">{stats?.visa_count}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-gold/70 mt-1">Visas</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  {Math.round(((stats?.visa_count || 0) / (stats?.total_bookings || 1)) * 100)}%
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Sidebar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
              <MessageSquare className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl font-black text-foreground">{stats?.unread_inquiries}</p>
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">New Enquiries</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
              <Calendar className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl font-black text-foreground">{stats?.total_bookings}</p>
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Sales</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
