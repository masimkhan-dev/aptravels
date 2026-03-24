import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Tag, Calendar, User, ArrowRight, Loader2, DollarSign, X, Briefcase, Plane, FileText, Search, BookOpen, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Booking {
  booking_id: string;
  invoice_no: string;
  customer_name: string;
  total_price: number;
  total_paid: number;
  balance_due: number;
  status: string;
  booking_type: string;
  pnr_number: string;
  visa_country?: string;
}

interface Customer { id: string; full_name: string; phone: string; }
interface Package { id: string; title: string; price: number; }

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Filter State
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // New Booking State
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [saving, setSaving] = useState(false);

  // Form State
  const [bookingType, setBookingType] = useState<"Package" | "Ticket" | "Visa">("Package");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [margin, setMargin] = useState("");
  const [travelDate, setTravelDate] = useState("");

  // Ticket Specific Fields
  const [pnrNumber, setPnrNumber] = useState("");
  const [airlineName, setAirlineName] = useState("");
  const [ticketSector, setTicketSector] = useState("");

  // Visa Specific Fields
  const [visaCountry, setVisaCountry] = useState("");
  const [visaProfession, setVisaProfession] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    let query = (supabase.from("booking_ledger_view") as any)
      .select("*", { count: "exact" })
      .order("invoice_no", { ascending: false });

    if (search) query = query.or(`customer_name.ilike.%${search}%,invoice_no.ilike.%${search}%`);
    if (filterType !== "all") query = query.eq("booking_type", filterType);
    if (filterStatus !== "all") query = query.eq("status", filterStatus);

    // Apply Pagination
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, count } = await query;
    setBookings((data as any) || []);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const fetchDropdowns = async () => {
    const { data: c } = await supabase.from("customers_safe_view" as any).select("id, full_name, phone").order("full_name");
    const { data: p } = await supabase.from("packages").select("id, title, price").eq("is_active", true);
    setCustomers((c as any) || []);
    setPackages(p || []);
  };

  useEffect(() => {
    // Reset page on search/filter change
    setPage(0);
  }, [search, filterType, filterStatus]);

  useEffect(() => {
    fetchBookings();
    if (page === 0) fetchDropdowns();
  }, [search, filterType, filterStatus, page]);

  const handleQuickAddCustomer = async (name: string, phone: string) => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert([{ full_name: name, phone }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        toast.success(`Customer "${name}" created!`);
        // Refresh customer list
        const { data: allCustomers } = await supabase.from("customers_safe_view" as any).select("id, full_name, phone").order("full_name");
        setCustomers((allCustomers as any) || []);
        // Select the newly created customer
        setSelectedCustomer(data.id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add customer");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !totalPrice) return;
    setSaving(true);

    // Get current user so assigned_to can be set (required by RLS for Sales role)
    const { data: { user } } = await supabase.auth.getUser();

    const bookingData = {
      customer_id: selectedCustomer,
      assigned_to: user?.id ?? null,
      booking_type: bookingType,
      total_price: Number(totalPrice),
      margin: Number(margin) || 0,
      travel_date: travelDate || null,
      status: "Confirmed" as "Confirmed" | "Completed" | "Draft" | "Voided",
      ...(bookingType === "Package" ? { package_id: selectedPackage || null } :
        bookingType === "Ticket" ? {
          pnr_number: pnrNumber,
          airline_name: airlineName,
          ticket_sector: ticketSector
        } : {
          visa_country: visaCountry,
          visa_profession: visaProfession
        })
    };

    const { error } = await (supabase.from("bookings") as any).insert([bookingData]);

    if (error) {
      toast.error(error.message || "Failed to create booking. Check your permissions.");
    } else {
      toast.success("Booking registered successfully.");
      setShowModal(false);
      resetForm();
      fetchBookings();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setSelectedCustomer("");
    setSelectedPackage("");
    setTotalPrice("");
    setMargin("");
    setTravelDate("");
    setBookingType("Package");
    setPnrNumber("");
    setAirlineName("");
    setTicketSector("");
    setVisaCountry("");
    setVisaProfession("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-500/10 text-green-500 ring-1 ring-green-500/20";
      case "Voided": return "bg-destructive/10 text-destructive ring-1 ring-destructive/20";
      case "Confirmed": return "bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20";
      default: return "bg-gold/10 text-gold ring-1 ring-gold/20";
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === "Ticket") return <Plane className="w-3 h-3" />;
    if (type === "Visa") return <FileText className="w-3 h-3" />;
    return <Briefcase className="w-3 h-3" />;
  };

  const hasActiveFilters = search || filterType !== "all" || filterStatus !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Booking Ledger</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{bookings.length} records</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gold-gradient text-secondary rounded-lg font-semibold text-sm shadow-gold hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> New Sale (Package/Ticket/Visa)
        </button>
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-card rounded-xl border border-border p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer name or invoice #..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-gold/50 transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-gold/50 font-medium text-foreground"
          >
            <option value="all">All Types</option>
            <option value="Package">Umrah</option>
            <option value="Ticket">Ticket</option>
            <option value="Visa">Visa</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-gold/50 font-medium text-foreground"
          >
            <option value="all">All Status</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Draft">Draft</option>
            <option value="Voided">Voided</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); }}
              className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-all whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Booking Cards */}
      <div className="grid gap-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
            <p className="text-sm animate-pulse">Loading ledger...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-card p-16 text-center rounded-2xl border border-dashed border-border">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-bold text-foreground mb-1">
              {hasActiveFilters ? "No results found" : "No bookings yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters ? "Try adjusting your search or filters." : "Create your first sale using the button above."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); }}
                className="mt-4 text-xs text-gold hover:underline font-bold"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-black tracking-widest px-5 py-3 rounded-t-xl flex items-center border-b border-border">
              <span className="w-12 text-center">S.No</span>
              <span className="flex-1">Booking Detail</span>
              <span className="w-24 text-center hidden md:block">Financials</span>
              <span className="w-8"></span>
            </div>
            {bookings.map((b, index) => (
              <Link
                to={`/admin/bookings/${b.booking_id}`}
                key={b.booking_id}
                className="bg-card p-5 border-x border-b border-border first:border-t hover:border-gold/40 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                    <span className="text-[10px] font-bold text-muted-foreground/60">#{(page * PAGE_SIZE) + index + 1}</span>
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-gold font-black text-[9px] ring-1 ring-border shadow-sm group-hover:ring-gold/30 transition-all">
                      {b.invoice_no?.split('-').pop()}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground uppercase">{b.invoice_no}</span>
                      <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-black uppercase bg-muted text-muted-foreground border border-border">
                        {getTypeIcon(b.booking_type)} {b.booking_type}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(b.status)}`}>
                        {b.status}
                      </span>
                    </div>
                    <h3 className="font-bold flex items-center gap-2 text-foreground">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {b.customer_name}
                      {b.booking_type === 'Ticket' && b.pnr_number && (
                        <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded-md font-mono ml-1">PNR: {b.pnr_number}</span>
                      )}
                      {b.booking_type === 'Visa' && b.visa_country && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-md font-bold ml-1">{b.visa_country} Visa</span>
                      )}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 px-4 flex-1 max-w-sm">
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider font-bold">Total</p>
                    <p className="text-sm font-black text-foreground">Rs {Number(b.total_price).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider font-bold">Paid</p>
                    <p className="text-sm font-black text-green-500">Rs {Number(b.total_paid).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider font-bold">Balance</p>
                    <p className={`text-sm font-black ${b.balance_due > 0 ? "text-gold" : "text-muted-foreground/40 line-through"}`}>
                      {b.balance_due > 0 ? `Rs ${Number(b.balance_due).toLocaleString()}` : "Cleared ✓"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-gold-gradient group-hover:text-secondary transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between px-2 pt-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} records
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-lg border border-border text-xs font-bold hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
              className="px-4 py-2 rounded-lg border border-border text-xs font-bold hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* New Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-display font-bold text-foreground">ERP Entry Record</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Akbar Pura Travels System</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Type Toggle */}
              <div className="flex bg-muted p-1 rounded-xl mb-6 font-bold">
                <button type="button" className={`flex-1 py-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1.5 ${bookingType === "Package" ? "bg-card shadow-sm text-gold" : "text-muted-foreground"}`} onClick={() => setBookingType("Package")}>
                  <Briefcase className="w-3 h-3" /> Umrah
                </button>
                <button type="button" className={`flex-1 py-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1.5 ${bookingType === "Ticket" ? "bg-card shadow-sm text-gold" : "text-muted-foreground"}`} onClick={() => setBookingType("Ticket")}>
                  <Plane className="w-3 h-3" /> Ticket
                </button>
                <button type="button" className={`flex-1 py-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1.5 ${bookingType === "Visa" ? "bg-card shadow-sm text-gold" : "text-muted-foreground"}`} onClick={() => setBookingType("Visa")}>
                  <FileText className="w-3 h-3" /> Work Visa
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Select Customer *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const name = prompt("Enter New Customer Name:");
                      const phone = prompt("Enter Phone Number:");
                      if (name && phone) {
                        handleQuickAddCustomer(name, phone);
                      }
                    }}
                    className="text-[10px] font-black text-gold hover:underline uppercase tracking-tighter"
                  >
                    + Add New Profile
                  </button>
                </div>
                <select required className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm text-foreground" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
                </select>
              </div>

              {bookingType === "Package" && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Umrah Package</label>
                    <select className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm text-foreground" value={selectedPackage} onChange={e => { setSelectedPackage(e.target.value); const pkg = packages.find(p => p.id === e.target.value); if (pkg) setTotalPrice(pkg.price.toString()); }}>
                      <option value="">-- Custom Deal --</option>
                      {packages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Package Price *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input required type="number" placeholder="0.00" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm font-bold text-foreground" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-emerald-600 ml-1">Profit Margin (Admin Only)</label>
                    <div className="relative">
                      <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      <input type="number" placeholder="0.00" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-emerald-100 bg-emerald-50/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-bold text-emerald-700" value={margin} onChange={e => setMargin(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                    </div>
                  </div>
                </div>
              )}

              {bookingType === "Ticket" && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Airline</label>
                      <input placeholder="e.g. Saudi Air" className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm text-foreground" value={airlineName} onChange={e => setAirlineName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground ml-1">PNR Ref</label>
                      <input placeholder="6-Digit" className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm font-bold text-foreground font-mono" value={pnrNumber} onChange={e => setPnrNumber(e.target.value.toUpperCase())} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Sector</label>
                      <input placeholder="e.g. KHI-JED" className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm text-foreground" value={ticketSector} onChange={e => setTicketSector(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Ticket Price *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input required type="number" placeholder="0.00" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm font-bold text-foreground" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-emerald-600 ml-1">Profit Margin</label>
                      <div className="relative">
                        <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <input type="number" placeholder="0.00" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-emerald-100 bg-emerald-50/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-bold text-emerald-700" value={margin} onChange={e => setMargin(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bookingType === "Visa" && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Target Country</label>
                      <input placeholder="e.g. UAE / Saudi / Qatar" className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm text-foreground" value={visaCountry} onChange={e => setVisaCountry(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Visa Profession</label>
                      <input placeholder="e.g. Driver / Electrician" className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm text-foreground" value={visaProfession} onChange={e => setVisaProfession(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Service Fee / Visa Cost *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input required type="number" placeholder="0.00" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm font-bold text-foreground" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-emerald-600 ml-1">Profit Margin</label>
                      <div className="relative">
                        <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <input type="number" placeholder="0.00" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-emerald-100 bg-emerald-50/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-bold text-emerald-700" value={margin} onChange={e => setMargin(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Departure / Stamping Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="date" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm text-foreground" value={travelDate} onChange={e => setTravelDate(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-border mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted font-bold text-sm text-foreground transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !selectedCustomer} className="flex-1 px-4 py-2.5 bg-gold-gradient text-secondary rounded-lg font-bold text-sm shadow-gold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Register Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
