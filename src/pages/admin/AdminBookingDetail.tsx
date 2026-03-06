import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import {
    ArrowLeft, Printer, DollarSign, Calendar, Eye, EyeOff, User,
    ShieldCheck, X, CheckCircle2, History, Loader2, Package, Plane, Ticket, FileText, Check, Globe,
    FileSignature, UploadCloud, Stamp, ExternalLink, ShieldAlert, TrendingUp
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
    margin: number | null;
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

interface Agreement {
    id: string;
    storage_path: string;
    stamp_serial_no: string;
    signed_date: string;
    status: 'pending' | 'verified' | 'rejected';
    file_hash: string;
}

export default function AdminBookingDetail() {
    const { id } = useParams();
    const { role } = useRole();
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [agreement, setAgreement] = useState<Agreement | null>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [recordingAgreement, setRecordingAgreement] = useState(false);

    // Payment Form
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState("Cash");
    const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

    // Void Modal State
    const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
    const [voidReason, setVoidReason] = useState("");
    const [voiding, setVoiding] = useState(false);

    // CNIC Reveal State (PII protection)
    const [cnicRevealed, setCnicRevealed] = useState(false);

    // Agreement Upload Form state
    const [stampSerial, setStampSerial] = useState("");
    const [stampDate, setStampDate] = useState(new Date().toISOString().split('T')[0]);

    // Margin Editing
    const [isEditingMargin, setIsEditingMargin] = useState(false);
    const [editMarginValue, setEditMarginValue] = useState("");
    const [updatingMargin, setUpdatingMargin] = useState(false);

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

        const { data: a } = await (supabase.from("booking_agreements" as any) as any)
            .select("*")
            .eq("booking_id", id)
            .single();

        if (b) {
            setBooking(b as any);
            setEditMarginValue(String(b.margin || 0));
        }
        if (p) setPayments(p as any);
        if (a) setAgreement(a as any);
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
            payment_date: payDate || new Date().toISOString()
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

    const handleAgreementRecord = async (serialNo: string, signedDate: string) => {
        if (!id || !serialNo) {
            toast.error("Please enter the Stamp Paper Serial Number");
            return;
        }
        setRecordingAgreement(true);

        try {
            const { error: dbError } = await (supabase.from("booking_agreements" as any) as any).insert({
                booking_id: id,
                stamp_serial_no: serialNo,
                signed_date: signedDate,
                is_received: true,
                recorded_by: (await supabase.auth.getUser()).data.user?.id
            });

            if (dbError) throw dbError;

            toast.success("Physical Agreement recorded in system");
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Failed to record agreement");
        } finally {
            setRecordingAgreement(false);
        }
    };

    // Remove viewAgreement as images are no longer stored

    const totalPaid = payments.filter(p => !p.voided).reduce((s, p) => s + p.amount_paid, 0);
    const balance = (booking?.total_price || 0) - totalPaid;

    // --- 💎 INVOICE THEME SYSTEM (Dubai-Grade Architecture) ---
    const BRAND = {
        primary: "yellow-500",
        primaryDark: "yellow-600",
        primaryLight: "yellow-100",
        border: "border-slate-950",
        bgHeader: "bg-slate-50",
        textTitle: "text-slate-950",
        textBody: "text-gray-800"
    };

    const validPayments = payments.filter(p => !p.voided);
    const invoiceNumber = booking?.invoice_no || `APT-${booking?.id.slice(0, 6).toUpperCase()}`;
    const verificationCode = `APT-${booking?.id.slice(0, 8).toUpperCase()}`;

    // Status Badge Logic
    const paymentStatusBadge = balance <= 0 ? (
        <span className="px-4 py-1.5 bg-green-500 text-white font-black text-xs rounded-lg uppercase tracking-widest shadow-sm">Fully Paid</span>
    ) : totalPaid > 0 ? (
        <span className="px-4 py-1.5 bg-amber-500 text-white font-black text-xs rounded-lg uppercase tracking-widest shadow-sm">Partially Paid</span>
    ) : (
        <span className="px-4 py-1.5 bg-red-500 text-white font-black text-xs rounded-lg uppercase tracking-widest shadow-sm">Unpaid</span>
    );

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

    const handleUpdateMargin = async () => {
        setUpdatingMargin(true);
        const { error } = await (supabase
            .from("bookings" as any) as any)
            .update({ margin: Number(editMarginValue) || 0 })
            .eq("id", id);

        if (error) {
            toast.error(error.message || "Failed to update margin.");
        } else {
            toast.success("Profit margin updated.");
            setIsEditingMargin(false);
            fetchData();
        }
        setUpdatingMargin(false);
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
        <>
            <div className="space-y-6 animate-in fade-in duration-700 max-w-5xl mx-auto pb-20 no-print">
                {/* Header UI (Hidden in Print) */}
                <div className="mb-8">
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
                    <div className="lg:col-span-2 space-y-6">

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
                                                    ? 'bg-emerald-600 border-emerald-600 shadow-lg shadow-emerald-500/20 translate-y-[-2px]'
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

                                                {/* Subtle glass effect for active cards */}
                                                {isDone && <div className="absolute top-0 left-[-100%] w-full h-full bg-white/10 skew-x-[-20deg] group-hover:left-[100%] transition-all duration-1000" />}
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

                            {(role === 'admin' || role === 'manager') && booking.margin !== undefined && (
                                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 m-6 mb-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2 text-emerald-600">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Profit Margin</span>
                                        </div>
                                        <button
                                            onClick={() => setIsEditingMargin(!isEditingMargin)}
                                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tight"
                                        >
                                            {isEditingMargin ? "Cancel" : "Edit Margin"}
                                        </button>
                                    </div>

                                    {isEditingMargin ? (
                                        <div className="flex gap-2 mt-2">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 text-[10px] font-black">Rs</span>
                                                <input
                                                    type="number"
                                                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-emerald-200 bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-emerald-700"
                                                    value={editMarginValue}
                                                    onChange={e => setEditMarginValue(e.target.value)}
                                                />
                                            </div>
                                            <button
                                                onClick={handleUpdateMargin}
                                                disabled={updatingMargin}
                                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2"
                                            >
                                                {updatingMargin ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                Save
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-xl font-black text-emerald-700">Rs {Number(booking.margin || 0).toLocaleString()}</p>
                                    )}
                                </div>
                            )}

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
                                <form onSubmit={handlePayment} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                    <input
                                        type="date"
                                        className="px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-gold text-sm"
                                        value={payDate}
                                        onChange={e => setPayDate(e.target.value)}
                                    />
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

                    {/* Void Payment Modal (Needs to be inside the main container but outside the columns or just handled properly) */}
                    {voidTargetId && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                            <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                                <div className="p-6 border-b border-border bg-destructive/5 flex items-center justify-between">
                                    <div className="flex-1">
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
                        {/* Legal Agreement Card (Smart Proof) */}
                        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 opacity-[0.03] rotate-12">
                                <FileSignature className="w-full h-full text-gold" />
                            </div>

                            <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-black mb-4 flex items-center gap-2">
                                <Stamp className="w-3.5 h-3.5 text-gold" /> Legal Agreement (Ikrar Nama)
                            </h3>

                            {agreement ? (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/20 relative">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] uppercase font-bold text-green-600 tracking-tighter flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Physically Received
                                            </span>
                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-green-500 text-white">
                                                In Office File
                                            </span>
                                        </div>
                                        <p className="text-xs font-mono font-black text-foreground mb-1">SN: {agreement.stamp_serial_no}</p>
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                            <Calendar className="w-3 h-3" /> Signed on: {new Date(agreement.signed_date).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
                                        <p className="text-[10px] text-muted-foreground font-medium italic">
                                            Agreement is safely stored in the office physical archives.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Stamp Serial Number (Physical)</label>
                                            <input
                                                type="text"
                                                placeholder="Enter number from paper"
                                                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-gold"
                                                value={stampSerial}
                                                onChange={e => setStampSerial(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Signature Date</label>
                                            <input
                                                type="date"
                                                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-gold"
                                                value={stampDate}
                                                onChange={e => setStampDate(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleAgreementRecord(stampSerial, stampDate)}
                                        disabled={recordingAgreement || !stampSerial}
                                        className="w-full py-3 bg-gold text-secondary rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {recordingAgreement ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-4 h-4" />}
                                        {recordingAgreement ? "Recording..." : "Confirm Physical Receipt"}
                                    </button>

                                    <p className="text-[9px] text-muted-foreground text-center font-medium italic">
                                        This marks the paper as 'Locked' in office files.
                                    </p>
                                </div>
                            )}
                        </div>

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
                                    <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1">
                                            <Calendar className="w-2.5 h-2.5" /> Flight Date
                                        </p>
                                        <p className="font-bold text-xs text-foreground">{booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : "Not Assigned"}</p>
                                    </div>
                                </div>
                            ) : booking.booking_type === 'Visa' ? (
                                <div className="space-y-4">
                                    <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-100">
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
            </div>

            {/* --- CORPORATE GRADE INVOICE (A4 OPTIMIZED) --- */}
            <div id="invoice-print-area" className="hidden print:block bg-white text-slate-900 font-sans">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        .no-print { display: none !important; }
                        #invoice-print-area { 
                            display: block !important;
                            width: 100%;
                            padding: 0;
                            margin: 0;
                            font-size: 10pt;
                            color: #000;
                            background: #fff !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        @page { 
                            size: A4; 
                            margin: 10mm; 
                        }
                        .invoice-container {
                            width: 100%;
                            background: #fff !important;
                        }
                        * { 
                            background-color: transparent !important;
                            color: #000 !important;
                            box-shadow: none !important;
                            text-shadow: none !important;
                            filter: none !important;
                        }
                        .print-border { border: 1px solid #000 !important; }
                        .text-bold { font-weight: 900 !important; }
                        .text-large { font-size: 14pt !important; }
                    }
                `}} />

                <div className="invoice-container">
                    {/* --- 🔳 TOP BORDER --- */}
                    <div className={`h-1.5 w-full bg-gradient-to-r from-${BRAND.primary} via-amber-500 to-${BRAND.primaryDark} mb-6`} />

                    {/* --- 🔳 HEADER SECTION (GRID BASED FOR PRINT STABILITY) --- */}
                    <div className="grid grid-cols-3 items-start mb-8 p-0 gap-4">
                        {/* Company Identity */}
                        <div className="text-left col-span-1">
                            <h1 className="text-lg font-black text-black leading-tight mb-2 uppercase tracking-tight">
                                {AGENCY.name}
                            </h1>
                            <div className="text-[8px] text-black space-y-0.5 font-medium">
                                <p className="opacity-70">HEAD OFFICE</p>
                                <p>{AGENCY.address}</p>
                                <p>{AGENCY.phones.join(' / ')}</p>
                                <p>{AGENCY.email}</p>
                            </div>
                        </div>

                        {/* Branding & Logo */}
                        <div className="flex flex-col items-center justify-center col-span-1">
                            <div className="w-28 h-28 rounded-full shadow-2xl flex items-center justify-center bg-white overflow-hidden p-3 mb-2">
                                <img
                                    src="/logo-main.png"
                                    alt="Agency Logo"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            {paymentStatusBadge}
                        </div>

                        {/* Invoice Meta */}
                        <div className="text-right col-span-1">
                            <h2 className={`text-3xl font-black uppercase tracking-widest mb-1 ${BRAND.textTitle}`}>INVOICE</h2>
                            <p className="text-md font-black font-mono">#{invoiceNumber}</p>
                            <p className="text-[10px] mt-2 font-bold uppercase tracking-widest">Date: {new Date().toLocaleDateString('en-GB')}</p>
                            <div className="mt-4 pt-2 border-t border-gray-200">
                                <p className="text-[8px] font-bold text-gray-500 uppercase">Verification Code</p>
                                <p className="text-[10px] font-mono font-black">{verificationCode}</p>
                            </div>
                        </div>
                    </div>

                    {/* --- 🔳 INFO CARDS --- */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        {/* Bill To */}
                        <div className={`p-0 border-t-2 ${BRAND.border} pt-4`}>
                            <h3 className={`text-[10px] font-black uppercase tracking-[1px] mb-4 ${BRAND.textTitle}`}>CLIENT INFORMATION</h3>
                            <div className="space-y-2 text-[10px]">
                                <p className="flex justify-between items-center"><span className="font-bold">NAME:</span> <span className="font-black uppercase">{booking.customers.full_name}</span></p>
                                <p className="flex justify-between items-center"><span className="font-bold">ID / PASSPORT:</span> <span className="font-mono font-bold">{booking.customers.cnic_passport || '---'}</span></p>
                                <p className="flex justify-between items-center"><span className="font-bold">PHONE:</span> <span className="font-black">{booking.customers.phone}</span></p>
                            </div>
                        </div>

                        {/* Booking details */}
                        <div className={`p-0 border-t-2 ${BRAND.border} pt-4`}>
                            <h3 className={`text-[10px] font-black uppercase tracking-[1px] mb-4 ${BRAND.textTitle}`}>SERVICE SUMMARY</h3>
                            <div className="space-y-2 text-[10px]">
                                <p className="flex justify-between items-center"><span className="font-bold">SERVICE:</span> <span className={`font-black uppercase border ${BRAND.border} px-2 bg-slate-50`}>{booking.booking_type}</span></p>
                                <p className="flex justify-between items-center"><span className="font-bold">FILE ID:</span> <span className="font-mono font-bold uppercase">{booking.id.slice(0, 8).toUpperCase()}</span></p>
                                <p className="flex justify-between items-center"><span className="font-bold">TRAVEL DATE:</span> <span className="font-black">{booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-GB') : 'PENDING'}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* --- 🔳 SERVICE TABLE --- */}
                    <div className={`mb-6 overflow-hidden border ${BRAND.border}`}>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className={`border-b ${BRAND.border} text-[9px] font-black uppercase ${BRAND.bgHeader} ${BRAND.textBody}`}>
                                    <th className="p-3 text-left">SERVICE / ITEM</th>
                                    <th className="p-3 text-left">SECTOR / COUNTRY</th>
                                    <th className="p-3 text-left">AIRLINE / JOB TITLE</th>
                                    <th className="p-3 text-center">TRAVEL DATE</th>
                                </tr>
                            </thead>
                            <tbody className="text-[10px]">
                                <tr className={`border-b ${BRAND.border}`}>
                                    <td className="p-3 font-black uppercase">
                                        {booking.booking_type}
                                    </td>
                                    <td className="p-3 font-bold uppercase">
                                        {booking.booking_type === 'Ticket' ? (booking.ticket_sector || '-') : (booking.visa_country === 'SAUDI ARABI' || booking.visa_country === 'SAUDIA ARABI' ? 'SAUDI ARABIA' : booking.visa_country || '-')}
                                    </td>
                                    <td className="p-3 font-bold uppercase">
                                        {booking.booking_type === 'Ticket' ? (booking.airline_name || '-') : (booking.visa_profession || '-')}
                                    </td>
                                    <td className="p-3 text-center font-black">
                                        {booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-GB') : 'PENDING'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className={`mb-8 overflow-hidden border ${BRAND.border}`}>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className={`border-b ${BRAND.border} text-[9px] font-black uppercase ${BRAND.bgHeader} ${BRAND.textBody}`}>
                                    <th className="p-2 text-left">PAYMENT DATE</th>
                                    <th className="p-2 text-left">METHOD</th>
                                    <th className="p-2 text-right">AMOUNT (PKR)</th>
                                </tr>
                            </thead>
                            <tbody className="text-[10px]">
                                {validPayments.map((p) => (
                                    <tr key={p.id} className={`border-b ${BRAND.border}`}>
                                        <td className="px-3 py-2 font-bold">{new Date(p.payment_date).toLocaleDateString('en-GB')}</td>
                                        <td className="px-3 py-2 font-black uppercase">{p.payment_method}</td>
                                        <td className="px-3 py-2 text-right font-black font-mono">PKR {p.amount_paid.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {validPayments.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-6 text-center italic font-black text-xs uppercase tracking-widest text-gray-400">No payments recorded in history.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mt-auto mb-8 items-end p-0">
                        {/* Summary */}
                        <div className={`space-y-2 border-t-2 ${BRAND.border} pt-4`}>
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold uppercase tracking-tight">Total Quote Value:</span>
                                <span className="font-black">PKR {Number(booking.total_price).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold uppercase tracking-tight text-emerald-600">Total Received So Far:</span>
                                <span className="font-black text-emerald-600">PKR {totalPaid.toLocaleString()}</span>
                            </div>
                            <div className={`flex justify-between items-center pt-2 border-t ${BRAND.border}`}>
                                <span className="text-[12px] font-black uppercase">REMAINING BALANCE:</span>
                                <span className={`text-xl font-black ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                                    PKR {balance.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Signatures & Stamp Area */}
                        <div className="grid grid-cols-2 gap-8 text-center items-end">
                            <div className="relative">
                                {/* Digital Watermark/Stamp Area */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none -mt-4">
                                    <div className={`w-24 h-24 border-4 ${BRAND.border} rounded-full flex items-center justify-center rotate-12`}>
                                        <span className="text-[10px] font-black uppercase tracking-tight leading-none px-2">{AGENCY.name.slice(0, 15)}...</span>
                                    </div>
                                </div>
                                <div className={`border-t ${BRAND.border} mt-16 pt-2`}>
                                    <p className="text-[9px] font-black uppercase">Customer Signature</p>
                                </div>
                            </div>
                            <div className="relative">
                                <div className={`border-t ${BRAND.border} mt-16 pt-2`}>
                                    <p className="text-[9px] font-black uppercase">Authorize Signature</p>
                                    <p className="text-[6px] text-gray-400 mt-1 uppercase italic">(Official Stamp Required)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- 🔳 FOOTER DIVIDER & MESSAGE --- */}
                    <div className={`mt-6 border-t ${BRAND.border} pt-3 text-[10px] text-gray-500 text-center font-bold uppercase tracking-widest`}>
                        Thank you for choosing Akbar Pura International Travels & Tours
                    </div>
                </div>
            </div>
        </>
    );
}
