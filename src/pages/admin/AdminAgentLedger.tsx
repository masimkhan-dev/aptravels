import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    PlusCircle, Loader2, Search, ArrowUpRight, ArrowDownLeft,
    Wallet, History, Info, X, User, Receipt, RotateCcw, FileText, Download
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

    // Filters
    const [filterAgent, setFilterAgent] = useState<string>("all");

    // Statement State
    const [statementData, setStatementData] = useState<any[]>([]);
    const [statementLoading, setStatementLoading] = useState(false);
    const [showStatement, setShowStatement] = useState(false);
    const [statementAgentName, setStatementAgentName] = useState("");

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

            toast.success("Transaction recorded successfully.");
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
        if (!window.confirm(`Are you sure you want to REVERSE this Rs ${tx.amount.toLocaleString()} transaction? This will post an opposite entry to cancel its effect safely.`)) return;

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-bold tracking-tight bg-gold-gradient bg-clip-text text-transparent italic">Agent Ledger</h1>
                    <p className="text-muted-foreground text-sm">Track settlements, advances and cash flows with your business agents.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowForm(!showForm)}
                        className={`rounded-xl shadow-lg gap-2 transition-all ${showForm ? 'bg-secondary' : 'bg-gold hover:bg-gold/90 text-white'}`}
                    >
                        {showForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                        {showForm ? "Cancel Entry" : "New Settlement"}
                    </Button>
                </div>
            </div>

            {showForm && (
                <Card className="border-gold/20 shadow-xl rounded-[2rem] overflow-hidden animate-in slide-in-from-top-4">
                    <CardHeader className="bg-muted/30 pb-6">
                        <CardTitle className="text-xl font-black italic flex items-center gap-2">
                            Settlement Entry
                        </CardTitle>
                        <CardDescription>Record a new cash inflow or outflow related to an agent.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Select Agent</label>
                                <Select value={form.agent_id} onValueChange={(val) => setForm({ ...form, agent_id: val })}>
                                    <SelectTrigger className="h-12 rounded-xl border-border/50">
                                        <SelectValue placeholder="Choose Agent..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {selectedAgentBalance !== null && (
                                    <p className={`text-[10px] font-bold mt-1 ml-1 ${selectedAgentBalance >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                        Current Khata: Rs {Math.abs(selectedAgentBalance).toLocaleString()} {selectedAgentBalance >= 0 ? "(Agent Owes)" : "(We Owe)"}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Direction</label>
                                <Select value={form.direction} onValueChange={(val: any) => setForm({ ...form, direction: val })}>
                                    <SelectTrigger className="h-12 rounded-xl border-border/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RECEIVE">Receive (Agent Pays Us)</SelectItem>
                                        <SelectItem value="SEND">Send (We Pay Agent)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Amount (Rs)</label>
                                <Input
                                    required
                                    type="number"
                                    value={form.amount}
                                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                    className="h-12 rounded-xl text-lg font-bold border-border/50"
                                    placeholder="0,000"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Account / Method</label>
                                <Select value={form.account_type} onValueChange={(val: any) => setForm({ ...form, account_type: val })}>
                                    <SelectTrigger className="h-12 rounded-xl border-border/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Cash Counter</SelectItem>
                                        <SelectItem value="BANK">Bank Account</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Link to Booking {form.direction === 'SEND' && "*"}</label>
                                <Select value={form.booking_id} onValueChange={(val) => setForm({ ...form, booking_id: val })}>
                                    <SelectTrigger className="h-12 rounded-xl border-border/50">
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

                            <div className="space-y-2 lg:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Narration / Notes</label>
                                <Input
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className="h-12 rounded-xl border-border/50"
                                    placeholder="Details of settlement..."
                                />
                            </div>

                            {form.direction === 'SEND' && form.booking_id && form.booking_id !== 'none' && (
                                <div className="lg:col-span-3 bg-muted/30 p-5 rounded-xl border border-border/50 text-sm space-y-2 shadow-inner">
                                    <p className="font-black border-b border-border/50 pb-2 mb-3 uppercase tracking-widest text-[10px] text-muted-foreground flex items-center justify-between">
                                        Booking Financials Breakdown
                                        <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded">PAYOUT LIMIT APPLIED</span>
                                    </p>
                                    {(() => {
                                        const b = bookings.find(x => x.id === form.booking_id);
                                        if (!b) return null;
                                        return (
                                            <>
                                                <div className="flex justify-between items-center text-muted-foreground"><span>Customer Invoice Total:</span> <span className="font-medium">Rs {b.total_price.toLocaleString()}</span></div>
                                                <div className="flex justify-between items-center text-emerald-500"><span>Paid by Customer:</span> <span className="font-medium">Rs {b.total_paid.toLocaleString()}</span></div>
                                                <div className="flex justify-between items-center text-blue-500 border-b border-border/10 pb-2 mb-2"><span>Agency Profit (Margin):</span> <span className="font-medium">Rs {b.margin.toLocaleString()}</span></div>
                                                <div className="flex justify-between items-center font-black text-lg">
                                                    <span>Supplier Cost (Max Payable to Agent):</span>
                                                    <span>Rs {b.supplier_cost.toLocaleString()}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            <div className="lg:col-span-3 pt-4 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="h-12 px-12 bg-gold hover:bg-gold/90 text-white rounded-xl shadow-lg font-bold uppercase tracking-widest transition-all"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Commit Entry"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="rounded-[2rem] border-border/50 shadow-lg overflow-hidden">
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
                            <thead className="bg-muted/30 border-b border-border/30">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date / User</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Agent & Details</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Value (Rs)</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Action</th>
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
                                        <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-sm font-bold flex items-center gap-1">
                                                    {new Date(tx.performed_at).toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground uppercase opacity-70">
                                                    {new Date(tx.performed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-black italic flex items-center gap-2">
                                                    <User className="w-3 h-3 text-gold" /> {tx.agent_name}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                    {tx.invoice_no ? (
                                                        <span className="flex items-center gap-1 text-blue-500 font-medium">
                                                            <Receipt className="w-3 h-3" /> {tx.invoice_no}: {tx.customer_name}
                                                        </span>
                                                    ) : (
                                                        <span className="italic opacity-60">Personal Settlement</span>
                                                    )}
                                                </div>
                                                {tx.notes && <div className="text-[10px] bg-muted/40 px-2 py-0.5 rounded mt-2 inline-block border border-border/50">{tx.notes}</div>}
                                                {tx.is_reversal && <div className="text-[10px] bg-red-500/10 text-red-500 font-bold px-2 py-0.5 rounded mt-2 inline-block border border-red-500/20 ml-2">REVERSAL</div>}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest italic border ${tx.direction === 'SEND'
                                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    }`}>
                                                    {tx.direction === 'SEND' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                                    {tx.direction} ({tx.account_type})
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right">
                                                <div className={`text-base font-black ${tx.direction === 'SEND' ? 'text-foreground' : 'text-emerald-500'}`}>
                                                    {tx.direction === 'SEND' ? '-' : '+'} Rs {tx.amount.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                {!tx.is_reversal && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleReversal(tx)}
                                                        className="h-8 gap-1.5 rounded-lg border-red-500/20 hover:bg-red-500/10 hover:text-red-600 text-muted-foreground transition-all"
                                                        title="Reverse this transaction"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Void</span>
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
                                className="h-8 gap-2 border-border/50 text-muted-foreground mr-6"
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
        </div>
    );
}
