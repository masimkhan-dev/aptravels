import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import {
    ArrowLeft, Printer, DollarSign, Calendar, Eye, EyeOff, User,
    ShieldCheck, X, CheckCircle2, History, Loader2, Package, Plane, Ticket, FileText, Check, Globe,
    FileSignature, UploadCloud, Stamp, ExternalLink, ShieldAlert
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

    // Void Modal State
    const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
    const [voidReason, setVoidReason] = useState("");
    const [voiding, setVoiding] = useState(false);

    // CNIC Reveal State (PII protection)
    const [cnicRevealed, setCnicRevealed] = useState(false);

    // Agreement Upload Form state
    const [stampSerial, setStampSerial] = useState("");
    const [stampDate, setStampDate] = useState(new Date().toISOString().split('T')[0]);

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

        if (b) setBooking(b as any);
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
                            font-size: 9pt;
                            color: #0f172a;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        @page { 
                            size: A4; 
                            margin: 6mm; 
                        }
                        .invoice-container {
                            width: 100%;
                            max-height: 285mm;
                            display: flex;
                            flex-direction: column;
                        }
                        h1, h2, h3, h4 { page-break-after: avoid; }
                        tr { page-break-inside: avoid; }
                    }
                `}} />

                <div className="invoice-container">
                    {/* --- 🔳 TOP COLOR BAR --- */}
                    <div className="flex h-3 w-full mb-4">
                        <div className="w-2/3 bg-blue-900 rounded-l-full" />
                        <div className="w-1/3 bg-amber-500 rounded-r-full ml-1" />
                    </div>

                    {/* --- 🔳 HEADER SECTION --- */}
                    <div className="flex justify-between items-center mb-4 bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
                        <div className="flex items-center gap-5">
                            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                                <img src="/logo-main.png" alt="Logo" className="h-[55px] w-auto object-contain mix-blend-multiply" />
                            </div>
                            <div>
                                <h1 className="text-base font-black text-blue-900 leading-none mb-1 uppercase tracking-tight">
                                    {AGENCY.name}
                                </h1>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-2 opacity-80">{AGENCY.tagline}</p>
                                <div className="text-[8px] text-slate-500 font-bold leading-tight space-y-0.5">
                                    <p className="flex items-center gap-1.5"><span className="w-1 h-1 bg-amber-500 rounded-full" /> {AGENCY.address}</p>
                                    <p className="flex items-center gap-1.5"><span className="w-1 h-1 bg-blue-500 rounded-full" /> Phone: {AGENCY.phones.join(' | ')}</p>
                                    <p className="flex items-center gap-1.5"><span className="w-1 h-1 bg-blue-500 rounded-full" /> Email: {AGENCY.email}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-blue-900 text-white px-4 py-1.5 mb-2 inline-block rounded-lg shadow-md lg:shadow-none">
                                <p className="text-[7px] uppercase tracking-[0.2em] font-black text-blue-200">Official Invoice Ref</p>
                                <p className="text-sm font-black tracking-wider">{booking.invoice_no}</p>
                            </div>
                            <div className="mt-1">
                                <span className={`inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm border ${balance === 0 ? 'bg-green-500 text-white border-green-600' : 'bg-amber-500 text-white border-amber-600'}`}>
                                    {balance === 0 ? '✓ FULLY PAID' : 'PENDING SETTLEMENT'}
                                </span>
                            </div>
                            <p className="text-[9px] font-black text-blue-900/40 uppercase mt-2 tracking-tighter">Dated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* --- 🔳 INFO CARDS --- */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Bill To */}
                        <div className="border-l-4 border-blue-900 bg-blue-50/30 p-4 rounded-r-xl">
                            <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <span className="p-1 bg-blue-900 rounded text-white"><User className="w-3 h-3" /></span> Client Registration
                            </h3>
                            <div className="space-y-2 text-[9px]">
                                <p className="flex justify-between items-center"><span className="text-slate-400 font-bold uppercase">Beneficiary:</span> <span className="font-black text-blue-900 uppercase">{booking.customers.full_name}</span></p>
                                <p className="flex justify-between items-center"><span className="text-slate-400 font-bold uppercase">ID/Passport:</span> <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-100">{booking.customers.cnic_passport || 'NOT RECORDED'}</span></p>
                                <p className="flex justify-between items-center"><span className="text-slate-400 font-bold uppercase">Contact:</span> <span className="font-black text-slate-800">{booking.customers.phone}</span></p>
                            </div>
                        </div>

                        {/* Booking details */}
                        <div className="border-l-4 border-amber-500 bg-amber-50/30 p-4 rounded-r-xl">
                            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <span className="p-1 bg-amber-500 rounded text-white"><Package className="w-3 h-3" /></span> Booking Manifest
                            </h3>
                            <div className="space-y-2 text-[9px]">
                                <p className="flex justify-between items-center"><span className="text-slate-400 font-bold uppercase">Service Type:</span> <span className="font-black text-blue-900 bg-blue-100 px-2 py-0.5 rounded uppercase">{booking.booking_type}</span></p>
                                <p className="flex justify-between items-center"><span className="text-slate-400 font-bold uppercase">Tracking ID:</span> <span className="font-mono font-bold text-slate-700 uppercase tracking-tighter">{booking.id.slice(0, 15)}</span></p>
                                <p className="flex justify-between items-center"><span className="text-slate-400 font-bold uppercase">Departure:</span> <span className="font-black text-slate-900 flex items-center gap-1"><Calendar className="w-3 h-3 text-amber-500" /> {booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-GB') : 'TO BE CONFIRMED'}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* --- 🔳 SERVICE TABLE --- */}
                    <div className="mb-4 overflow-hidden rounded-xl border border-blue-100">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-blue-900 text-[8px] font-black text-blue-100 uppercase tracking-widest">
                                    <th className="p-2 text-left bg-blue-950">Description</th>
                                    <th className="p-2 text-left">Sector / Destination</th>
                                    <th className="p-2 text-left">Provider / Airline</th>
                                    <th className="p-2 text-left">PNR / Reference</th>
                                    <th className="p-2 text-center bg-amber-500 text-white">Travel Date</th>
                                </tr>
                            </thead>
                            <tbody className="text-[9px]">
                                <tr>
                                    <td className="p-3 font-black text-blue-900 border-b border-slate-100">
                                        {booking.booking_type === 'Ticket' ? (
                                            <div className="flex items-center gap-2"><Plane className="w-3 h-3" /> Air Ticket</div>
                                        ) : (
                                            <div className="flex items-center gap-2"><Globe className="w-3 h-3" /> Visa Processing</div>
                                        )}
                                    </td>
                                    <td className="p-3 font-black text-slate-900 uppercase border-b border-slate-100">
                                        {booking.booking_type === 'Ticket' ? (booking.ticket_sector || '-') : (booking.visa_country || '-')}
                                    </td>
                                    <td className="p-3 font-bold uppercase text-slate-600 border-b border-slate-100">
                                        {booking.booking_type === 'Ticket' ? (booking.airline_name || '-') : (booking.visa_profession || '-')}
                                    </td>
                                    <td className="p-3 font-black font-mono tracking-widest text-blue-700 uppercase border-b border-slate-100 bg-blue-50/10">
                                        {booking.pnr_number || 'PENDING'}
                                    </td>
                                    <td className="p-3 text-center font-black text-blue-900 border-b border-slate-100 bg-amber-50/20">
                                        {booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'TBC'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* --- 🔳 LEDGER TABLE --- */}
                    <div className="mb-4 overflow-hidden rounded-xl border border-slate-100">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">
                                    <th className="p-2 text-left">Payment Date</th>
                                    <th className="p-2 text-left">Transaction Method</th>
                                    <th className="p-2 text-center bg-green-600">Verification</th>
                                    <th className="p-2 text-right">Amount (PKR)</th>
                                </tr>
                            </thead>
                            <tbody className="text-[9px]">
                                {payments.filter(p => !p.voided).map((p, idx) => (
                                    <tr key={p.id} className={idx % 2 === 1 ? 'bg-blue-50/20' : 'bg-white'}>
                                        <td className="px-3 py-2 border-b border-slate-50 font-bold text-slate-500">{new Date(p.payment_date).toLocaleDateString('en-GB')}</td>
                                        <td className="px-3 py-2 border-b border-slate-50 font-black text-blue-900 uppercase tracking-tighter flex items-center gap-2">
                                            <DollarSign className="w-3 h-3 text-amber-500" /> {p.payment_method}
                                        </td>
                                        <td className="px-3 py-2 border-b border-slate-50 text-center">
                                            <span className="text-[7px] font-black uppercase px-3 py-0.5 bg-green-500 text-white rounded-full">✓ Confirmed</span>
                                        </td>
                                        <td className="px-3 py-2 border-b border-slate-50 text-right font-black text-blue-900">Rs {p.amount_paid.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {payments.filter(p => !p.voided).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-6 text-center text-slate-300 italic font-black text-xs uppercase tracking-widest">Registry Empty - No Transactions recorded.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* --- 🔳 SUMMARY & AUTHENTICATION --- */}
                    <div className="grid grid-cols-2 gap-8 mt-auto mb-4 items-end bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                        {/* Summary */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] px-2">
                                <span className="text-slate-400 font-black uppercase">Total Net Value:</span>
                                <span className="text-blue-900 font-black">Rs {Number(booking.total_price).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] px-2 text-green-600">
                                <span className="font-black uppercase tracking-tight">Total Settled Amount:</span>
                                <span className="font-black text-xs">Rs {totalPaid.toLocaleString()}</span>
                            </div>
                            <div className={`flex justify-between items-center px-4 py-3 rounded-2xl shadow-sm border-2 ${balance === 0 ? 'bg-green-600 border-green-700 text-white' : 'bg-blue-900 border-blue-950 text-white'}`}>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{balance === 0 ? 'BALANCE CLEARED' : 'REMAINING BALANCE:'}</span>
                                <span className="text-lg font-black tracking-tight">Rs {balance.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center relative">
                                <div className="border-t-2 border-slate-200 mt-12 pt-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Customer Sign</p>
                                </div>
                            </div>
                            <div className="text-center relative">
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-20 border-2 border-blue-900/10 rounded-full flex items-center justify-center opacity-40 rotate-[15deg]">
                                    <div className="w-16 h-16 border border-dashed border-blue-900/20 rounded-full flex flex-col items-center justify-center">
                                        <span className="text-[6px] font-black text-blue-900 leading-none">OFFICIAL</span>
                                        <span className="text-[6px] font-black text-amber-600">VERIFIED</span>
                                    </div>
                                </div>
                                <div className="border-t-2 border-blue-900 mt-12 pt-2">
                                    <p className="text-[8px] font-black text-blue-900 uppercase tracking-widest leading-none">Authorized Agent</p>
                                    <p className="text-[7px] font-black text-amber-600 mt-1 uppercase opacity-80">Akbarpura Int'l</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- 🔳 COMPLIANCE FOOTER --- */}
                    <div className="flex justify-between items-center bg-blue-900 p-4 rounded-2xl text-white">
                        <div className="max-w-[450px] flex items-center gap-3">
                            <div className="p-2 bg-blue-800 rounded-full"><ShieldCheck className="w-5 h-5 text-amber-400" /></div>
                            <div>
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-0.5">Legal Disclaimer:</h4>
                                <p className="text-[7px] font-bold leading-tight uppercase text-blue-100 opacity-80">
                                    System Document • Re-verify flight manifest 24h prior • Non-refundable post-issuance • Verified via registry hash • Issued by {AGENCY.name} HQ.
                                </p>
                            </div>
                        </div>
                        <div className="text-right border-l border-blue-800 pl-4">
                            <p className="text-[7px] font-black text-blue-400 uppercase tracking-[0.3em] mb-0.5">Registry Fingerprint</p>
                            <p className="text-[8px] font-mono text-white font-black">{booking.id.toUpperCase()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
