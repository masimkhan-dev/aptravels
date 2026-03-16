import { useEffect, useState, useCallback } from "react";
import {
    PlusCircle, Trash2, Loader2, Search, Filter, Receipt,
    TrendingDown, Banknote, RefreshCcw, X, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = "supplier_payment" | "operational_expense" | "customer_refund";
type PaymentMethod = "cash" | "bank_transfer" | "online" | "cheque";

interface OutgoingPayment {
    id: string;
    amount: number;
    category: Category;
    paid_to: string;
    description: string | null;
    booking_id: string | null;
    customer_id: string | null;
    payment_method: PaymentMethod;
    reference_no: string | null;
    payment_date: string;
    created_at: string;
    deleted_at: string | null;
}

interface BookingOption {
    id: string;
    invoice_no: string;
    customer_name: string;
    total_paid: number;
}

interface CustomerOption {
    id: string;
    full_name: string;
    phone: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
    supplier_payment: "Supplier Payment",
    operational_expense: "Operational Expense",
    customer_refund: "Customer Refund",
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    online: "Online",
    cheque: "Cheque",
};

const CATEGORY_COLORS: Record<Category, string> = {
    supplier_payment: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    operational_expense: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    customer_refund: "bg-red-500/10 text-red-500 border-red-500/20",
};

const EMPTY_FORM = {
    amount: "",
    category: "operational_expense" as Category,
    paid_to: "",
    description: "",
    booking_id: "",
    customer_id: "",
    payment_method: "cash" as PaymentMethod,
    reference_no: "",
    payment_date: new Date().toISOString().split("T")[0],
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminExpenses() {
    const [expenses, setExpenses] = useState<OutgoingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    // Filters
    const [filterCategory, setFilterCategory] = useState<Category | "">("");
    const [filterSearch, setFilterSearch] = useState("");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");

    // Refund helper
    const [bookings, setBookings] = useState<BookingOption[]>([]);
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [maxRefundable, setMaxRefundable] = useState<number | null>(null);
    const [refundLoading, setRefundLoading] = useState(false);
    const [linkToBooking, setLinkToBooking] = useState(false);

    // Totals
    const [totals, setTotals] = useState({ total: 0, supplier: 0, operational: 0, refund: 0 });

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        let query = (supabase.from("outgoing_payments" as any) as any)
            .select("*")
            .is("deleted_at", null)
            .order("payment_date", { ascending: false });

        if (filterCategory) query = query.eq("category", filterCategory);
        if (filterDateFrom) query = query.gte("payment_date", filterDateFrom);
        if (filterDateTo) query = query.lte("payment_date", filterDateTo);

        const { data, error } = await query;

        if (error) {
            toast.error("Failed to load expenses.");
        } else {
            const list: OutgoingPayment[] = (data || []) as OutgoingPayment[];

            // Client-side search filter
            const filtered = filterSearch
                ? list.filter(
                    (e) =>
                        e.paid_to.toLowerCase().includes(filterSearch.toLowerCase()) ||
                        (e.description || "").toLowerCase().includes(filterSearch.toLowerCase())
                )
                : list;

            setExpenses(filtered);

            // Compute totals from full list
            setTotals({
                total: list.reduce((s, e) => s + Number(e.amount), 0),
                supplier: list.filter((e) => e.category === "supplier_payment").reduce((s, e) => s + Number(e.amount), 0),
                operational: list.filter((e) => e.category === "operational_expense").reduce((s, e) => s + Number(e.amount), 0),
                refund: list.filter((e) => e.category === "customer_refund").reduce((s, e) => s + Number(e.amount), 0),
            });
        }
        setLoading(false);
    }, [filterCategory, filterSearch, filterDateFrom, filterDateTo]);

    // Load bookings for refund dropdown
    const fetchBookings = async () => {
        const { data } = await (supabase.from("booking_ledger_view" as any) as any)
            .select("booking_id, invoice_no, customer_name, total_paid")
            .limit(100);
        if (data) {
            setBookings(data.map((b: any) => ({
                id: b.booking_id,
                invoice_no: b.invoice_no,
                customer_name: b.customer_name,
                total_paid: Number(b.total_paid || 0),
            })));
        }
    };

    // Load customers for refund dropdown
    const fetchCustomers = async () => {
        const { data } = await supabase.from("customers_safe_view" as any).select("id, full_name, phone").order("full_name");
        if (data) setCustomers(data as unknown as CustomerOption[]);
    };

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    // Compute max refundable when booking changes in refund mode
    useEffect(() => {
        if (form.category !== "customer_refund" || !form.booking_id) {
            setMaxRefundable(null);
            return;
        }
        const computeMax = async () => {
            setRefundLoading(true);
            // Total paid by customer
            const { data: paidData } = await supabase
                .from("payments")
                .select("amount_paid")
                .eq("booking_id", form.booking_id)
                .eq("voided", false);

            const totalPaid = (paidData || []).reduce((s: number, p: any) => s + Number(p.amount_paid), 0);

            // Total already refunded
            const { data: refundedData } = await (supabase.from("outgoing_payments" as any) as any)
                .select("amount")
                .eq("booking_id", form.booking_id)
                .eq("category", "customer_refund")
                .is("deleted_at", null);

            const totalRefunded = (refundedData || []).reduce((s: number, r: any) => s + Number(r.amount), 0);

            setMaxRefundable(Math.max(0, totalPaid - totalRefunded));
            setRefundLoading(false);
        };
        computeMax();
    }, [form.booking_id, form.category]);

    const handleOpenForm = () => {
        setForm({ ...EMPTY_FORM });
        setMaxRefundable(null);
        fetchBookings();
        fetchCustomers();
        setShowForm(true);
    };

    const handleFieldChange = (field: string, value: string) => {
        setForm((prev) => {
            const updated = { ...prev, [field]: value };
            // When category changes, clear booking/customer linkage
            if (field === "category") {
                updated.booking_id = "";
                updated.customer_id = "";
                setLinkToBooking(false);
            }
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
            toast.error("Please enter a valid amount.");
            return;
        }
        if (!form.paid_to.trim()) {
            toast.error("'Paid To' is required.");
            return;
        }
        if (form.category === "customer_refund" && !form.booking_id) {
            toast.error("Please select a Booking for Customer Refund.");
            return;
        }
        if (maxRefundable !== null && Number(form.amount) > maxRefundable) {
            toast.error(`Refund exceeds max refundable amount of Rs ${maxRefundable.toLocaleString()}.`);
            return;
        }

        setSubmitting(true);

        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
            toast.error("Authentication error. Please log in again.");
            setSubmitting(false);
            return;
        }

        const payload: any = {
            amount: Number(form.amount),
            category: form.category,
            paid_to: form.paid_to.trim(),
            description: form.description.trim() || null,
            payment_method: form.payment_method,
            reference_no: form.reference_no.trim() || null,
            payment_date: form.payment_date,
            created_by: userData.user.id,
            booking_id: form.booking_id || null,
            customer_id: form.customer_id || null,
        };

        const { error } = await (supabase.from("outgoing_payments" as any) as any).insert([payload]);

        if (error) {
            // DB trigger raises meaningful exceptions — surface them
            const msg = error.message?.includes("Refund Blocked")
                ? error.message.split("ERROR:")[1]?.trim() || "Refund limit exceeded."
                : "Failed to record payment. " + error.message;
            toast.error(msg);
        } else {
            toast.success("Expense recorded successfully.");
            setShowForm(false);
            fetchExpenses();
        }
        setSubmitting(false);
    };

    const handleSoftDelete = async (id: string) => {
        if (!window.confirm("Delete this expense? It will be archived and removed from view.")) return;

        const { error } = await (supabase.from("outgoing_payments" as any) as any)
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id);

        if (error) {
            toast.error("Failed to delete expense.");
        } else {
            toast.success("Expense deleted.");
            fetchExpenses();
        }
    };

    const clearFilters = () => {
        setFilterCategory("");
        setFilterSearch("");
        setFilterDateFrom("");
        setFilterDateTo("");
    };

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-black text-foreground tracking-tight">Expenses</h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                        Record outgoing payments, supplier costs, and customer refunds.
                    </p>
                </div>
                <button
                    id="btn-add-expense"
                    onClick={handleOpenForm}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-black font-black text-sm hover:bg-gold/90 transition-colors shadow"
                >
                    <PlusCircle className="w-4 h-4" /> Add Expense
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Outflow", value: totals.total, icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10" },
                    { label: "Supplier Payments", value: totals.supplier, icon: Banknote, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Operational", value: totals.operational, icon: Receipt, color: "text-orange-500", bg: "bg-orange-500/10" },
                    { label: "Refunds Issued", value: totals.refund, icon: RefreshCcw, color: "text-purple-500", bg: "bg-purple-500/10" },
                ].map((c) => (
                    <div key={c.label} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{c.label}</span>
                            <div className={`w-9 h-9 rounded-xl ${c.bg} ${c.color} flex items-center justify-center`}>
                                <c.icon className="w-4 h-4" />
                            </div>
                        </div>
                        <p className={`font-display text-xl font-black ${c.color}`}>
                            Rs {Number(c.value).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-card rounded-2xl border border-border p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        id="expense-search"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                        placeholder="Search paid to or description..."
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                    />
                </div>
                <select
                    id="expense-filter-category"
                    className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as Category | "")}
                >
                    <option value="">All Categories</option>
                    <option value="supplier_payment">Supplier Payment</option>
                    <option value="operational_expense">Operational Expense</option>
                    <option value="customer_refund">Customer Refund</option>
                </select>
                <input
                    type="date"
                    id="expense-filter-from"
                    className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                    type="date"
                    id="expense-filter-to"
                    className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                />
                {(filterCategory || filterSearch || filterDateFrom || filterDateTo) && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-3 h-3" /> Clear
                    </button>
                )}
            </div>

            {/* Expense List */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin text-gold" />
                        <span className="text-sm font-medium">Loading expenses...</span>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                        <Receipt className="w-10 h-10 opacity-30" />
                        <p className="text-sm font-bold">No expenses found.</p>
                        <p className="text-xs">Try changing filters or add a new expense.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    {["Date", "Category", "Paid To", "Method", "Ref No", "Amount", "Actions"].map((h) => (
                                        <th key={h} className="px-5 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {expenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-5 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                                            {new Date(exp.payment_date).toLocaleDateString("en-PK")}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`text-[9px] px-2 py-1 rounded-full font-black uppercase border ${CATEGORY_COLORS[exp.category]}`}>
                                                {CATEGORY_LABELS[exp.category]}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <p className="text-sm font-bold text-foreground leading-none">{exp.paid_to}</p>
                                            {exp.description && (
                                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{exp.description}</p>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                                            {METHOD_LABELS[exp.payment_method]}
                                        </td>
                                        <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                                            {exp.reference_no || "—"}
                                        </td>
                                        <td className="px-5 py-3 text-sm font-black text-red-500 whitespace-nowrap">
                                            Rs {Number(exp.amount).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3">
                                            <button
                                                id={`btn-delete-expense-${exp.id}`}
                                                onClick={() => handleSoftDelete(exp.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                                title="Delete expense"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="font-display font-black text-lg">New Expense</h2>
                            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Category */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                                    Category <span className="text-destructive">*</span>
                                </label>
                                <select
                                    id="form-category"
                                    required
                                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                                    value={form.category}
                                    onChange={(e) => handleFieldChange("category", e.target.value)}
                                >
                                    <option value="operational_expense">Operational Expense</option>
                                    <option value="supplier_payment">Supplier Payment</option>
                                    <option value="customer_refund">Customer Refund</option>
                                </select>
                            </div>

                            {/* Refund-specific: Booking linkage + max refundable */}
                            {form.category === "customer_refund" && (
                                <div className="space-y-3 p-3 bg-muted/50 rounded-xl border border-border">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                                            Booking <span className="text-destructive">*</span>
                                        </label>
                                        <select
                                            id="form-booking-id"
                                            className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                                            value={form.booking_id}
                                            onChange={(e) => {
                                                handleFieldChange("booking_id", e.target.value);
                                                // Auto-fill paid_to with customer name
                                                const booking = bookings.find((b) => b.id === e.target.value);
                                                if (booking) {
                                                    setForm((prev) => ({ ...prev, booking_id: e.target.value, paid_to: booking.customer_name }));
                                                }
                                            }}
                                        >
                                            <option value="">— Select Booking —</option>
                                            {bookings.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.invoice_no} — {b.customer_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Max Refundable Display */}
                                    {form.booking_id && (
                                        <div className={`flex items-center gap-2 text-xs font-bold rounded-lg px-3 py-2 ${maxRefundable !== null && maxRefundable <= 0
                                            ? "bg-destructive/10 text-destructive"
                                            : "bg-green-500/10 text-green-600"
                                            }`}>
                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            {refundLoading
                                                ? "Calculating max refundable..."
                                                : maxRefundable !== null
                                                    ? `Max Refundable: Rs ${maxRefundable.toLocaleString()}`
                                                    : "—"}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Paid To */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                                    Paid To <span className="text-destructive">*</span>
                                </label>
                                <input
                                    id="form-paid-to"
                                    type="text"
                                    required
                                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                                    placeholder="e.g. Air Arabia, PTCL, Ahmed Ali"
                                    value={form.paid_to}
                                    onChange={(e) => handleFieldChange("paid_to", e.target.value)}
                                />
                            </div>

                            {/* Optional Booking Link (for non-refund categories) */}
                            {form.category !== "customer_refund" && (
                                <div className="p-3 bg-muted/50 rounded-xl border border-border">
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            id="form-link-booking"
                                            type="checkbox"
                                            checked={linkToBooking}
                                            onChange={(e) => {
                                                setLinkToBooking(e.target.checked);
                                                if (!e.target.checked) {
                                                    handleFieldChange("booking_id", "");
                                                }
                                            }}
                                            className="w-4 h-4 rounded accent-gold"
                                        />
                                        <span className="text-xs font-bold text-muted-foreground">
                                            🔗 Link to a Booking? <span className="font-normal">(Optional — for per-booking profit tracking)</span>
                                        </span>
                                    </label>

                                    {linkToBooking && (
                                        <div className="mt-3">
                                            <select
                                                id="form-optional-booking-id"
                                                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                                                value={form.booking_id}
                                                onChange={(e) => {
                                                    handleFieldChange("booking_id", e.target.value);
                                                }}
                                            >
                                                <option value="">— Select Booking —</option>
                                                {bookings.map((b) => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.invoice_no} — {b.customer_name}
                                                    </option>
                                                ))}
                                            </select>
                                            {form.booking_id && (
                                                <p className="text-[10px] text-green-600 font-bold mt-1.5 flex items-center gap-1">
                                                    ✓ Linked to booking — this cost will appear in per-booking profit reports.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Amount */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                                    Amount (Rs) <span className="text-destructive">*</span>
                                </label>
                                <input
                                    id="form-amount"
                                    type="number"
                                    required
                                    min="1"
                                    step="0.01"
                                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                                    placeholder="0.00"
                                    value={form.amount}
                                    onChange={(e) => handleFieldChange("amount", e.target.value)}
                                />
                                {maxRefundable !== null && Number(form.amount) > maxRefundable && (
                                    <p className="text-[10px] text-destructive font-bold mt-1">
                                        ⚠ Amount exceeds max refundable (Rs {maxRefundable.toLocaleString()})
                                    </p>
                                )}
                            </div>

                            {/* Payment Method & Date — row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                                        Method <span className="text-destructive">*</span>
                                    </label>
                                    <select
                                        id="form-payment-method"
                                        required
                                        className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                                        value={form.payment_method}
                                        onChange={(e) => handleFieldChange("payment_method", e.target.value)}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="online">Online</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                                        Date <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        id="form-payment-date"
                                        type="date"
                                        required
                                        className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                                        value={form.payment_date}
                                        onChange={(e) => handleFieldChange("payment_date", e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Reference No */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                                    Reference No <span className="text-[9px] text-muted-foreground normal-case">(optional)</span>
                                </label>
                                <input
                                    id="form-reference-no"
                                    type="text"
                                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none"
                                    placeholder="Cheque no, TRX ID, etc."
                                    value={form.reference_no}
                                    onChange={(e) => handleFieldChange("reference_no", e.target.value)}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                                    Description <span className="text-[9px] text-muted-foreground normal-case">(optional)</span>
                                </label>
                                <textarea
                                    id="form-description"
                                    rows={2}
                                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:ring-1 focus:ring-gold focus:outline-none resize-none"
                                    placeholder="Add a note..."
                                    value={form.description}
                                    onChange={(e) => handleFieldChange("description", e.target.value)}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="submit"
                                    id="btn-submit-expense"
                                    disabled={submitting}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gold text-black font-black rounded-xl hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                    {submitting ? "Saving..." : "Record Expense"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
