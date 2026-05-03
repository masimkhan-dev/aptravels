import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    PlusCircle, Loader2, ArrowUpRight, ArrowDownLeft,
    Wallet, History, X, User, Receipt, RotateCcw, FileText, Download, Printer
} from "lucide-react";
import { AgentStatementPrint } from "@/components/admin/AgentStatementPrint";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Agent {
    id: string;
    name: string;
}

interface Booking {
    id: string;
    invoice_no: string;
    customer_name: string;
    total_price: number;
    total_paid: number;
    margin: number;
    supplier_cost: number;
}

interface AgentTransaction {
    id: string;
    agent_id: string;
    agent_name?: string;
    booking_id: string | null;
    invoice_no?: string;
    customer_name?: string;
    amount: number;
    direction: 'SEND' | 'RECEIVE';
    account_type: 'CASH' | 'BANK';
    notes: string | null;
    performed_at: string;
    is_reversal?: boolean;
    reversal_of?: string | null;
}

const EMPTY_FORM = {
    agent_id: "",
    booking_id: "",
    amount: "",
    direction: "RECEIVE" as "SEND" | "RECEIVE",
    account_type: "CASH" as "CASH" | "BANK",
    notes: ""
};

export default function AdminAgentLedger() {
    const [transactions, setTransactions] = useState<AgentTransaction[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [selectedAgentBalance, setSelectedAgentBalance] = useState<number | null>(null);
    const [alreadySentForBooking, setAlreadySentForBooking] = useState<number>(0);
    const [reversalTarget, setReversalTarget] = useState<AgentTransaction | null>(null);

    // Filters
    const [filterAgent, setFilterAgent] = useState<string>("all");

    // Statement State
    const [statementData, setStatementData] = useState<any[]>([]);
    const [statementLoading, setStatementLoading] = useState(false);
    const [showStatement, setShowStatement] = useState(false);
    const [statementAgentName, setStatementAgentName] = useState("");
 
    const handlePrint = () => window.print();
    const selectedAgentObj = agents.find(a => a.id === filterAgent);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Agents
            const { data: agentsData } = await supabase.from("agents" as any).select("id, name").order("name");
            const parsedAgents: Agent[] = (agentsData as any)?.map((a: any) => ({ id: a.id, name: a.name })) || [];
            setAgents(parsedAgents);

            // Fetch Transactions (with joins)
            let txQuery = supabase
                .from("agent_transactions" as any)
                .select(`
                    *,
                    agents:agent_id(name)
                `)
                .order("performed_at", { ascending: false });

            if (filterAgent !== "all") {
                txQuery = txQuery.eq("agent_id", filterAgent);
            }

            const { data: txData } = await txQuery.limit(50);
            
            // Fetch Booking details separately from safe view
            const bookingIds = Array.from(new Set(txData?.filter((t: any) => t.booking_id).map((t: any) => t.booking_id) || []));
            let bookingDetails: any[] = [];
            
            if (bookingIds.length > 0) {
                const { data: bDetails } = await supabase
                    .from("booking_ledger_view" as any)
                    .select("booking_id, invoice_no, customer_name")
                    .in("booking_id", bookingIds);
                bookingDetails = bDetails || [];
            }
            
            const bookingMap = new Map();
            bookingDetails.forEach((b: any) => bookingMap.set(b.booking_id, b));

            setTransactions(txData?.map((tx: any) => ({
                ...tx,
                agent_name: tx.agents?.name,
                invoice_no: bookingMap.get(tx.booking_id)?.invoice_no,
                customer_name: bookingMap.get(tx.booking_id)?.customer_name
            })) || []);

            // Fetch Bookings (for links) via the safe view
            const { data: bData } = await supabase
                .from("booking_ledger_view" as any)
                .select("booking_id, invoice_no, customer_name, total_price, total_paid")
                .eq("status", "Confirmed");

            const { data: bMargins } = await supabase
                .from("bookings")
                .select("id, margin")
                .in("id", bData?.map((b: any) => b.booking_id) || []);

            const marginMap = new Map();
            bMargins?.forEach((m: any) => marginMap.set(m.id, m.margin || 0));

            setBookings(bData?.map((b: any) => {
                const sp_cost = (b.total_price || 0) - (marginMap.get(b.booking_id) || 0);
                return {
                    id: b.booking_id,
                    invoice_no: b.invoice_no,
                    customer_name: b.customer_name,
                    total_price: b.total_price || 0,
                    total_paid: b.total_paid || 0,
                    margin: marginMap.get(b.booking_id) || 0,
                    supplier_cost: sp_cost
                };
            }) || []);

        } catch (error: any) {
            toast.error("Failed to load ledger data.");
        } finally {
            setLoading(false);
        }
    }, [filterAgent]);

    const fetchAgentBalance = async (agentId: string) => {
        if (!agentId) {
            setSelectedAgentBalance(null);
            return;
        }
        const { data } = await supabase
            .from("agent_balances" as any)
            .select("balance")
            .eq("agent_id", agentId)
            .maybeSingle();
        setSelectedAgentBalance((data as any)?.balance || 0);
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchAgentBalance(form.agent_id);
    }, [form.agent_id]);

    useEffect(() => {
        const fetchSentForBooking = async () => {
            if (!form.booking_id || form.booking_id === 'none') {
                setAlreadySentForBooking(0);
                return;
            }
            const { data } = await supabase
                .from('agent_transactions' as any)
                .select('amount, direction')
                .eq('booking_id', form.booking_id);
            const sent = (data as any[])?.reduce((sum: number, tx: any) => {
                if (tx.direction === 'SEND') return sum + (tx.amount || 0);
                if (tx.direction === 'RECEIVE') return sum - (tx.amount || 0);
                return sum;
            }, 0) ?? 0;
            setAlreadySentForBooking(Math.max(0, sent));
        };
        fetchSentForBooking();
    }, [form.booking_id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!form.agent_id) return toast.error("Please select an agent.");
        if (!form.amount || isNaN(Number(form.amount))) return toast.error("Invalid amount.");

        const bookingId = (form.booking_id && form.booking_id !== "none") ? form.booking_id : null;

        if (form.direction === "SEND" && !bookingId) {
            return toast.error("Booking link is mandatory for SEND operations.");
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from("agent_transactions" as any)
                .insert([{
                    agent_id: form.agent_id,
                    booking_id: bookingId,
                    amount: Number(form.amount),
                    direction: form.direction,
                    account_type: form.account_type,
                    notes: form.notes
                }]);

            if (error) throw error;

            toast.success("Transaction recorded safely", {
                description: `Settlement of Rs ${Number(form.amount).toLocaleString()} has been posted. The agent ledger and cash accounts have been updated successfully.`,
                duration: 5000,
            });
            setShowForm(false);
            setForm({ ...EMPTY_FORM });
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Failed to record transaction.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReversal = async (tx: AgentTransaction) => {
        setReversalTarget(tx);
    };

    const confirmReversal = async () => {
        if (!reversalTarget) return;
        const tx = reversalTarget;
        setReversalTarget(null);
        try {
            const { error } = await supabase
                .from("agent_transactions" as any)
                .insert([{
                    agent_id: tx.agent_id,
                    booking_id: tx.booking_id,
                    amount: tx.amount,
                    direction: tx.direction === "SEND" ? "RECEIVE" : "SEND",
                    account_type: tx.account_type,
                    notes: `Reversal of entry`,
                    is_reversal: true,
                    reversal_of: tx.id
                }]);

            if (error) throw error;
            toast.success("Transaction reversed safely via a counter-entry.");
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Failed to reverse transaction.");
        }
    };

    const handleViewStatement = async () => {
        if (filterAgent === "all") return;
        setStatementLoading(true);
        setShowStatement(true);
        
        try {
            const agentName = agents.find(a => a.id === filterAgent)?.name || "Agent";
            setStatementAgentName(agentName);

            const { data: txData, error } = await supabase
                .from("agent_transactions" as any)
                .select("*")
                .eq("agent_id", filterAgent)
                .order("performed_at", { ascending: true }); 

            if (error) throw error;
            
            const typedTxData = txData as any;
            const bookingIds = Array.from(new Set(typedTxData?.filter((t: any) => t.booking_id).map((t: any) => t.booking_id) || []));
            let bookingDetails: any[] = [];
            
            if (bookingIds.length > 0) {
                const { data: bDetails } = await supabase
                    .from("booking_ledger_view" as any)
                    .select("booking_id, invoice_no, customer_name")
                    .in("booking_id", bookingIds);
                bookingDetails = bDetails || [];
            }
            
            const bookingMap = new Map();
            bookingDetails.forEach((b: any) => bookingMap.set(b.booking_id, b));

            let runningBalance = 0;
            const fullStatement = txData?.map((tx: any) => {
                // SEND => Agent balance increases (we owe / advance amount)
                // RECEIVE => Agent balance decreases
                runningBalance += tx.direction === "SEND" ? tx.amount : -tx.amount;
                
                return {
                    ...tx,
                    invoice_no: bookingMap.get(tx.booking_id)?.invoice_no,
                    customer_name: bookingMap.get(tx.booking_id)?.customer_name,
                    balance: runningBalance
                };
            }) || [];
            
            setStatementData(fullStatement);
        } catch (err: any) {
            toast.error(err.message || "Failed to load statement");
            setShowStatement(false);
        } finally {
            setStatementLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Reversal Confirmation Dialog */}
            <AlertDialog open={!!reversalTarget} onOpenChange={(open) => { if (!open) setReversalTarget(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reverse Transaction?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will post a counter-entry of <strong>Rs {reversalTarget?.amount.toLocaleString()}</strong> to safely cancel the original transaction's effect. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmReversal} className="bg-destructive hover:bg-destructive/90 text-white">
                            Yes, Reverse It
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                <div>
                    <h2 className="text-2xl font-display font-black text-foreground tracking-tight">Agent <span className="text-muted-foreground font-medium">Ledger</span></h2>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Wallet className="w-3 h-3 text-gold" />
                        Manage settlements, advances and cash flows
                    </p>
                </div>
                
                <Sheet open={showForm} onOpenChange={setShowForm}>
                    <SheetTrigger asChild>
                        <Button className="bg-gold hover:bg-gold/90 text-white font-bold rounded-xl px-6 shadow-gold transition-all">
                            <PlusCircle className="w-4 h-4 mr-2" /> New Settlement
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l-gold/20 shadow-2xl">
                        <SheetHeader className="mb-6">
                            <SheetTitle className="text-2xl font-display font-black flex items-center gap-2">
                                <Receipt className="w-6 h-6 text-gold" /> Record Transaction
                            </SheetTitle>
                            <SheetDescription>
                                Post a new cash inflow or outflow for an agent. All entries are recorded in the audit trail.
                            </SheetDescription>
                        </SheetHeader>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Agent / Supplier</label>
                                        <Select value={form.agent_id} onValueChange={(val) => setForm({ ...form, agent_id: val })}>
                                            <SelectTrigger className="h-12 rounded-xl border-border/50 bg-background">
                                                <SelectValue placeholder="Choose Agent..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        {selectedAgentBalance !== null && (
                                            <div className={`mt-3 p-3 rounded-xl border flex flex-col gap-1 shadow-inner transition-colors duration-500
                                                ${selectedAgentBalance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-80">
                                                    <span>Current Khata</span>
                                                    <span>{selectedAgentBalance >= 0 ? "Agent Owes Us" : "We Owe Agent"}</span>
                                                </div>
                                                <div className="font-display text-xl font-black tracking-tight flex justify-between items-end">
                                                    <span>Rs {Math.abs(selectedAgentBalance).toLocaleString()}</span>
                                                    {selectedAgentBalance < 0 && (
                                                        <button type="button" onClick={() => setForm({ ...form, amount: Math.abs(selectedAgentBalance).toString() })} className="text-[10px] uppercase font-bold bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 px-2 py-1 rounded transition-colors text-red-600 dark:text-red-400">
                                                            Settle Full
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Type</label>
                                            <Select value={form.direction} onValueChange={(val: any) => setForm({ ...form, direction: val })}>
                                                <SelectTrigger className="h-11 rounded-xl border-border/50 bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="RECEIVE">Receive (Agent Pays)</SelectItem>
                                                    <SelectItem value="SEND">Send (We Pay)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Method</label>
                                            <Select value={form.account_type} onValueChange={(val: any) => setForm({ ...form, account_type: val })}>
                                                <SelectTrigger className="h-11 rounded-xl border-border/50 bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CASH">Cash Counter</SelectItem>
                                                    <SelectItem value="BANK">Bank Account</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount (Rs)</label>
                                        <span className="text-[9px] font-bold text-gold uppercase tracking-tighter">Enter or select below</span>
                                    </div>
                                    <Input
                                        required
                                        type="number"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="h-14 rounded-xl text-2xl font-black border-border/50 bg-muted/20 focus:bg-background transition-colors"
                                        placeholder="0,000"
                                    />
                                    
                                    {/* Smart Suggestions */}
                                    {selectedAgentBalance !== null && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedAgentBalance < 0 && (
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 text-[10px] font-bold px-3 rounded-full border-gold/30 hover:bg-gold/10 text-gold"
                                                    onClick={() => setForm({ ...form, amount: Math.abs(selectedAgentBalance).toString() })}
                                                >
                                                    Full Settlement (Rs {Math.abs(selectedAgentBalance).toLocaleString()})
                                                </Button>
                                            )}
                                            {selectedAgentBalance < 0 && (
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 text-[10px] font-bold px-3 rounded-full border-border hover:bg-muted"
                                                    onClick={() => setForm({ ...form, amount: (Math.abs(selectedAgentBalance) / 2).toString() })}
                                                >
                                                    Pay Half
                                                </Button>
                                            )}
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-7 text-[10px] font-bold px-3 rounded-full border-border hover:bg-muted"
                                                onClick={() => setForm({ ...form, amount: "10000" })}
                                            >
                                                Rs 10k
                                            </Button>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-7 text-[10px] font-bold px-3 rounded-full border-border hover:bg-muted"
                                                onClick={() => setForm({ ...form, amount: "50000" })}
                                            >
                                                Rs 50k
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Calculation Preview — Psychological Reassurance */}
                                {form.amount && Number(form.amount) > 0 && selectedAgentBalance !== null && (
                                    <div className="bg-muted/50 p-4 rounded-2xl border border-dashed border-border/60 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-gold" />
                                            Post-Transaction Preview
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-medium">
                                                <span className="text-muted-foreground">Current Balance</span>
                                                <span className={selectedAgentBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                    Rs {selectedAgentBalance.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs font-medium">
                                                <span className="text-muted-foreground">Settlement ({form.direction})</span>
                                                <span className={form.direction === 'SEND' ? 'text-red-600' : 'text-emerald-600'}>
                                                    {form.direction === 'SEND' ? '-' : '+'} Rs {Number(form.amount).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="h-px bg-border my-2" />
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Predicted Balance</span>
                                                <div className="text-right">
                                                    {(() => {
                                                        const current = selectedAgentBalance || 0;
                                                        const change = form.direction === 'SEND' ? Number(form.amount) : -Number(form.amount);
                                                        const next = current + change;
                                                        return (
                                                            <>
                                                                <div className={`text-xl font-black ${next >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                    Rs {Math.abs(next).toLocaleString()}
                                                                </div>
                                                                <div className="text-[9px] font-bold text-muted-foreground uppercase">
                                                                    {next >= 0 ? "Agent will owe us" : "We will owe agent"}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Link to Booking {form.direction === 'SEND' && "*"}</label>
                                    <Select value={form.booking_id} onValueChange={(val) => setForm({ ...form, booking_id: val })}>
                                        <SelectTrigger className="h-11 rounded-xl border-border/50 bg-background">
                                            <SelectValue placeholder="Search Booking..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- No Booking --</SelectItem>
                                            {bookings.map(b => (
                                                <SelectItem key={b.id} value={b.id}>
                                                    {b.invoice_no} ({b.customer_name})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {form.direction === 'SEND' && form.booking_id && form.booking_id !== 'none' && (
                                    <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/20 space-y-4 animate-in slide-in-from-top-2">
                                        {(() => {
                                            const b = bookings.find(x => x.id === form.booking_id);
                                            if (!b) return null;
                                            
                                            return (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Supplier Cost Check</span>
                                                        <span className="text-[10px] font-bold bg-white/50 px-2 py-0.5 rounded border border-orange-200">Rs {b.supplier_cost.toLocaleString()} Max</span>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <div className="h-1.5 w-full bg-orange-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-orange-500 transition-all duration-700"
                                                                style={{ width: `${Math.min((alreadySentForBooking / (b.supplier_cost || 1)) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter text-muted-foreground">
                                                            <span>Paid: Rs {alreadySentForBooking.toLocaleString()}</span>
                                                            <span className="text-emerald-600">Due: Rs {Math.max(0, b.supplier_cost - alreadySentForBooking).toLocaleString()}</span>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="w-full h-9 text-xs border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 font-bold"
                                                        onClick={() => setForm({ ...form, amount: Math.max(0, b.supplier_cost - alreadySentForBooking).toString() })}
                                                        disabled={(b.supplier_cost - alreadySentForBooking) <= 0}
                                                    >
                                                        Auto-fill Remaining Payout
                                                    </Button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Narration / Notes</label>
                                    <Input
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        className="h-11 rounded-xl border-border/50 bg-background"
                                        placeholder="Reason for this transaction..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full h-14 bg-gold hover:bg-gold/90 text-white rounded-2xl shadow-lg font-black uppercase tracking-[0.2em] transition-all"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Save Entry"}
                                </Button>
                                <p className="text-[9px] text-center text-muted-foreground mt-4 italic">
                                    * This transaction will be immediately reflected in the agent ledger.
                                </p>
                            </div>
                        </form>
                    </SheetContent>
                </Sheet>
            </div>

            <Card className="rounded-[2rem] border-border/50 shadow-lg overflow-hidden no-print">
                <CardHeader className="border-b border-border/50 bg-muted/10 pb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gold/10 rounded-lg">
                                <History className="w-4 h-4 text-gold" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Recent Ledger Activity</CardTitle>
                                <CardDescription>Last 50 transactions {filterAgent !== 'all' ? 'for selected agent' : 'across all agents'}.</CardDescription>
                            </div>
                        </div>
                        <div className="w-full md:w-auto flex items-center gap-2">
                            {filterAgent !== 'all' && (
                                <Button 
                                    variant="outline" 
                                    className="h-10 rounded-xl border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 font-bold gap-2 transition-all no-print"
                                    onClick={handlePrint}
                                >
                                    <Printer className="w-4 h-4" />
                                    PDF Statement
                                </Button>
                            )}
                            <Select value={filterAgent} onValueChange={setFilterAgent}>
                                <SelectTrigger className="h-10 w-full md:w-64 rounded-xl">
                                    <SelectValue placeholder="All Agents" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Agents</SelectItem>
                                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            {filterAgent !== 'all' && (
                                <Button 
                                    variant="outline" 
                                    className="h-10 gap-2 border-gold/50 text-gold hover:bg-gold/10 transition-colors"
                                    onClick={handleViewStatement}
                                >
                                    <FileText className="w-4 h-4"/>
                                    Statement
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 border-b border-border/30">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entry Log</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Transaction Details</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Flow</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Settlement Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Safety</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto" />
                                        </td>
                                    </tr>
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground italic">
                                            No recent transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-muted/10 transition-colors group">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground">
                                                        {new Date(tx.performed_at).getDate()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-foreground">
                                                            {new Date(tx.performed_at).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground font-medium uppercase">
                                                            {new Date(tx.performed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="text-sm font-black text-foreground flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                                                        {tx.agent_name}
                                                    </div>
                                                    {tx.invoice_no ? (
                                                        <div className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-flex items-center gap-1.5 w-fit">
                                                            <Receipt className="w-3 h-3" /> {tx.invoice_no}: {tx.customer_name}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] text-muted-foreground font-medium italic opacity-60 ml-3.5">
                                                            Personal / Global Settlement
                                                        </div>
                                                    )}
                                                    {tx.notes && (
                                                        <div className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded border border-border/50 ml-3.5 max-w-xs truncate">
                                                            {tx.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-tighter uppercase border ${tx.direction === 'SEND'
                                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    }`}>
                                                    {tx.direction === 'SEND' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                                    {tx.direction}
                                                </div>
                                                <div className="text-[8px] font-black text-muted-foreground mt-1 uppercase tracking-widest opacity-60">
                                                    via {tx.account_type}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right">
                                                <div className={`text-base font-black tracking-tight ${tx.direction === 'SEND' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {tx.direction === 'SEND' ? '-' : '+'} Rs {tx.amount.toLocaleString()}
                                                </div>
                                                {tx.is_reversal && (
                                                    <span className="text-[8px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">REVERSED ENTRY</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                {!tx.is_reversal && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleReversal(tx)}
                                                        className="h-8 w-8 p-0 rounded-full hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Reverse (Void) this transaction"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showStatement} onOpenChange={setShowStatement}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-2xl font-black italic bg-gold-gradient bg-clip-text text-transparent flex justify-between items-center">
                            Agent Statement: {statementAgentName}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.print()}
                                className="h-8 gap-2 border-border/50 text-muted-foreground mr-6 print:hidden"
                            >
                                <Download className="w-3.5 h-3.5" /> Print
                            </Button>
                        </DialogTitle>
                        <DialogDescription>
                            Running chronologically from the first transaction to current balance.
                        </DialogDescription>
                    </DialogHeader>

                    {statementLoading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>
                    ) : (
                        <div className="overflow-x-auto border border-border/50 rounded-xl">
                            <table className="w-full text-left bg-background">
                                <thead className="bg-muted/50 border-b border-border/50">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Details</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Debit (SEND)</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Credit (RECEIVE)</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right border-l border-border/50 bg-muted/20">Balance (Rs)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30 text-sm">
                                    {statementData.map((tx, i) => (
                                        <tr key={i} className="hover:bg-muted/10">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="font-medium">{new Date(tx.performed_at).toLocaleDateString()}</div>
                                                <div className="text-[10px] text-muted-foreground">{tx.account_type}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {tx.invoice_no ? <div className="font-bold text-blue-500">{tx.invoice_no}: {tx.customer_name}</div> : <div className="italic opacity-70">General Settlement</div>}
                                                {tx.notes && <div className="text-xs text-muted-foreground mt-0.5">{tx.notes}</div>}
                                                {tx.is_reversal && <span className="text-[10px] text-red-500 font-bold">REVERSAL</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {tx.direction === 'SEND' ? `Rs ${tx.amount.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-emerald-500">
                                                {tx.direction === 'RECEIVE' ? `Rs ${tx.amount.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-black border-l border-border/50 bg-muted/10">
                                                {tx.balance.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {statementData.length > 0 && (
                                        <tr className="bg-muted/50 border-t-2 border-border/50">
                                            <td colSpan={4} className="px-4 py-4 text-right font-black uppercase tracking-widest">Final Balance (Agent Owes / We Owe):</td>
                                            <td className="px-4 py-4 text-right font-black text-lg text-primary border-l border-border/50">
                                                Rs {statementData[statementData.length - 1].balance.toLocaleString()}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Print Only Component */}
            {filterAgent !== 'all' && selectedAgentObj && (
                <AgentStatementPrint 
                    agentName={selectedAgentObj.name}
                    agentPhone={selectedAgentObj.phone || ""}
                    balance={selectedAgentBalance || 0}
                    transactions={transactions}
                />
            )}
        </div>
    );
}
