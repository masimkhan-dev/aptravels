import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import {
    ArrowLeft, Printer, DollarSign, Calendar, Eye, EyeOff, User,
    ShieldCheck, X, CheckCircle2, History, Loader2, Package, Plane, Ticket, FileText, Check
} from "lucide-react";
import { AGENCY } from "@/lib/constants";

interface BookingDetail {
    id: string;
    invoice_no: string;
    status: string;
    total_price: number;
    travel_date: string;
    created_at: string;
    booking_type: string;
    pnr_number: string;
    airline_name: string;
    ticket_sector: string;
    visa_country: string;
    visa_profession: string;
    // Visa Workflow Steps
    visa_step_passport_received: boolean;
    visa_step_medical_cleared: boolean;
    visa_step_enumber_generated: boolean;
    visa_step_protector_stamp: boolean;
    visa_step_final_stamping: boolean;
    customers: { full_name: string; phone: string; address: string; cnic_passport: string };
    packages: { title: string; destination: string; duration: string } | null;
}

interface Payment {
    id: string;
    amount_paid: number;
    payment_method: string;
    reference_no: string | null;
    payment_date: string;
    voided: boolean;
    void_reason: string | null;
}

export default function AdminBookingDetail() {
    const { id } = useParams();
    const { role } = useRole();
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);

    // Payment Form
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState("Cash");

    // Void Modal State
    const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
    const [voidReason, setVoidReason] = useState("");
    const [voiding, setVoiding] = useState(false);

    // CNIC Reveal State (PII protection)
    const [cnicRevealed, setCnicRevealed] = useState(false);

    const fetchData = async () => {
        const { data: b } = await (supabase.from("bookings" as any) as any).select(`
      *, 
      customers(full_name, phone, address, cnic_passport),
      packages(title, destination, duration)
    `).eq("id", id).single();

        const { data: p } = await (supabase.from("payments" as any) as any)
            .select("*")
            .eq("booking_id", id)
            .order("payment_date", { ascending: true });

        if (b) setBooking(b as any);
        if (p) setPayments(p as any);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [id]);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(payAmount);

        if (!payAmount || amount <= 0) return;

        // Client-side guard: also enforced by DB trigger (prevents round-trip for obvious violations)
        if (amount > balance) {
            toast.error(`Payment of Rs ${amount.toLocaleString()} exceeds the remaining balance of Rs ${balance.toLocaleString()}.`);
            return;
        }

        setPaying(true);
        const { error } = await (supabase.from("payments" as any) as any).insert({
            booking_id: id,
            amount_paid: amount,
            payment_method: payMethod,
            payment_date: new Date().toISOString()
        });

        if (error) {
            // Surface DB trigger rejections (overpayment, RLS, tamper detection) to staff
            toast.error(error.message?.replace('CRITICAL_ERROR: ', '') || "Payment rejected. Please check the amount and try again.");
        } else {
            toast.success(`Rs ${amount.toLocaleString()} recorded successfully.`);
            setPayAmount("");
            fetchData();
        }
        setPaying(false);
    };

    // Opens the styled inline void modal — replaces window.prompt
    const openVoidModal = (paymentId: string) => {
        setVoidTargetId(paymentId);
        setVoidReason("");
    };

    const handleVoidConfirm = async () => {
        if (!voidTargetId || voidReason.trim().length < 10) {
            toast.error("Please provide a reason of at least 10 characters.");
            return;
        }
        setVoiding(true);
        const { error } = await (supabase
            .from("payments" as any) as any)
            .update({ voided: true, void_reason: voidReason.trim() })
            .eq("id", voidTargetId);

        if (error) {
            toast.error(error.message || "Failed to void payment.");
        } else {
            toast.success("Payment voided and audit trail updated.");
            setVoidTargetId(null);
            fetchData();
        }
        setVoiding(false);
    };

    const toggleVisaStep = async (step: keyof BookingDetail, currentVal: boolean) => {
        if (!booking) return;
        const { error } = await (supabase
            .from("bookings" as any) as any)
            .update({ [step]: !currentVal })
            .eq("id", id);

        if (!error) fetchData();
    };

    const totalPaid = payments.filter(p => !p.voided).reduce((s, p) => s + p.amount_paid, 0);
    const balance = (booking?.total_price || 0) - totalPaid;

    // Visa Progress Calculation
    const visaSteps = [
        { key: 'visa_step_passport_received', label: 'Passport Received' },
        { key: 'visa_step_medical_cleared', label: 'Medical Cleared' },
        { key: 'visa_step_enumber_generated', label: 'E-Number Generated' },
        { key: 'visa_step_protector_stamp', label: 'Protector Stamp' },
        { key: 'visa_step_final_stamping', label: 'Final Stamping' }
    ];

    const completedSteps = booking ? visaSteps.filter(s => (booking as any)[s.key]).length : 0;
    const progressPercent = (completedSteps / visaSteps.length) * 100;

    // State Machine: Only allowed forward transitions exposed in UI
    const getAllowedStatuses = (current: string): string[] => {
        switch (current) {
            case 'Draft': return ['Draft', 'Confirmed', 'Voided'];
            case 'Confirmed': return ['Confirmed', 'Completed', 'Voided'];
            case 'Completed': return ['Completed'];
            case 'Voided': return ['Voided'];
            default: return ['Draft'];
        }
    };

    const isStatusTerminal = (s: string) => s === 'Completed' || s === 'Voided';

    const handleStatusChange = async (newStatus: string) => {
        if (!booking || newStatus === booking.status) return;
        const { error } = await (supabase
            .from("bookings" as any) as any)
            .update({ status: newStatus })
            .eq("id", id);
        if (error) {
            toast.error(error.message || "Status change rejected.");
        } else {
            toast.success(`Booking status updated to ${newStatus}.`);
            fetchData();
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-gold" />
            <p className="font-medium animate-pulse">Loading financial records...</p>
        </div>
    );
    if (!booking) return <div className="p-20 text-center text-destructive font-bold">Booking not found.</div>;

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header UI (Hidden in Print) */}
            <div className="no-print mb-8">
                <Link to="/admin/bookings" className="flex items-center gap-2 text-muted-foreground hover:text-gold mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Ledger
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-muted-foreground uppercase">{booking.invoice_no}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-muted text-muted-foreground`}>
                                {booking.booking_type}
                            </span>
                            {/* Status: Dropdown for admin/manager, badge for others */}
                            {(role === 'admin' || role === 'manager') ? (
                                <select
                                    value={booking.status}
                                    onChange={e => handleStatusChange(e.target.value)}
                                    disabled={isStatusTerminal(booking.status)}
                                    className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ring-1 outline-none cursor-pointer transition-all
                                        ${booking.status === 'Voided' ? 'bg-destructive/10 text-destructive ring-destructive/20'
                                            : booking.status === 'Completed' ? 'bg-green-500/10 text-green-600 ring-green-500/20'
                                                : booking.status === 'Confirmed' ? 'bg-gold/10 text-gold ring-gold/20'
                                                    : 'bg-muted text-muted-foreground ring-border'}
                                        ${isStatusTerminal(booking.status) ? 'cursor-not-allowed opacity-70' : 'hover:opacity-80'}`}
                                >
                                    {getAllowedStatuses(booking.status).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ring-1
                                    ${booking.status === 'Voided' ? 'bg-destructive/10 text-destructive ring-destructive/20'
                                        : booking.status === 'Completed' ? 'bg-green-500/10 text-green-600 ring-green-500/20'
                                            : 'bg-gold/10 text-gold ring-gold/20'}`}
                                >
                                    {booking.status}
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl font-display font-bold">Ledger: {booking.customers.full_name}</h1>
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-gold-gradient text-secondary rounded-xl font-bold hover:opacity-90 transition-all shadow-gold">
                        <Printer className="w-5 h-5" /> Print Invoice
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left: Ledger & Payments (Hidden in Print) */}
                <div className="lg:col-span-2 space-y-6 no-print">

                    {/* Visa Workflow Tracker (Only for Visa) */}
                    {booking.booking_type === 'Visa' && (
                        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-500 mb-8">
                            <div className="p-6 border-b border-border bg-blue-500/[0.03] flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                        <h3 className="font-bold text-sm text-blue-600 uppercase tracking-tight flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> Visa Stamping Pipeline
                                        </h3>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-black tracking-widest uppercase">System Tracked • Stage {completedSteps}/5</p>
                                </div>
                                <div className="bg-blue-600/10 px-4 py-2 rounded-xl border border-blue-600/20">
                                    <p className="text-2xl font-black text-blue-600 leading-none">{Math.round(progressPercent)}%</p>
                                    <p className="text-[8px] font-bold text-blue-400 uppercase mt-1 text-center">Done</p>
                                </div>
                            </div>

                            {/* Progress Bar Container */}
                            <div className="px-6 pt-5">
                                <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/50 shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                                {visaSteps.map((step, idx) => {
                                    const isDone = (booking as any)[step.key];
                                    const canEditVisa = role === 'admin' || role === 'manager' || role === 'ops';
                                    return (
                                        <button
                                            key={step.key}
                                            onClick={() => canEditVisa && toggleVisaStep(step.key as any, isDone)}
                                            className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all text-center relative overflow-hidden group ${isDone
                                                ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20 translate-y-[-2px]'
                                                : 'bg-background border-border hover:border-blue-400 hover:bg-muted/50'
                                                } ${!canEditVisa ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            disabled={!canEditVisa}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform duration-300 ${canEditVisa ? 'group-hover:scale-110' : ''} ${isDone ? 'bg-white/20 border-white text-white' : 'bg-muted border-border text-muted-foreground'
                                                }`}>
                                                {isDone ? <Check className="w-4 h-4" /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-tight leading-tight ${isDone ? 'text-white' : 'text-muted-foreground'
                                                }`}>
                                                {step.label}
                                            </span>

                                            {/* Subtle Glassmorphism shine for active cards */}
                                            {isDone && <div className="absolute top-0 left-[-100%] w-full h-full bg-white/10 skew-x-[-20deg] group-hover:left-[100%] transition-all duration-700" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-gold" /> Transaction History</h3>
                            <div className="text-right">
                                <p className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mb-1">Current Balance Due</p>
                                <p className="text-2xl font-black text-gold">Rs {balance.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="divide-y divide-border">
                            {payments.length === 0 && (
                                <div className="p-12 text-center text-muted-foreground italic bg-background/50">No payments recorded yet.</div>
                            )}
                            {payments.map(p => (
                                <div key={p.id} className={`p-5 flex items-center justify-between transition-colors hover:bg-muted/30 ${p.voided ? 'opacity-40 grayscale italic' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${p.voided ? 'bg-muted' : 'bg-green-500/10 text-green-500'}`}>
                                            <DollarSign className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">Rs {Number(p.amount_paid).toLocaleString()}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                                {new Date(p.payment_date).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • {p.payment_method}
                                            </p>
                                        </div>
                                    </div>
                                    {p.voided ? (
                                        <div className="text-right">
                                            <span className="text-[10px] bg-muted text-muted-foreground px-3 py-1 rounded-full font-black tracking-widest uppercase block mb-1">VOIDED</span>
                                            {(role === 'admin' || role === 'manager') && (
                                                <p className="text-[9px] text-destructive italic font-medium max-w-[120px] truncate">{p.void_reason}</p>
                                            )}
                                        </div>
                                    ) : (
                                        (role === 'admin' || role === 'manager') && (
                                            <button
                                                onClick={() => openVoidModal(p.id)}
                                                className="text-[10px] text-muted-foreground hover:text-destructive font-bold uppercase tracking-widest border border-border px-3 py-1 rounded-full hover:border-destructive transition-all"
                                            >
                                                Void
                                            </button>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-muted/10 border-t border-border flex justify-between items-center font-bold">
                            <span className="text-sm">Total Quote: Rs {Number(booking.total_price).toLocaleString()}</span>
                            <span className="text-sm text-green-500">Net Received: Rs {totalPaid.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Add Payment Form */}
                    {(role === 'admin' || role === 'manager') && booking.status !== 'Completed' && booking.status !== 'Voided' && (
                        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" /> Professional Receipting</h3>
                            <form onSubmit={handlePayment} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">Rs</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-gold font-bold"
                                        value={payAmount}
                                        onChange={e => setPayAmount(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-gold font-medium"
                                    value={payMethod}
                                    onChange={e => setPayMethod(e.target.value)}
                                >
                                    <option value="Cash">Cash Payment</option>
                                    <option value="Bank Transfer">Bank Transfer / Online</option>
                                    <option value="Cheque">Cheque Deposit</option>
                                </select>
                                <button
                                    disabled={paying}
                                    className="bg-gold-gradient text-secondary rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-gold"
                                >
                                    {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    {paying ? "Recording..." : "Add Payment"}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Void Payment Modal */}
                {voidTargetId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                        <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-border bg-destructive/5 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-destructive">Void Payment</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">This action is irreversible and will be logged.</p>
                                </div>
                                <button onClick={() => setVoidTargetId(null)} className="text-muted-foreground hover:text-foreground">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Void Reason <span className="text-destructive">*</span></label>
                                    <textarea
                                        value={voidReason}
                                        onChange={e => setVoidReason(e.target.value)}
                                        minLength={10}
                                        rows={3}
                                        placeholder="Describe the reason for voiding (min. 10 characters)..."
                                        className="w-full px-4 py-3 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-destructive text-sm resize-none"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">{voidReason.length}/10 minimum characters</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setVoidTargetId(null)}
                                        className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted font-bold text-sm transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleVoidConfirm}
                                        disabled={voiding || voidReason.trim().length < 10}
                                        className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {voiding ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                        {voiding ? 'Voiding...' : 'Confirm Void'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Right: Summary Sidebar (Hidden in Print) */}
                <div className="space-y-6 no-print">
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                        <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-black mb-4 flex items-center gap-2">
                            <User className="w-3.5 h-3.5" /> Customer Identity
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Primary Contact</p>
                                <p className="font-bold text-lg">{booking.customers.phone}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Mailing Address</p>
                                <p className="text-sm font-medium">{booking.customers.address || "No address provided"}</p>
                            </div>
                            {booking.customers.cnic_passport && (
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Passport / CNIC</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-sm font-mono font-bold text-gold">
                                            {cnicRevealed
                                                ? booking.customers.cnic_passport
                                                : '●●●●●-●●●●●●●-●'}
                                        </p>
                                        {(role === 'admin' || role === 'manager') && (
                                            <button
                                                onClick={() => setCnicRevealed(v => !v)}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                                title={cnicRevealed ? 'Hide CNIC' : 'Reveal CNIC'}
                                            >
                                                {cnicRevealed
                                                    ? <EyeOff className="w-3.5 h-3.5" />
                                                    : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                        <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-black mb-4 flex items-center gap-2">
                            {booking.booking_type === 'Ticket' ? <Plane className="w-3.5 h-3.5" /> :
                                booking.booking_type === 'Visa' ? <FileText className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                            {booking.booking_type === 'Ticket' ? "Ticket Inventory Details" :
                                booking.booking_type === 'Visa' ? "Employment Visa Details" : "Package Logistics"}
                        </h3>
                        {booking.booking_type === 'Ticket' ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Airline & Sector</p>
                                    <p className="font-black text-sm text-foreground uppercase tracking-tight">{booking.airline_name || "Unknown"} • {booking.ticket_sector || "No Sector"}</p>
                                </div>
                                <div className="p-3 bg-gold/5 rounded-xl border border-gold/20 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">PNR Number</p>
                                        <p className="font-black text-xl text-gold font-mono tracking-widest">{booking.pnr_number || "PENDING"}</p>
                                    </div>
                                    <Ticket className="w-6 h-6 text-gold/30" />
                                </div>
                                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1">
                                        <Calendar className="w-2.5 h-2.5" /> Flight Date
                                    </p>
                                    <p className="font-bold text-xs text-foreground">{booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : "Not Assigned"}</p>
                                </div>
                            </div>
                        ) : booking.booking_type === 'Visa' ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 underline decoration-blue-500/30">Target Country</p>
                                    <p className="font-black text-xl text-blue-600 uppercase tracking-tighter">{booking.visa_country || "Not Specified"}</p>
                                </div>
                                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Designated Profession</p>
                                    <p className="font-bold text-sm text-foreground leading-tight">{booking.visa_profession || "General Entry"}</p>
                                </div>
                                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1">
                                        <Calendar className="w-2.5 h-2.5" /> Submission/Stamp Date
                                    </p>
                                    <p className="font-bold text-xs text-foreground">{booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : "Process Not Started"}</p>
                                </div>
                            </div>
                        ) : booking.packages ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Selected Package</p>
                                    <p className="font-bold text-sm text-foreground leading-tight">{booking.packages.title}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Destination</p>
                                        <p className="font-bold text-xs">{booking.packages.destination}</p>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Duration</p>
                                        <p className="font-bold text-xs">{booking.packages.duration}</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1">
                                        <Calendar className="w-2.5 h-2.5" /> Est. Travel Date
                                    </p>
                                    <p className="font-bold text-xs text-gold">{booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : "Not Assigned"}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-10 text-center border-2 border-dashed border-border rounded-2xl">
                                <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-xs italic text-muted-foreground">Custom / External Service</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- INVOICE PRINT AREA (VISIBLE ONLY IN PRINT) --- */}
            <div id="invoice-print-area" className="print-only hidden p-10 bg-white text-black min-h-[11in]">
                <style dangerouslySetInnerHTML={{
                    __html: `
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { background: white; color: black; font-family: sans-serif; }
            @page { size: A4; margin: 15mm; }
            .border-slate-900 { border-color: #000 !important; }
          }
        `}} />

                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-10">
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-tight mb-2">
                            AKBAR PURA<br />
                            <span className="text-xl text-slate-700">INTERNATIONAL TRAVELS & TOURS</span>
                        </h1>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6 italic">{AGENCY.tagline.toUpperCase()}</p>

                        <div className="space-y-1.5 text-[10px] font-bold text-slate-800">
                            <p className="flex items-start gap-2 uppercase tracking-wider">
                                <span className="w-16 text-slate-400 shrink-0">ADDRESS:</span>
                                <span className="max-w-[300px] leading-relaxed font-black">{AGENCY.address.toUpperCase()}</span>
                            </p>
                            <p className="flex items-center gap-2 uppercase tracking-wider">
                                <span className="w-16 text-slate-400">EMAIL:</span>
                                <span className="font-black">{AGENCY.email.toUpperCase()}</span>
                            </p>
                        </div>
                    </div>

                    <div className="w-64 text-right">
                        <div className="bg-slate-900 text-white p-4 mb-4 transform skew-x-[-10deg] shadow-lg">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1 opacity-70 italic font-mono">
                                {booking.booking_type === 'Ticket' ? 'Flight Ticket Receipt' :
                                    booking.booking_type === 'Visa' ? 'Visa Service Voucher' : 'Pack / Invoice No'}
                            </p>
                            <p className="text-2xl font-black italic tracking-tighter">{booking.invoice_no}</p>
                        </div>
                        <div className="space-y-1 text-[11px] font-black text-slate-950 pr-2">
                            {AGENCY.phones.map((p, i) => (
                                <p key={i} className="tracking-[0.1em] tabular-nums">
                                    {p}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-10">
                    <div className="text-[11px] font-black text-slate-900 bg-slate-100 px-4 py-2 border-l-4 border-slate-900 uppercase tracking-widest">
                        Date of Issue: {new Date(booking.created_at).toLocaleDateString('en-GB')}
                    </div>
                    <div className={`px-6 py-2 border-2 rounded-full text-xs font-black uppercase tracking-widest
                        ${balance === 0 ? 'bg-green-100 border-green-500 text-green-700 -rotate-3 shadow-sm' : 'bg-red-50 border-red-500/20 text-red-600 rotate-6 shadow-sm'}
                    `}>
                        {balance === 0 ? '✓ FULL PAYMENT RECEIVED' : `PENDING BALANCE: RS ${balance.toLocaleString()}`}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-10">
                    <div className="bg-slate-50 p-6 border-l-4 border-slate-900">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Client / Beneficiary</h4>
                        <p className="font-black text-xl text-slate-900">{booking.customers.full_name}</p>
                        <div className="mt-3 text-[11px] space-y-1 font-bold text-slate-600">
                            <p>TEL: {booking.customers.phone}</p>
                            {booking.customers.address && <p>LOC: {booking.customers.address}</p>}
                            {booking.customers.cnic_passport && <p>ID: {booking.customers.cnic_passport}</p>}
                        </div>
                    </div>
                    <div className="bg-slate-50 p-6 border-l-4 border-slate-900/20">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">
                            {booking.booking_type === 'Ticket' ? 'Flight Information' :
                                booking.booking_type === 'Visa' ? 'Visa Documentation' : 'Umrah Information'}
                        </h4>
                        <p className="font-black text-xl text-slate-900 uppercase tracking-tight">
                            {booking.booking_type === 'Ticket'
                                ? `${booking.airline_name || 'Flight'} (${booking.ticket_sector || 'N/A'})`
                                : booking.booking_type === 'Visa'
                                    ? `${booking.visa_country || 'Visa'} - ${booking.visa_profession || 'Entry'}`
                                    : (booking.packages?.title || "Custom Service")
                            }
                        </p>
                        <div className="mt-3 text-[11px] space-y-1 font-bold text-slate-600">
                            {booking.booking_type === 'Ticket' && (
                                <p className="text-slate-900 font-black">PNR NO: {booking.pnr_number || 'PENDING'}</p>
                            )}
                            {booking.booking_type === 'Visa' && (
                                <p className="text-slate-900 font-black italic underline">SERVICE: WORK VISA PROCESSING</p>
                            )}
                            <p>{booking.booking_type === 'Ticket' ? 'FLIGHT' : booking.booking_type === 'Visa' ? 'STAMPING' : 'TRAVEL'} DATE: {booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-GB') : "PENDING"}</p>
                            <p>STATUS: {booking.status.toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-4 text-slate-400 pb-2 border-b border-slate-100 italic">Financial Ledger Summary</h3>
                <table className="w-full mb-10">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            <th className="py-3 px-4 text-[10px] font-black uppercase text-left tracking-widest">Transaction Date</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase text-left tracking-widest">Payment Method</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase text-right tracking-widest">Amount Received</th>
                        </tr>
                    </thead>
                    <tbody className="text-[12px]">
                        {payments.filter(p => !p.voided).map(p => (
                            <tr key={p.id} className="border-b-2 border-slate-100 transition-colors hover:bg-slate-50">
                                <td className="py-5 px-4 font-black text-slate-800 uppercase">
                                    {new Date(p.payment_date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="py-5 px-4 text-slate-500 font-bold uppercase text-[10px]">{p.payment_method}</td>
                                <td className="py-5 px-4 font-black text-right text-base tracking-tighter">Rs {p.amount_paid.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-between items-center pr-4">
                    <div className="max-w-[40%] text-[9px] font-bold text-slate-400 italic leading-relaxed uppercase pr-8">
                        * This is a computer generated receipt. Please double check all PNR and Ticket details before leaving the office. Akbar Pura Travels is not responsible for errors not reported within 24 hours. No refund on passport stamping fees.
                    </div>
                    <div className="w-[350px] space-y-4">
                        <div className="flex justify-between items-center text-slate-400 border-b border-slate-50 pb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Total Group Value</span>
                            <span className="font-bold text-base">Rs {Number(booking.total_price).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-900 font-black border-b border-slate-900/10 pb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Received To Date</span>
                            <span className="text-xl">Rs {totalPaid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-5 px-6 bg-slate-900 text-white transform -skew-x-2 shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-white opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 1px, currentColor 1px, currentColor 2px)', backgroundSize: '4px 4px' }}></div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] italic z-10">Net Balance Due</span>
                            <span className="text-3xl font-black tracking-tighter drop-shadow-md z-10">Rs {balance.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-32 flex justify-between items-end px-4">
                    <div className="text-center">
                        <div className="w-56 border-b-2 border-slate-900 mb-2"></div>
                        <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest opacity-40">Client Acceptance Signature</p>
                    </div>
                    <div className="text-center relative">
                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-28 h-28 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center text-[8px] text-slate-200 font-black rotate-12 pointer-events-none uppercase tracking-tighter">OFFICIAL SEAL</div>
                        <div className="w-56 border-b-2 border-slate-900 mb-2 mx-auto"></div>
                        <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest opacity-40 italic font-mono">AUTHORIZED AGENT: {AGENCY.name.toUpperCase()}</p>
                    </div>
                </div>

                <div className="mt-24 border-t-2 border-slate-100 pt-6 text-center">
                    <p className="text-[8px] text-slate-400 uppercase tracking-[0.6em] font-black italic">
                        WWW.AKBARPURATRAVELS.COM • SYSTEM AUTHENTICATED DOCUMENT
                    </p>
                </div>
            </div>
        </div>
    );
}
