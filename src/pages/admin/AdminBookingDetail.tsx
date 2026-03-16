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
import { PaymentHistoryTable } from "@/components/admin/booking-detail/PaymentHistoryTable";
import { CustomerIdentityPanel } from "@/components/admin/booking-detail/CustomerIdentityPanel";
import { VisaWorkflowTracker } from "@/components/admin/booking-detail/VisaWorkflowTracker";
import { BookingStatusManager } from "@/components/admin/booking-detail/BookingStatusManager";

interface BookingDetail {
    id: string;
    invoice_no: string;
    customer_id: string;
    booking_type: 'Package' | 'Ticket' | 'Visa';
    total_price: number;
    travel_date: string | null;
    status: 'Draft' | 'Confirmed' | 'Completed' | 'Voided';
    pnr_number: string | null;
    airline_name: string | null;
    ticket_sector: string | null;
    visa_country: string | null;
    visa_profession: string | null;
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
        // 1. Fetch main booking record
        const { data: b, error: bError } = await (supabase.from("bookings" as any) as any)
            .select("*")
            .eq("id", id)
            .single();

        if (bError) {
            console.error("Error fetching booking:", bError);
            setLoading(false);
            return;
        }

        // 2. Fetch customer from safe view (anyone authenticated can read this)
        const { data: c } = await (supabase.from("customers_safe_view" as any) as any)
            .select("full_name, phone, address, cnic_passport:cnic_passport_masked")
            .eq("id", b.customer_id)
            .single();

        // 3. Fetch package if applicable
        let pkg = null;
        if (b.package_id) {
            const { data: p } = await (supabase.from("packages" as any) as any)
                .select("title, destination, duration")
                .eq("id", b.package_id)
                .single();
            pkg = p;
        }

        const { data: paymentsData } = await (supabase.from("payments" as any) as any)
            .select("*")
            .eq("booking_id", id)
            .order("payment_date", { ascending: true });

        const { data: agreementData } = await (supabase.from("booking_agreements" as any) as any)
            .select("*")
            .eq("booking_id", id)
            .single();

        if (b) {
            setBooking({
                ...b,
                customers: c || { full_name: "Deleted Customer", phone: "-", address: "-", cnic_passport: null },
                packages: pkg
            } as any);
            setEditMarginValue(String(b.margin || 0));
        }
        if (paymentsData) setPayments(paymentsData as any);
        if (agreementData) setAgreement(agreementData as any);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [id]);

    const handleToggleCnic = async () => {
        // Only fetch if revealing and we have the masked value currently
        if (!cnicRevealed && booking?.customer_id) {
            try {
                const { data, error } = await supabase.rpc('get_customer_pii' as any, {
                    p_customer_id: booking.customer_id
                });
                
                if (error) throw error;
                
                if (data && (data as any[]).length > 0) {
                    const pii = (data as any[])[0];
                    setBooking(prev => prev ? {
                        ...prev,
                        customers: {
                            ...prev.customers,
                            cnic_passport: pii.cnic_passport
                        }
                    } : null);
                }
            } catch (error: any) {
                console.error("Failed to reveal PII:", error);
                toast.error("Unauthorized: You do not have permission to view PII.");
                return; // don't toggle if fetch failed
            }
        }
        setCnicRevealed(v => !v);
    };

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
                            <BookingStatusManager
                                status={booking.status}
                                bookingType={booking.booking_type}
                                invoiceNo={booking.invoice_no}
                                role={role}
                                onStatusChange={handleStatusChange}
                            />
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
                            <VisaWorkflowTracker
                                booking={booking as any}
                                role={role}
                                onToggleStep={(key, curr) => toggleVisaStep(key as any, curr)}
                            />
                        )}

                        <PaymentHistoryTable
                            payments={payments}
                            totalPrice={booking.total_price}
                            balance={balance}
                            totalPaid={totalPaid}
                            role={role}
                            bookingStatus={booking.status}
                            margin={booking.margin}
                            payAmount={payAmount}
                            payMethod={payMethod}
                            payDate={payDate}
                            paying={paying}
                            onPayAmountChange={setPayAmount}
                            onPayMethodChange={setPayMethod}
                            onPayDateChange={setPayDate}
                            onSubmitPayment={handlePayment}
                            isEditingMargin={isEditingMargin}
                            editMarginValue={editMarginValue}
                            updatingMargin={updatingMargin}
                            onToggleMargin={() => setIsEditingMargin(!isEditingMargin)}
                            onMarginChange={setEditMarginValue}
                            onSaveMargin={handleUpdateMargin}
                            onOpenVoid={openVoidModal}
                            voidTargetId={voidTargetId}
                            voidReason={voidReason}
                            voiding={voiding}
                            onVoidReasonChange={setVoidReason}
                            onVoidConfirm={handleVoidConfirm}
                            onVoidCancel={() => setVoidTargetId(null)}
                        />
                    </div>

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

                        <CustomerIdentityPanel
                            customerName={booking.customers.full_name}
                            phone={booking.customers.phone}
                            address={booking.customers.address}
                            cnicPassport={booking.customers.cnic_passport}
                            role={role}
                            cnicRevealed={cnicRevealed}
                            onToggleCnic={handleToggleCnic}
                        />

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
