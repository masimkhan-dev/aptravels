import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, User, Phone, Mail, Loader2, BookOpen, ArrowRight, X, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Customer {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    address: string | null;
    cnic_passport: string | null;
    created_at: string;
}

interface CustomerBooking {
    booking_id: string;
    invoice_no: string;
    total_price: number;
    total_paid: number;
    balance_due: number;
    status: string;
    booking_type: string;
}

export default function AdminCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "", phone: "", email: "", address: "", cnic_passport: ""
    });

    // Side panel state
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);

    const fetchCustomers = async () => {
        let query = supabase.from("customers").select("*").order("created_at", { ascending: false });
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
        }
        const { data } = await query;
        setCustomers(data || []);
        setLoading(false);
    };

    const fetchCustomerBookings = async (customerId: string) => {
        setBookingsLoading(true);
        const { data } = await (supabase
            .from("booking_ledger_view" as any) as any)
            .select("booking_id, invoice_no, total_price, total_paid, balance_due, status, booking_type")
            .eq("customer_id", customerId)
            .order("invoice_no", { ascending: false });
        setCustomerBookings((data as any) || []);
        setBookingsLoading(false);
    };

    useEffect(() => {
        fetchCustomers();
    }, [search]);

    const handleSelectCustomer = (c: Customer) => {
        setSelectedCustomer(c);
        fetchCustomerBookings(c.id);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from("customers").insert([formData]);
        if (!error) {
            toast.success("Customer profile created.");
            setShowModal(false);
            setFormData({ full_name: "", phone: "", email: "", address: "", cnic_passport: "" });
            fetchCustomers();
        } else {
            toast.error(error.message || "Failed to create customer.");
        }
        setLoading(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Completed": return "bg-green-500/10 text-green-500 ring-1 ring-green-500/20";
            case "Voided": return "bg-destructive/10 text-destructive ring-1 ring-destructive/20";
            case "Confirmed": return "bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20";
            default: return "bg-gold/10 text-gold ring-1 ring-gold/20";
        }
    };

    const totalSpent = customerBookings
        .filter(b => b.status !== "Voided")
        .reduce((sum, b) => sum + Number(b.total_paid), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-display font-bold text-foreground">Customer Directory</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{customers.length} profiles</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gold-gradient text-secondary rounded-lg font-semibold text-sm shadow-gold hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-4 h-4" /> Add Customer
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-gold/50 outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Split-view: Customer List + Side Panel */}
            <div className={`grid gap-6 ${selectedCustomer ? "lg:grid-cols-5" : "lg:grid-cols-1"} transition-all duration-300`}>

                {/* Customer Table */}
                <div className={`${selectedCustomer ? "lg:col-span-3" : ""} bg-card rounded-xl border border-border overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left">Customer</th>
                                    <th className="px-6 py-4 text-left">Contact</th>
                                    {!selectedCustomer && <th className="px-6 py-4 text-left">Identity</th>}
                                    <th className="px-6 py-4 text-left">Joined</th>
                                    <th className="px-4 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading && customers.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gold" /></td></tr>
                                ) : customers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="font-medium text-foreground text-sm">No customers found</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {search ? "Try a different search term." : "Add your first customer above."}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    customers.map((c) => (
                                        <tr
                                            key={c.id}
                                            onClick={() => handleSelectCustomer(c)}
                                            className={`hover:bg-muted/30 transition-colors cursor-pointer group ${selectedCustomer?.id === c.id ? "bg-gold/5 border-l-2 border-gold" : ""}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-gold shrink-0 transition-colors ${selectedCustomer?.id === c.id ? "bg-gold/20" : "bg-gold/10 group-hover:bg-gold/15"}`}>
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-foreground">{c.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>
                                                    {c.email && <span className="flex items-center gap-1 mt-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                                                </div>
                                            </td>
                                            {!selectedCustomer && (
                                                <td className="px-6 py-4 text-muted-foreground text-xs font-mono">
                                                    {c.cnic_passport ? "●●●●●-●●●●●●●-●" : "—"}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-muted-foreground text-xs">
                                                {new Date(c.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                                            </td>
                                            <td className="px-4 py-4">
                                                <ArrowRight className={`w-4 h-4 transition-all ${selectedCustomer?.id === c.id ? "text-gold" : "text-muted-foreground/30 group-hover:text-gold/60"}`} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Booking History Side Panel */}
                {selectedCustomer && (
                    <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden animate-in slide-in-from-right-4 duration-300">
                        {/* Panel Header */}
                        <div className="p-5 border-b border-border bg-gold/5 flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-7 h-7 rounded-full bg-gold/15 flex items-center justify-center">
                                        <User className="w-3.5 h-3.5 text-gold" />
                                    </div>
                                    <h3 className="font-bold text-foreground">{selectedCustomer.full_name}</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                                {totalSpent > 0 && (
                                    <p className="text-xs font-black text-gold mt-2">
                                        Total Spent: Rs {totalSpent.toLocaleString()}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedCustomer(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Booking List */}
                        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Booking History</p>

                            {bookingsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-gold" />
                                </div>
                            ) : customerBookings.length === 0 ? (
                                <div className="text-center py-10">
                                    <BookOpen className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No bookings yet</p>
                                </div>
                            ) : (
                                customerBookings.map(b => (
                                    <Link
                                        key={b.booking_id}
                                        to={`/admin/bookings/${b.booking_id}`}
                                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-gold/30 hover:bg-muted/30 transition-all group"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="text-[10px] font-mono text-muted-foreground">{b.invoice_no}</span>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${getStatusColor(b.status)}`}>
                                                    {b.status}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-foreground">
                                                Rs {Number(b.total_price).toLocaleString()}
                                                {b.balance_due > 0 && (
                                                    <span className="text-gold font-black ml-1">
                                                        · Rs {Number(b.balance_due).toLocaleString()} due
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-gold shrink-0 ml-2 transition-colors" />
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Customer Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
                            <h3 className="text-xl font-display font-bold">New Customer Profile</h3>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <input
                                required
                                placeholder="Full Name *"
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm"
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            />
                            <input
                                required
                                placeholder="Phone Number *"
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                            <input
                                type="email"
                                placeholder="Email Address"
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                            <input
                                placeholder="CNIC / Passport Number"
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm"
                                value={formData.cnic_passport}
                                onChange={e => setFormData({ ...formData, cnic_passport: e.target.value })}
                            />
                            <textarea
                                placeholder="Address"
                                rows={2}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm resize-none"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-gold-gradient text-secondary rounded-lg font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-all"
                                >
                                    {loading ? "Saving..." : "Create Profile"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
