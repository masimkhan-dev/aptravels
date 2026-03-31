import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, User, Phone, Loader2, X, Users, Wallet, ListChecks, History } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Trash2 } from "lucide-react";

interface Agent {
    id: string;
    name: string;
    phone: string | null;
    notes: string | null;
    created_at: string;
    balance?: number;
}

export default function AdminAgents() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [formData, setFormData] = useState({
        name: "", phone: "", notes: ""
    });

    const fetchAgents = async () => {
        setLoading(true);
        try {
            // Get agents
            let query = supabase.from("agents")
                .select("*")
                .is("deleted_at", null)
                .order("name", { ascending: true });

            if (search) {
                query = query.ilike("name", `%${search}%`);
            }
            const { data: agentsData, error: agentsError } = await query;
            if (agentsError) throw agentsError;

            // Get balances
            const { data: balancesData, error: balancesError } = await supabase
                .from("agent_balances" as any)
                .select("*");
            if (balancesError) throw balancesError;

            const enrichedAgents = (agentsData || []).map(agent => ({
                ...agent,
                balance: balancesData?.find((b: any) => b.agent_id === agent.id)?.balance || 0
            }));

            setAgents(enrichedAgents);
        } catch (error: any) {
            toast.error(error.message || "Failed to load agents.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, [search]);

    const handleSaveAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingAgent) {
                const { error } = await supabase
                    .from("agents")
                    .update({
                        name: formData.name,
                        phone: formData.phone,
                        notes: formData.notes
                    })
                    .eq("id", editingAgent.id);
                if (error) throw error;
                toast.success("Agent profile updated.");
            } else {
                const { error } = await supabase
                    .from("agents")
                    .insert([{
                        name: formData.name,
                        phone: formData.phone,
                        notes: formData.notes
                    }]);
                if (error) throw error;
                toast.success("New agent registered.");
            }
            setShowModal(false);
            setEditingAgent(null);
            setFormData({ name: "", phone: "", notes: "" });
            fetchAgents();
        } catch (error: any) {
            toast.error(error.message || "Operation failed.");
        }
    };

    const handleEdit = (agent: Agent) => {
        setEditingAgent(agent);
        setFormData({
            name: agent.name,
            phone: agent.phone || "",
            notes: agent.notes || ""
        });
        setShowModal(true);
    };

    const handleDeleteAgent = async (agent: Agent) => {
        if (Number(agent.balance) !== 0) {
            toast.error(`Cannot delete agent with active balance (Rs ${agent.balance}).`);
            return;
        }

        try {
            const { error } = await supabase
                .from("agents")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", agent.id);

            if (error) throw error;
            toast.success("Agent profile deleted successfully.");
            fetchAgents();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete agent.");
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-bold tracking-tight bg-gold-gradient bg-clip-text text-transparent italic">Agents Registry</h1>
                    <p className="text-muted-foreground text-sm">Manage your external agents and track their commercial status.</p>
                </div>
                <Button onClick={() => { setEditingAgent(null); setFormData({ name: "", phone: "", notes: "" }); setShowModal(true); }} className="bg-gold hover:bg-gold/90 text-white rounded-xl shadow-lg shadow-gold/20 gap-2">
                    <Plus className="w-4 h-4" /> Add Agent
                </Button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search agents by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-10 rounded-xl"
                />
            </div>

            {loading ? (
                <div className="flex h-60 items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gold" />
                </div>
            ) : agents.length === 0 ? (
                <Card className="border-dashed h-60 flex flex-col items-center justify-center text-muted-foreground">
                    <Users className="w-10 h-10 mb-2 opacity-20" />
                    <p>No agents found.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map((agent) => (
                        <Card key={agent.id} className="group overflow-hidden rounded-[1.5rem] border-border/50 hover:border-gold/30 hover:shadow-2xl transition-all duration-300">
                            <CardHeader className="bg-muted/30 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold">
                                        {agent.name.charAt(0)}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${Number(agent.balance) >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {Number(agent.balance) >= 0 ? "Debit (Agent Owes)" : "Credit (We Owe)"}
                                    </div>
                                </div>
                                <CardTitle className="text-xl mt-4 line-clamp-1">{agent.name}</CardTitle>
                                {agent.phone && (
                                    <CardDescription className="flex items-center gap-2 mt-1">
                                        <Phone className="w-3.5 h-3.5" /> {agent.phone}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-muted/20 rounded-2xl border border-border/50">
                                        <div className="text-xs font-bold text-muted-foreground flex items-center gap-2 italic uppercase tracking-wider">
                                            <Wallet className="w-3.5 h-3.5 text-gold" /> Balance
                                        </div>
                                        <div className={`text-xl font-black ${Number(agent.balance) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            Rs {Math.abs(agent.balance || 0).toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="grow rounded-xl gap-2 h-10 border-dashed"
                                            onClick={() => handleEdit(agent)}
                                        >
                                            <User className="w-3.5 h-3.5" /> Edit Profile
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={Number(agent.balance) !== 0}
                                                    className="w-12 rounded-xl h-10 border-dashed text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 disabled:opacity-30"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="rounded-[2rem]">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Agent Profile?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will remove <strong>{agent.name}</strong> from the active registry. 
                                                        This action is safe because the agent has no outstanding balance.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        onClick={() => handleDeleteAgent(agent)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                                    >
                                                        Delete Profile
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-secondary/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in transition-all">
                    <Card className="w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <CardHeader className="bg-gold text-white pb-8">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-2xl font-black italic">{editingAgent ? "Update Profile" : "Register Agent"}</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="text-white hover:bg-white/10 rounded-full">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                            <CardDescription className="text-white/80">{editingAgent ? "Modify details for " + editingAgent.name : "Create a new agent account for ledger tracking."}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <form onSubmit={handleSaveAgent} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mr-auto ml-1">Agent / Agency Name</label>
                                    <Input
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="h-12 rounded-xl border-border/50 focus:border-gold/50"
                                        placeholder="e.g. Ali Visa Expert"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mr-auto ml-1">Phone Number</label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="h-12 rounded-xl border-border/50 focus:border-gold/50"
                                        placeholder="e.g. 03xx-xxxxxxx"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mr-auto ml-1">Notes / Address</label>
                                    <Textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="rounded-xl border-border/50 focus:border-gold/50"
                                        rows={3}
                                        placeholder="Internal reference notes..."
                                    />
                                </div>
                                <div className="pt-4">
                                    <Button type="submit" className="w-full h-12 bg-gold hover:bg-gold/90 text-white rounded-xl shadow-lg shadow-gold/20 font-bold uppercase tracking-widest transition-all hover:scale-[1.02]">
                                        {editingAgent ? "Update Account" : "Activate Agent Account"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
