import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, User, Phone, Mail, Loader2, BookOpen, ArrowRight, X, Users, Trash2, Wallet, RotateCcw, Edit2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import * as z from "zod";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const customerSchema = z.object({
  full_name: z.string().min(3, "Name kam az kam 3 characters ka hona chahiye"),
  phone: z.string().regex(/^03\d{9}$/, "Phone format: 03XXXXXXXXX (e.g., 03001234567)"),
  cnic_passport: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "CNIC format theek nahi hai (35201-1234567-1)"),
  email: z.string().email("Ghalat email format").optional().or(z.literal("")),
  address: z.string().optional(),
});

const customerEditSchema = z.object({
  full_name: z.string().min(3, "Name kam az kam 3 characters ka hona chahiye"),
  phone: z.string().regex(/^03\d{9}$/, "Phone format: 03XXXXXXXXX (e.g., 03001234567)"),
  email: z.string().email("Ghalat email format").optional().or(z.literal("")),
  address: z.string().optional(),
});

const formatCNIC = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length > 5 && digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  } else if (digits.length > 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
  }
  return digits;
};

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
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [confirmDeleteText, setConfirmDeleteText] = useState("");

    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        id: "", full_name: "", phone: "", email: "", address: ""
    });
    const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string>>({});
    const [updatingCustomer, setUpdatingCustomer] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Set page title
    useEffect(() => {
        document.title = "Customer Directory | Akbar Pura Travels";
        searchInputRef.current?.focus();
    }, []);

    // Side panel state
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);

    const fetchCustomers = async () => {
        let query = supabase
            .from("customers_safe_view" as any)
            .select("*, cnic_passport:cnic_passport_masked")
            .order("created_at", { ascending: false });

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
        }
        
        const { data, error } = await query;
        if (error) {
            console.error("Error fetching customers:", error);
            toast.error("Failed to load customer list.");
        }
        setCustomers((data as any) || []);
        setLoading(false);
    };

    const fetchCustomerBookings = async (customerId: string) => {
        setBookingsLoading(true);

        // First get booking IDs for this customer since the view doesn't have customer_id
        const { data: bookings } = await supabase
            .from("bookings")
            .select("id")
            .eq("customer_id", customerId);

        const bookingIds = bookings?.map(b => b.id) || [];

        if (bookingIds.length === 0) {
            setCustomerBookings([]);
            setBookingsLoading(false);
            return;
        }

        const { data } = await (supabase
            .from("booking_ledger_view" as any) as any)
            .select("booking_id, invoice_no, total_price, total_paid, balance_due, status, booking_type")
            .in("booking_id", bookingIds)
            .order("invoice_no", { ascending: false });

        setCustomerBookings((data as any) || []);
        setBookingsLoading(false);
    };

    const handleDeleteCustomer = async (id: string) => {
        try {
            // Safety Check: Check for active or completed bookings
            const { data: activeBookings, error: checkError } = await supabase
                .from("bookings")
                .select("id")
                .eq("customer_id", id)
                .neq("status", "Voided");

            if (checkError) throw checkError;

            if (activeBookings && activeBookings.length > 0) {
                toast.error(`Cannot delete customer with ${activeBookings.length} active or completed booking(s). Please void them first.`);
                return;
            }

            const { error: deleteError } = await supabase
                .from("customers")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", id);

            if (deleteError) throw deleteError;

            toast.success("Customer profile deleted successfully.");
            setSelectedCustomer(null);
            setConfirmDeleteText("");
            fetchCustomers();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete customer.");
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [search]);

    const handleSelectCustomer = (c: Customer) => {
        setSelectedCustomer(c);
        fetchCustomerBookings(c.id);
    };

    const handleOpenEdit = (c: Customer) => {
        setEditFormData({
            id: c.id,
            full_name: c.full_name,
            phone: c.phone,
            email: c.email || "",
            address: c.address || ""
        });
        setEditValidationErrors({});
        setShowEditModal(true);
    };

    const handleUpdateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditValidationErrors({});

        // Validate form
        const result = customerEditSchema.safeParse(editFormData);
        if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                const path = issue.path[0] as string;
                errors[path] = issue.message;
            });
            setEditValidationErrors(errors);
            toast.error("Form validation failed. Please check inputs.");
            return;
        }

        setUpdatingCustomer(false); // reset
        const { error } = await supabase
            .from("customers")
            .update({
                full_name: editFormData.full_name,
                phone: editFormData.phone,
                email: editFormData.email || null,
                address: editFormData.address || null
            })
            .eq("id", editFormData.id);

        if (!error) {
            toast.success("Customer profile updated successfully.");
            setShowEditModal(false);
            setSelectedCustomer(prev => prev ? {
                ...prev,
                full_name: editFormData.full_name,
                phone: editFormData.phone,
                email: editFormData.email || null,
                address: editFormData.address || null
            } : null);
            fetchCustomers();
        } else {
            toast.error(error.message || "Failed to update customer.");
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationErrors({});

        // Validate form
        const result = customerSchema.safeParse(formData);
        if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                const path = issue.path[0] as string;
                errors[path] = issue.message;
            });
            setValidationErrors(errors);
            toast.error("Form validation failed. Please check inputs.");
            return;
        }

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
            case "Completed": return "bg-green-100 text-green-700 border-green-200 px-2.5 py-0.5 rounded-full border text-xs font-medium";
            case "Voided": return "bg-red-100 text-red-700 border-red-200 px-2.5 py-0.5 rounded-full border text-xs font-medium";
            case "Confirmed": return "bg-blue-100 text-blue-700 border-blue-200 px-2.5 py-0.5 rounded-full border text-xs font-medium";
            default: return "bg-amber-100 text-amber-700 border-amber-200 px-2.5 py-0.5 rounded-full border text-xs font-medium";
        }
    };

    const totalSpent = customerBookings
        .filter(b => b.status !== "Voided")
        .reduce((sum, b) => sum + Number(b.total_price), 0);

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
            <div className="flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
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
                {search && (
                    <button
                        onClick={() => setSearch("")}
                        className="flex items-center gap-1.5 px-3 py-2 border border-border hover:bg-muted rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title="Clear search filter"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Clear
                    </button>
                )}
            </div>

            {/* Split-view: Customer List + Side Panel */}
            <div className={`grid gap-6 ${selectedCustomer ? "lg:grid-cols-5" : "lg:grid-cols-1"} transition-all duration-300`}>

                {/* Customer Table */}
                <div className={`${selectedCustomer ? "lg:col-span-3" : ""} bg-card rounded-xl border border-border overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" aria-label="Customer Directory Table">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="hidden sm:table-cell px-6 py-4 text-left w-12">S.No</th>
                                    <th className="px-6 py-4 text-left">Customer</th>
                                    <th className="px-6 py-4 text-left">Contact</th>
                                    {!selectedCustomer && <th className="px-6 py-4 text-left">Identity</th>}
                                    <th className="hidden md:table-cell px-6 py-4 text-left">Joined</th>
                                    <th className="px-4 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading && customers.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gold" /></td></tr>
                                ) : customers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3 stroke-1" />
                                            <p className="font-bold text-foreground text-sm">No customers found</p>
                                            <p className="text-xs text-muted-foreground mt-1 mb-4">
                                                {search ? "Try a different search term or register them as a new customer." : "Start by registering your first customer profile."}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setFormData({ full_name: search, phone: "", email: "", address: "", cnic_passport: "" });
                                                    setShowModal(true);
                                                }}
                                                className="px-4 py-2 bg-gold-gradient text-secondary rounded-lg font-semibold text-xs shadow-gold hover:opacity-90 transition-opacity"
                                            >
                                                <Plus className="w-3.5 h-3.5 inline mr-1" /> Add Customer
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    customers.map((c, index) => (
                                        <tr
                                            key={c.id}
                                            onClick={() => handleSelectCustomer(c)}
                                            className={`hover:bg-muted/40 transition-all cursor-pointer group ${selectedCustomer?.id === c.id ? "bg-gold/10 border-l-4 border-gold" : ""}`}
                                        >
                                            <td className="hidden sm:table-cell px-6 py-4 text-muted-foreground font-medium text-xs">
                                                {index + 1}
                                            </td>
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
                                            <td className="hidden md:table-cell px-6 py-4 text-muted-foreground text-xs">
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
                        <div className="p-5 border-b border-border bg-gold/5 flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-7 h-7 rounded-full bg-gold/15 flex items-center justify-center">
                                            <User className="w-3.5 h-3.5 text-gold" />
                                        </div>
                                        <h3 className="font-bold text-foreground">{selectedCustomer.full_name}</h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleOpenEdit(selectedCustomer)}
                                        className="p-2 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/10 transition-all"
                                        title="Edit Customer"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button
                                                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                                title="Delete Customer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the customer profile
                                                    for <strong>{selectedCustomer.full_name}</strong> and remove their data from our servers.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete Profile
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <button
                                        onClick={() => setSelectedCustomer(null)}
                                        className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Total Spent Summary Card */}
                            {totalSpent > 0 && (
                                <div className="bg-gold/10 border border-gold/20 rounded-lg p-3 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-md bg-gold/20 text-gold shrink-0">
                                            <Wallet className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue</p>
                                            <p className="text-sm font-black text-gold">PKR {totalSpent.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                                                PKR {Number(b.total_price).toLocaleString()}
                                                {b.balance_due > 0 && (
                                                    <span className="text-gold font-black ml-1">
                                                        · PKR {Number(b.balance_due).toLocaleString()} due
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
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/80">Full Name *</label>
                                <input
                                    required
                                    placeholder="e.g. Masim Khan"
                                    className={`w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm ${
                                        validationErrors.full_name ? "border-destructive focus:ring-destructive/30" : "border-border"
                                    }`}
                                    value={formData.full_name}
                                    onChange={e => {
                                        setFormData({ ...formData, full_name: e.target.value });
                                        if (validationErrors.full_name) {
                                            setValidationErrors(prev => {
                                                const copy = { ...prev };
                                                delete copy.full_name;
                                                return copy;
                                            });
                                        }
                                    }}
                                />
                                {validationErrors.full_name && (
                                    <p className="text-xs text-destructive">{validationErrors.full_name}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/80">Phone Number *</label>
                                <input
                                    required
                                    placeholder="e.g. 03001234567"
                                    className={`w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm ${
                                        validationErrors.phone ? "border-destructive focus:ring-destructive/30" : "border-border"
                                    }`}
                                    value={formData.phone}
                                    onChange={e => {
                                        setFormData({ ...formData, phone: e.target.value });
                                        if (validationErrors.phone) {
                                            setValidationErrors(prev => {
                                                const copy = { ...prev };
                                                delete copy.phone;
                                                return copy;
                                            });
                                        }
                                    }}
                                />
                                {validationErrors.phone && (
                                    <p className="text-xs text-destructive">{validationErrors.phone}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/80">CNIC / Passport Number *</label>
                                <input
                                    required
                                    placeholder="e.g. 35201-1234567-1"
                                    className={`w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm ${
                                        validationErrors.cnic_passport ? "border-destructive focus:ring-destructive/30" : "border-border"
                                    }`}
                                    value={formData.cnic_passport}
                                    onChange={e => {
                                        setFormData({ ...formData, cnic_passport: formatCNIC(e.target.value) });
                                        if (validationErrors.cnic_passport) {
                                            setValidationErrors(prev => {
                                                const copy = { ...prev };
                                                delete copy.cnic_passport;
                                                return copy;
                                            });
                                        }
                                    }}
                                />
                                {validationErrors.cnic_passport && (
                                    <p className="text-xs text-destructive">{validationErrors.cnic_passport}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/80">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="e.g. client@domain.com"
                                    className={`w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm ${
                                        validationErrors.email ? "border-destructive focus:ring-destructive/30" : "border-border"
                                    }`}
                                    value={formData.email}
                                    onChange={e => {
                                        setFormData({ ...formData, email: e.target.value });
                                        if (validationErrors.email) {
                                            setValidationErrors(prev => {
                                                const copy = { ...prev };
                                                delete copy.email;
                                                return copy;
                                            });
                                        }
                                    }}
                                />
                                {validationErrors.email && (
                                    <p className="text-xs text-destructive">{validationErrors.email}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/80">Address</label>
                                <textarea
                                    placeholder="Full billing address..."
                                    rows={2}
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm resize-none"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

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
            {/* Edit Customer Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
                            <h3 className="text-xl font-display font-bold">Edit Customer Profile</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateCustomer} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/80">Full Name *</label>
                                <input
                                    required
                                    placeholder="e.g. Masim Khan"
                                    className={`w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm ${
                                        editValidationErrors.full_name ? "border-destructive focus:ring-destructive/30" : "border-border"
                                    }`}
                                    value={editFormData.full_name}
                                    onChange={e => {
                                        setEditFormData({ ...editFormData, full_name: e.target.value });
                                        if (editValidationErrors.full_name) {
                                            setEditValidationErrors(prev => {
                                                const copy = { ...prev };
                                                delete copy.full_name;
                                                return copy;
                                            });
                                        }
                                    }}
                                />
                                {editValidationErrors.full_name && (
                                    <p className="text-xs text-destructive">{editValidationErrors.full_name}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/80">Phone Number *</label>
                                <input
                                    required
                                    placeholder="e.g. 03001234567"
                                    className={`w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm ${
                                        editValidationErrors.phone ? "border-destructive focus:ring-destructive/30" : "border-border"
                                    }`}
                                    value={editFormData.phone}
                                    onChange={e => {
                                        setEditFormData({ ...editFormData, phone: e.target.value });
                                        if (editValidationErrors.phone) {
                                            setEditValidationErrors(prev => {
                                                const copy = { ...prev };
                                                delete copy.phone;
                                                return copy;
                                            });
                                        }
                                    }}
                                />
                                {editValidationErrors.phone && (
                                    <p className="text-xs text-destructive">{editValidationErrors.phone}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/80">CNIC / Passport Number</label>
                                <input
                                    disabled
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-muted text-sm text-muted-foreground outline-none cursor-not-allowed"
                                    value={selectedCustomer.cnic_passport || ""}
                                />
                                <p className="text-[10px] text-muted-foreground">Identity changes (CNIC/Passport) are locked in Edit mode.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/80">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="e.g. client@domain.com"
                                    className={`w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm ${
                                        editValidationErrors.email ? "border-destructive focus:ring-destructive/30" : "border-border"
                                    }`}
                                    value={editFormData.email}
                                    onChange={e => {
                                        setEditFormData({ ...editFormData, email: e.target.value });
                                        if (editValidationErrors.email) {
                                            setEditValidationErrors(prev => {
                                                const copy = { ...prev };
                                                delete copy.email;
                                                return copy;
                                            });
                                        }
                                    }}
                                />
                                {editValidationErrors.email && (
                                    <p className="text-xs text-destructive">{editValidationErrors.email}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground/80">Address</label>
                                <textarea
                                    placeholder="Full billing address..."
                                    rows={2}
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-gold/50 outline-none text-sm resize-none"
                                    value={editFormData.address}
                                    onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingCustomer}
                                    className="flex-1 px-4 py-2 bg-gold-gradient text-secondary rounded-lg font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-all"
                                >
                                    {updatingCustomer ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
