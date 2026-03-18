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

    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState("Cash");
    const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

    const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
    const [voidReason, setVoidReason] = useState("");
    const [voiding, setVoiding] = useState(false);

    const [cnicRevealed, setCnicRevealed] = useState(false);

    const [stampSerial, setStampSerial] = useState("");
    const [stampDate, setStampDate] = useState(new Date().toISOString().split('T')[0]);

    const [isEditingMargin, setIsEditingMargin] = useState(false);
    const [editMarginValue, setEditMarginValue] = useState("");
    const [updatingMargin, setUpdatingMargin] = useState(false);

    const fetchData = async () => {
        const { data: b, error: bError } = await (supabase.from("bookings" as any) as any)
            .select("*").eq("id", id).single();
        if (bError) { setLoading(false); return; }

        const { data: c } = await (supabase.from("customers_safe_view" as any) as any)
            .select("full_name, phone, address, cnic_passport:cnic_passport_masked")
            .eq("id", b.customer_id).single();

        let pkg = null;
        if (b.package_id) {
            const { data: p } = await (supabase.from("packages" as any) as any)
                .select("title, destination, duration").eq("id", b.package_id).single();
            pkg = p;
        }

        const { data: paymentsData } = await (supabase.from("payments" as any) as any)
            .select("*").eq("booking_id", id).order("payment_date", { ascending: true });

        const { data: agreementData } = await (supabase.from("booking_agreements" as any) as any)
            .select("*").eq("booking_id", id).single();

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
        if (!cnicRevealed && booking?.customer_id) {
            try {
                const { data, error } = await supabase.rpc('get_customer_pii' as any, { p_customer_id: booking.customer_id });
                if (error) throw error;
                if (data && (data as any[]).length > 0) {
                    const pii = (data as any[])[0];
                    setBooking(prev => prev ? { ...prev, customers: { ...prev.customers, cnic_passport: pii.cnic_passport } } : null);
                }
            } catch {
                toast.error("Unauthorized: You do not have permission to view PII.");
                return;
            }
        }
        setCnicRevealed(v => !v);
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(payAmount);
        if (!payAmount || amount <= 0) return;
        if (amount > balance) {
            toast.error(`Payment of Rs ${amount.toLocaleString()} exceeds the remaining balance of Rs ${balance.toLocaleString()}.`);
            return;
        }
        setPaying(true);
        const { error } = await (supabase.from("payments" as any) as any).insert({
            booking_id: id, amount_paid: amount, payment_method: payMethod,
            payment_date: payDate || new Date().toISOString()
        });
        if (error) {
            toast.error(error.message?.replace('CRITICAL_ERROR: ', '') || "Payment rejected.");
        } else {
            toast.success(`Rs ${amount.toLocaleString()} recorded successfully.`);
            setPayAmount("");
            fetchData();
        }
        setPaying(false);
    };

    const openVoidModal = (paymentId: string) => { setVoidTargetId(paymentId); setVoidReason(""); };

    const handleVoidConfirm = async () => {
        if (!voidTargetId || voidReason.trim().length < 10) { toast.error("Please provide a reason of at least 10 characters."); return; }
        setVoiding(true);
        const { error } = await (supabase.from("payments" as any) as any)
            .update({ voided: true, void_reason: voidReason.trim() }).eq("id", voidTargetId);
        if (error) { toast.error(error.message || "Failed to void payment."); }
        else { toast.success("Payment voided."); setVoidTargetId(null); fetchData(); }
        setVoiding(false);
    };

    const toggleVisaStep = async (step: keyof BookingDetail, currentVal: boolean) => {
        if (!booking) return;
        const { error } = await (supabase.from("bookings" as any) as any)
            .update({ [step]: !currentVal }).eq("id", id);
        if (!error) fetchData();
    };

    const handleAgreementRecord = async (serialNo: string, signedDate: string) => {
        if (!id || !serialNo) { toast.error("Please enter the Stamp Paper Serial Number"); return; }
        setRecordingAgreement(true);
        try {
            const { error: dbError } = await (supabase.from("booking_agreements" as any) as any).insert({
                booking_id: id, stamp_serial_no: serialNo, signed_date: signedDate,
                is_received: true, recorded_by: (await supabase.auth.getUser()).data.user?.id
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

    const handleStatusChange = async (newStatus: string) => {
        if (!booking || newStatus === booking.status) return;
        const { error } = await (supabase.from("bookings" as any) as any)
            .update({ status: newStatus }).eq("id", id);
        if (error) { toast.error(error.message || "Status change rejected."); }
        else { toast.success(`Booking status updated to ${newStatus}.`); fetchData(); }
    };

    const handleUpdateMargin = async () => {
        setUpdatingMargin(true);
        const { error } = await (supabase.from("bookings" as any) as any)
            .update({ margin: Number(editMarginValue) || 0 }).eq("id", id);
        if (error) { toast.error(error.message || "Failed to update margin."); }
        else { toast.success("Profit margin updated."); setIsEditingMargin(false); fetchData(); }
        setUpdatingMargin(false);
    };

    const totalPaid = payments.filter(p => !p.voided).reduce((s, p) => s + p.amount_paid, 0);
    const balance = (booking?.total_price || 0) - totalPaid;
    const validPayments = payments.filter(p => !p.voided);
    const invoiceNumber = booking?.invoice_no || `APT-${booking?.id.slice(0, 6).toUpperCase()}`;
    const verificationCode = `APT-${booking?.id.slice(0, 8).toUpperCase()}`;

    const paymentStatusBadge = balance <= 0
        ? <span style={{ background: '#166534', color: '#fff', fontSize: '7px', fontWeight: 700, padding: '3px 10px', borderRadius: '2px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Fully Paid</span>
        : totalPaid > 0
        ? <span style={{ background: '#92400e', color: '#fff', fontSize: '7px', fontWeight: 700, padding: '3px 10px', borderRadius: '2px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Partially Paid</span>
        : <span style={{ background: '#991b1b', color: '#fff', fontSize: '7px', fontWeight: 700, padding: '3px 10px', borderRadius: '2px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Unpaid</span>;

    // Screen badge (Tailwind — for non-print UI)
    const screenBadge = balance <= 0
        ? <span className="px-4 py-1.5 bg-green-500 text-white font-black text-xs rounded-lg uppercase tracking-widest shadow-sm">Fully Paid</span>
        : totalPaid > 0
        ? <span className="px-4 py-1.5 bg-amber-500 text-white font-black text-xs rounded-lg uppercase tracking-widest shadow-sm">Partially Paid</span>
        : <span className="px-4 py-1.5 bg-red-500 text-white font-black text-xs rounded-lg uppercase tracking-widest shadow-sm">Unpaid</span>;

    const visaSteps = [
        { key: 'visa_step_passport_received', label: 'Passport Received' },
        { key: 'visa_step_medical_cleared', label: 'Medical Cleared' },
        { key: 'visa_step_enumber_generated', label: 'E-Number Generated' },
        { key: 'visa_step_protector_stamp', label: 'Protector Stamp' },
        { key: 'visa_step_final_stamping', label: 'Final Stamping' },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-gold" />
            <p className="font-medium animate-pulse">Loading financial records...</p>
        </div>
    );
    if (!booking) return <div className="p-20 text-center text-destructive font-bold">Booking not found.</div>;

    return (
        <>
            {/* ── SCREEN UI (hidden on print) ── */}
            <div className="space-y-6 animate-in fade-in duration-700 max-w-5xl mx-auto pb-20 no-print">
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
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-gold-gradient text-secondary rounded-xl font-bold hover:opacity-90 transition-all shadow-gold">
                            <Printer className="w-5 h-5" /> Print Invoice
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
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

                    <div className="space-y-6 no-print">
                        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 opacity-[0.03] rotate-12">
                                <FileSignature className="w-full h-full text-gold" />
                            </div>
                            <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-black mb-4 flex items-center gap-2">
                                <Stamp className="w-3.5 h-3.5 text-gold" /> Legal Agreement (Ikrar Nama)
                            </h3>
                            {agreement ? (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/20">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] uppercase font-bold text-green-600 tracking-tighter flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Physically Received
                                            </span>
                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-green-500 text-white">In Office File</span>
                                        </div>
                                        <p className="text-xs font-mono font-black text-foreground mb-1">SN: {agreement.stamp_serial_no}</p>
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                            <Calendar className="w-3 h-3" /> Signed on: {new Date(agreement.signed_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
                                        <p className="text-[10px] text-muted-foreground font-medium italic">Agreement is safely stored in the office physical archives.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Stamp Serial Number (Physical)</label>
                                            <input type="text" placeholder="Enter number from paper"
                                                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-gold"
                                                value={stampSerial} onChange={e => setStampSerial(e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-black text-muted-foreground ml-1">Signature Date</label>
                                            <input type="date"
                                                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-gold"
                                                value={stampDate} onChange={e => setStampDate(e.target.value)} />
                                        </div>
                                    </div>
                                    <button onClick={() => handleAgreementRecord(stampSerial, stampDate)}
                                        disabled={recordingAgreement || !stampSerial}
                                        className="w-full py-3 bg-gold text-secondary rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                                        {recordingAgreement ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-4 h-4" />}
                                        {recordingAgreement ? "Recording..." : "Confirm Physical Receipt"}
                                    </button>
                                    <p className="text-[9px] text-muted-foreground text-center font-medium italic">This marks the paper as 'Locked' in office files.</p>
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
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> Flight Date</p>
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
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> Submission/Stamp Date</p>
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
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> Est. Travel Date</p>
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

            {/* ── PRINT INVOICE (A4) ── */}
            <div id="invoice-print-area" className="hidden print:block">
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        .no-print { display: none !important; }
                        #invoice-print-area { display: block !important; }
                        @page { size: A4; margin: 12mm; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                `}} />

                <div style={{ fontFamily: 'Arial, sans-serif', color: '#111', background: '#fff', maxWidth: '100%' }}>

                    {/* TOP GOLD BAR */}
                    <div style={{ height: '6px', background: '#c9a227', marginBottom: '0' }} />

                    {/* HEADER */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', alignItems: 'center', padding: '28px 36px 22px', borderBottom: '1px solid #ececec', gap: '12px' }}>
                        {/* Agency */}
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#0a0a0a', marginBottom: '8px' }}>{AGENCY.name}</div>
                            <div style={{ fontSize: '8.5px', color: '#777', lineHeight: '2', fontWeight: 400 }}>
                                <div>Head Office</div>
                                <div>{AGENCY.address}</div>
                                <div>{AGENCY.phones.join(' / ')}</div>
                                <div>{AGENCY.email}</div>
                            </div>
                        </div>
                        {/* Logo */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '68px', height: '68px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', boxShadow: '0 6px 12px rgba(0,0,0,0.15)' }}>
                                <img src="/logo-main.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            {paymentStatusBadge}
                        </div>
                        {/* Invoice meta */}
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '4px', textTransform: 'uppercase', color: '#0a0a0a', lineHeight: '1' }}>INVOICE</div>
                            <div style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', color: '#555', marginTop: '4px', letterSpacing: '0.5px' }}>#{invoiceNumber}</div>
                            <div style={{ marginTop: '12px', fontSize: '8.5px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Date: {new Date().toLocaleDateString('en-GB')}
                            </div>
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ececec' }}>
                                <div style={{ fontSize: '7.5px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verification Code</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: 700, color: '#666', marginTop: '1px' }}>{verificationCode}</div>
                            </div>
                        </div>
                    </div>

                    {/* CLIENT + SERVICE */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #ececec' }}>
                        <div style={{ padding: '20px 36px', borderRight: '1px solid #ececec' }}>
                            <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#c9a227', borderBottom: '1.5px solid #c9a227', paddingBottom: '5px', marginBottom: '12px' }}>Client Information</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ color: '#999', padding: '4px 0', width: '35%', fontWeight: 600 }}>Full Name</td>
                                        <td style={{ fontWeight: 700, textTransform: 'uppercase', color: '#111', padding: '4px 0' }}>{booking.customers.full_name}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#999', padding: '4px 0', fontWeight: 600 }}>CNIC / ID</td>
                                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#111', padding: '4px 0' }}>{booking.customers.cnic_passport || '---'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#999', padding: '4px 0', fontWeight: 600 }}>Phone</td>
                                        <td style={{ fontWeight: 700, color: '#111', padding: '4px 0' }}>{booking.customers.phone}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#999', padding: '4px 0', fontWeight: 600 }}>Address</td>
                                        <td style={{ fontWeight: 600, color: '#444', padding: '4px 0', fontSize: '8.5px' }}>{booking.customers.address || '---'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '20px 36px' }}>
                            <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#c9a227', borderBottom: '1.5px solid #c9a227', paddingBottom: '5px', marginBottom: '12px' }}>Service Summary</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ color: '#999', padding: '4px 0', width: '35%', fontWeight: 600 }}>Service</td>
                                        <td style={{ padding: '4px 0' }}>
                                            <span style={{ border: '1.5px solid #111', fontWeight: 900, fontSize: '7.5px', textTransform: 'uppercase', padding: '2px 9px', letterSpacing: '0.5px' }}>{booking.booking_type}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#999', padding: '4px 0', fontWeight: 600 }}>File ID</td>
                                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#111', padding: '4px 0' }}>{booking.id.slice(0, 8).toUpperCase()}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#999', padding: '4px 0', fontWeight: 600 }}>Invoice No</td>
                                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#111', padding: '4px 0' }}>{invoiceNumber}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#999', padding: '4px 0', fontWeight: 600 }}>Travel Date</td>
                                        <td style={{ fontWeight: 700, color: '#111', padding: '4px 0' }}>
                                            {booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Pending'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SERVICE DETAILS TABLE */}
                    <div style={{ padding: '0 36px', borderBottom: '1px solid #ececec' }}>
                        <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#c9a227', marginTop: '18px', marginBottom: '10px' }}>Service Details</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                            <thead>
                                <tr style={{ background: '#faf7ee', borderTop: '1px solid #e8ddb5', borderBottom: '1.5px solid #c9a227' }}>
                                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Service Type</th>
                                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>
                                        {booking.booking_type === 'Ticket' ? 'Sector' : booking.booking_type === 'Visa' ? 'Country' : 'Destination'}
                                    </th>
                                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>
                                        {booking.booking_type === 'Ticket' ? 'Airline' : booking.booking_type === 'Visa' ? 'Profession' : 'Package'}
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Travel Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '10px 10px', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', color: '#111' }}>{booking.booking_type}</td>
                                    <td style={{ padding: '10px 10px', fontWeight: 700, textTransform: 'uppercase', color: '#111' }}>
                                        {booking.booking_type === 'Ticket' ? (booking.ticket_sector || '-') : booking.booking_type === 'Visa' ? (booking.visa_country || '-') : (booking.packages?.destination || '-')}
                                    </td>
                                    <td style={{ padding: '10px 10px', fontWeight: 600, color: '#333' }}>
                                        {booking.booking_type === 'Ticket' ? (booking.airline_name || '-') : booking.booking_type === 'Visa' ? (booking.visa_profession || '-') : (booking.packages?.title || '-')}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '10px 10px', fontWeight: 700, color: '#111' }}>
                                        {booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-GB') : 'Pending'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* PAYMENT HISTORY */}
                    <div style={{ padding: '0 36px', borderBottom: '1px solid #ececec' }}>
                        <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#c9a227', marginTop: '18px', marginBottom: '10px' }}>Payment History</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                            <thead>
                                <tr style={{ background: '#faf7ee', borderTop: '1px solid #e8ddb5', borderBottom: '1.5px solid #c9a227' }}>
                                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>#</th>
                                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Payment Date</th>
                                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Method</th>
                                    <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Amount (PKR)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {validPayments.map((p, i) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? '#fff' : '#fdfdfb' }}>
                                        <td style={{ padding: '8px 10px', color: '#bbb', fontSize: '8px' }}>{String(i + 1).padStart(2, '0')}</td>
                                        <td style={{ padding: '8px 10px', color: '#444', fontWeight: 600 }}>{new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td style={{ padding: '8px 10px', fontWeight: 700, textTransform: 'uppercase', color: '#333', fontSize: '8.5px' }}>{p.payment_method}</td>
                                        <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 900, fontFamily: 'monospace', color: '#111' }}>PKR {p.amount_paid.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {validPayments.length === 0 && (
                                    <tr><td colSpan={4} style={{ padding: '16px 10px', textAlign: 'center', color: '#aaa', fontStyle: 'italic', fontSize: '9px' }}>No payments on record.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* TOTALS + SIGNATURES */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '22px 36px 26px', borderBottom: '1px solid #ececec' }}>
                        {/* Financial summary */}
                        <div style={{ paddingRight: '24px' }}>
                            <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#c9a227', borderBottom: '1.5px solid #c9a227', paddingBottom: '5px', marginBottom: '12px' }}>Financial Summary</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dashed #eee' }}>
                                <span style={{ color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Total Invoice Value</span>
                                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#111' }}>PKR {Number(booking.total_price).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dashed #eee' }}>
                                <span style={{ color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Received</span>
                                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#166534' }}>PKR {totalPaid.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#111' }}>Balance Due</span>
                                <span style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', color: balance > 0 ? '#991b1b' : '#166534' }}>PKR {balance.toLocaleString()}</span>
                            </div>
                        </div>
                        {/* Signatures */}
                        <div style={{ paddingLeft: '24px', borderLeft: '1px solid #ececec', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'end' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ height: '48px' }} />
                                <div style={{ borderTop: '1px solid #333', paddingTop: '7px' }}>
                                    <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555' }}>Customer Signature</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ height: '48px' }} />
                                <div style={{ borderTop: '1px solid #333', paddingTop: '7px' }}>
                                    <div style={{ fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555' }}>Authorized Signature</div>
                                    <div style={{ fontSize: '7px', color: '#bbb', fontStyle: 'italic', marginTop: '2px' }}>Official stamp required</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div style={{ padding: '14px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#aaa' }}>
                            Thank you for choosing {AGENCY.name}
                        </div>
                        <div style={{ fontSize: '7.5px', color: '#ccc', fontFamily: 'monospace' }}>{verificationCode}</div>
                    </div>

                    {/* BOTTOM GOLD BAR */}
                    <div style={{ height: '4px', background: '#c9a227' }} />
                </div>
            </div>
        </>
    );
}
