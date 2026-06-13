import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { useRole } from "@/hooks/useRole";
import { 
  Plus, Search, Loader2, X, Briefcase, Plane, FileText, BookOpen, ArrowRight, RotateCcw 
} from "lucide-react";

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
  const navigate = useNavigate();
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
  const [showSheet, setShowSheet] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [saving, setSaving] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const { role } = useRole();
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName || !quickPhone) return;
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert([{ full_name: quickName, phone: quickPhone }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        toast.success(`Customer "${quickName}" created!`);
        // Refresh customer list
        const { data: allCustomers } = await supabase.from("customers_safe_view" as any).select("id, full_name, phone").order("full_name");
        setCustomers((allCustomers as any) || []);
        // Select the newly created customer
        setSelectedCustomer(data.id);
        setShowQuickAdd(false);
        setQuickName("");
        setQuickPhone("");
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
      setShowSheet(false);
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
    setConfirmCheckbox(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Voided": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "Pending": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Confirmed": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Completed": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Draft": return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      default: return "bg-slate-500/10 text-slate-500 border-slate-500/20";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-3xl font-display font-black text-foreground tracking-tight">Booking Ledger</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">{totalCount} total records in system</p>
        </div>
        <button
          onClick={() => { resetForm(); setWizardStep(1); setShowSheet(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> New Sale Entry
        </button>
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-card rounded-xl border border-border p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
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
              className="flex items-center gap-1.5 px-3 py-2 border border-border hover:bg-muted rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Clear filters"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Booking Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
            <p className="text-sm font-medium">Loading ledger...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-16 text-center max-w-md mx-auto flex flex-col items-center justify-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4 stroke-1 animate-pulse" />
            <p className="font-bold text-lg text-foreground">No bookings found</p>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              {hasActiveFilters 
                ? "Try clearing your filters or changing your search criteria." 
                : "It looks like there are no bookings registered in the system yet. Start by adding a new one."}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); }}
                className="flex items-center gap-1.5 px-4 py-2 border border-border hover:bg-muted rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-colors shrink-0 mx-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
              </button>
            ) : (
              <button
                onClick={() => { resetForm(); setWizardStep(1); setShowSheet(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:opacity-90 transition-all"
              >
                <Plus className="w-4 h-4" /> Add First Booking
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="hidden sm:table-cell text-[10px] uppercase font-black tracking-widest text-muted-foreground px-4 py-4 text-left w-16">No.</th>
                  <th className="text-[10px] uppercase font-black tracking-widest text-muted-foreground px-4 py-4 text-left">Invoice / Client</th>
                  <th className="text-[10px] uppercase font-black tracking-widest text-muted-foreground px-4 py-4 text-left">Service Type</th>
                  <th className="text-[10px] uppercase font-black tracking-widest text-muted-foreground px-4 py-4 text-left">Status</th>
                  <th className="hidden md:table-cell text-[10px] uppercase font-black tracking-widest text-muted-foreground px-4 py-4 text-right">Total Price</th>
                  <th className="hidden md:table-cell text-[10px] uppercase font-black tracking-widest text-muted-foreground px-4 py-4 text-right">Paid</th>
                  <th className="text-[10px] uppercase font-black tracking-widest text-muted-foreground px-4 py-4 text-right">Balance</th>
                  <th className="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {bookings.map((b, index) => (
                  <tr 
                    key={b.booking_id} 
                    className="hover:bg-muted/40 active:bg-muted/60 transition-all group cursor-pointer"
                    onClick={() => navigate(`/admin/bookings/${b.booking_id}`)}
                  >
                    <td className="hidden sm:table-cell px-4 py-3 text-xs font-bold text-muted-foreground/60">
                      {(page * PAGE_SIZE) + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">{b.invoice_no}</span>
                        <span className="text-sm font-black text-foreground group-hover:text-gold transition-colors">{b.customer_name || "Deleted Customer"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-muted border border-border group-hover:border-gold/30 transition-colors">
                          {getTypeIcon(b.booking_type)}
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">{b.booking_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right text-sm font-bold text-foreground">
                      PKR {Number(b.total_price).toLocaleString()}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right text-sm font-bold text-green-600">
                      PKR {Number(b.total_paid).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-black ${b.balance_due > 0 ? "text-amber-600" : "text-slate-300"}`}>
                        {b.balance_due > 0 ? `PKR ${Number(b.balance_due).toLocaleString()}` : "Cleared"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* New Booking Slide-out Wizard */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col h-full border-none shadow-2xl">
          <SheetHeader className="p-8 bg-slate-900 text-white shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center border border-gold/30">
                <Plus className="w-4 h-4 text-gold" />
              </div>
              <SheetTitle className="text-2xl font-black text-white italic tracking-tight">New Booking Entry</SheetTitle>
            </div>
            <SheetDescription className="text-slate-400 font-medium">
              Complete the 4-step process to record a new sale in the system.
            </SheetDescription>
            
            {/* Step Indicator */}
            <div className="flex items-center gap-4 mt-8">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${wizardStep === s ? "bg-gold text-secondary" : wizardStep > s ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500"}`}>
                    {wizardStep > s ? "✓" : s}
                  </div>
                  {s < 4 && <div className={`h-1 w-8 rounded-full ${wizardStep > s ? "bg-emerald-500" : "bg-slate-800"}`} />}
                </div>
              ))}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-8">
            <form onSubmit={handleCreate} className="space-y-8">
              {/* Step 1: Customer Selection */}
              {wizardStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Client Selection</label>
                      <button 
                        type="button" 
                        onClick={() => setShowQuickAdd(!showQuickAdd)}
                        className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-tight"
                      >
                        {showQuickAdd ? "Cancel Quick Add" : "+ Register New Client"}
                      </button>
                    </div>

                    {showQuickAdd ? (
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-4 animate-in zoom-in-95 duration-200">
                        <p className="text-[10px] font-black text-blue-600 uppercase">Quick Add New Customer</p>
                        <div className="grid grid-cols-2 gap-3">
                          <input 
                            placeholder="Full Name" 
                            className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                            value={quickName}
                            onChange={e => setQuickName(e.target.value)}
                          />
                          <input 
                            placeholder="Phone (03xx...)" 
                            className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                            value={quickPhone}
                            onChange={e => setQuickPhone(e.target.value)}
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={handleQuickAddCustomer}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
                        >
                          Save & Select Client
                        </button>
                      </div>
                    ) : (
                      <select 
                        required 
                        className="w-full h-14 px-4 rounded-xl border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm font-bold text-foreground transition-all" 
                        value={selectedCustomer} 
                        onChange={e => setSelectedCustomer(e.target.value)}
                      >
                        <option value="">-- Click to choose client --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} • {c.phone}</option>)}
                      </select>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Service Category</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "Package", label: "Umrah", icon: Briefcase },
                        { id: "Ticket", label: "Ticket", icon: Plane },
                        { id: "Visa", label: "Work Visa", icon: FileText }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setBookingType(t.id as any)}
                          className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${bookingType === t.id ? "bg-slate-50 border-gold shadow-sm" : "border-border hover:border-muted-foreground/30"}`}
                        >
                          <t.icon className={`w-5 h-5 ${bookingType === t.id ? "text-gold" : "text-muted-foreground"}`} />
                          <span className={`text-[10px] font-black uppercase tracking-wider ${bookingType === t.id ? "text-slate-900" : "text-muted-foreground"}`}>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Service Details */}
              {wizardStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {bookingType === "Package" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Umrah Package Selection</label>
                        <select className="w-full h-14 px-4 rounded-xl border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm font-bold" value={selectedPackage} onChange={e => { setSelectedPackage(e.target.value); const pkg = packages.find(p => p.id === e.target.value); if (pkg) setTotalPrice(pkg.price.toString()); }}>
                          <option value="">-- Custom Deal (Manual Price) --</option>
                          {packages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {bookingType === "Ticket" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Airline</label>
                          <input placeholder="e.g. PIA" className="w-full h-12 px-4 rounded-xl border border-border text-sm font-bold" value={airlineName} onChange={e => setAirlineName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">PNR Reference</label>
                          <input placeholder="e.g. MH7K9P" maxLength={6} className="w-full h-12 px-4 rounded-xl border border-border text-sm font-bold font-mono uppercase" value={pnrNumber} onChange={e => setPnrNumber(e.target.value.toUpperCase().slice(0, 6))} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Sector</label>
                        <input placeholder="e.g. ISB-JED-ISB" className="w-full h-12 px-4 rounded-xl border border-border text-sm font-bold" value={ticketSector} onChange={e => setTicketSector(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {bookingType === "Visa" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Target Country</label>
                          <input placeholder="e.g. Saudi Arabia" className="w-full h-12 px-4 rounded-xl border border-border text-sm font-bold" value={visaCountry} onChange={e => setVisaCountry(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Profession</label>
                          <input placeholder="e.g. Electrician" className="w-full h-12 px-4 rounded-xl border border-border text-sm font-bold" value={visaProfession} onChange={e => setVisaProfession(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Departure / Stamping Date</label>
                    <input type="date" className="w-full h-12 px-4 rounded-xl border border-border text-sm font-bold" value={travelDate} onChange={e => setTravelDate(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Step 3: Financials */}
              {wizardStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="p-6 bg-slate-50 border border-border rounded-2xl space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Total Sale Price (PKR) *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">PKR</span>
                        <input 
                          required 
                          type="number" 
                          placeholder="0.00" 
                          className="w-full h-16 pl-16 pr-4 rounded-xl border border-border bg-white text-2xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-gold" 
                          value={totalPrice} 
                          onChange={e => setTotalPrice(e.target.value)} 
                          onWheel={e => e.currentTarget.blur()} 
                        />
                      </div>
                    </div>

                    {(role === 'admin' || role === 'manager') && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 italic">Expected Profit Margin</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-300">PKR</span>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            className="w-full h-14 pl-16 pr-4 rounded-xl border border-emerald-100 bg-emerald-50/30 text-lg font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500" 
                            value={margin} 
                            onChange={e => setMargin(e.target.value)} 
                            onWheel={e => e.currentTarget.blur()} 
                          />
                        </div>
                        <p className="text-[9px] text-emerald-600/60 font-medium ml-1 italic">Hidden from counter staff and sales agents.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Final Review Summary */}
              {wizardStep === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="p-6 bg-slate-50 border border-border rounded-2xl space-y-4 shadow-inner">
                    <p className="text-[10px] font-black text-gold uppercase tracking-wider">Review Booking Details</p>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-xs">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Client Name</p>
                        <p className="font-bold text-foreground">
                          {customers.find(c => c.id === selectedCustomer)?.full_name || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Service Category</p>
                        <p className="font-bold text-foreground">{bookingType}</p>
                      </div>
                      
                      {bookingType === "Package" && (
                        <div className="col-span-2">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Umrah Package</p>
                          <p className="font-bold text-foreground">
                            {packages.find(p => p.id === selectedPackage)?.title || "Custom Deal (Manual Price)"}
                          </p>
                        </div>
                      )}
                      
                      {bookingType === "Ticket" && (
                        <>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Airline</p>
                            <p className="font-bold text-foreground">{airlineName || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">PNR Reference</p>
                            <p className="font-bold text-foreground font-mono">{pnrNumber || "—"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Sector</p>
                            <p className="font-bold text-foreground">{ticketSector || "—"}</p>
                          </div>
                        </>
                      )}
                      
                      {bookingType === "Visa" && (
                        <>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Visa Country</p>
                            <p className="font-bold text-foreground">{visaCountry || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Profession</p>
                            <p className="font-bold text-foreground">{visaProfession || "—"}</p>
                          </div>
                        </>
                      )}
                      
                      {travelDate && (
                        <div className="col-span-2">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Travel / Stamping Date</p>
                          <p className="font-bold text-foreground">
                            {new Date(travelDate).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                      )}
                      
                      <div className="col-span-2 border-t border-border/80 pt-4 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Price</p>
                          <p className="text-xl font-black text-foreground">PKR {Number(totalPrice).toLocaleString()}</p>
                        </div>
                        {(role === 'admin' || role === 'manager') && margin && (
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-emerald-600">Expected Profit Margin</p>
                            <p className="text-sm font-bold text-emerald-700">PKR {Number(margin).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <input 
                      type="checkbox" 
                      id="confirmCheckbox" 
                      className="mt-1 accent-gold rounded border-border"
                      checked={confirmCheckbox}
                      onChange={e => setConfirmCheckbox(e.target.checked)}
                    />
                    <label htmlFor="confirmCheckbox" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                      Main tasdeeq karta/karti hoon ke ooper di gayi tamam tafseelat bilkul darust hain. (I confirm that all booking details are correct).
                    </label>
                  </div>
                </div>
              )}

              {/* Footer Controls */}
              <div className="pt-8 border-t border-border flex gap-3">
                {wizardStep > 1 && (
                  <button 
                    type="button" 
                    onClick={() => setWizardStep(s => s - 1)}
                    className="flex-1 h-14 rounded-xl border border-border font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                  >
                    Back
                  </button>
                )}
                
                {wizardStep < 4 ? (
                  <button 
                    type="button" 
                    disabled={(wizardStep === 1 && !selectedCustomer) || (wizardStep === 3 && !totalPrice)}
                    onClick={() => setWizardStep(s => s + 1)}
                    className="flex-[2] h-14 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-30 transition-all"
                  >
                    Continue to {wizardStep === 1 ? "Details" : wizardStep === 2 ? "Financials" : "Review"}
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    disabled={saving || !confirmCheckbox}
                    className="flex-[2] h-14 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200 disabled:opacity-30 transition-all flex items-center justify-center gap-3"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm & Save Entry
                  </button>
                )}
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
