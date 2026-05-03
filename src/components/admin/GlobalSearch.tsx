import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
    Search, CreditCard, Users, Receipt, MessageSquare, 
    ArrowRight, Loader2, User, Wallet, History, Send, 
    ExternalLink, Download, FileText
} from "lucide-react";
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GlobalSearchProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{
        bookings: any[];
        customers: any[];
        agents: any[];
    }>({ bookings: [], customers: [], agents: [] });

    const navigate = useNavigate();

    const fetchResults = useCallback(async (search: string) => {
        if (!search) {
            setResults({ bookings: [], customers: [], agents: [] });
            return;
        }

        setLoading(true);
        try {
            // 1. Search Bookings (via Ledger View for financial context)
            const { data: bookings } = await supabase
                .from("booking_ledger_view" as any)
                .select("*")
                .or(`invoice_no.ilike.%${search}%,customer_name.ilike.%${search}%,pnr_number.ilike.%${search}%`)
                .limit(5);

            // 2. Search Customers
            const { data: customers } = await supabase
                .from("customers")
                .select("id, full_name, phone, city")
                .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
                .limit(5);

            // 3. Search Agents
            const { data: agents } = await supabase
                .from("agents")
                .select("id, name, phone")
                .or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
                .is("deleted_at", null)
                .limit(3);

            setResults({
                bookings: bookings || [],
                customers: customers || [],
                agents: agents || []
            });
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchResults(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, fetchResults]);

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
        onOpenChange(false);
    };

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                    placeholder="Search anything (Bookings, Clients, Agents...)"
                    value={query}
                    onValueChange={setQuery}
                    className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                {loading && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
            </div>
            <CommandList className="max-h-[450px] overflow-y-auto">
                <CommandEmpty className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-muted-foreground opacity-20" />
                        <p className="text-sm text-muted-foreground">No matches found for "{query}"</p>
                    </div>
                </CommandEmpty>

                {results.bookings.length > 0 && (
                    <CommandGroup heading="Active Bookings & Vouchers">
                        {results.bookings.map((b) => (
                            <CommandItem
                                key={b.booking_id}
                                onSelect={() => {
                                    navigate(`/admin/bookings/${b.booking_id}`);
                                    onOpenChange(false);
                                }}
                                className="group flex items-center justify-between py-3 cursor-pointer"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${b.balance_due > 0 ? 'bg-orange-500/10 text-orange-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                        <Receipt className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{b.invoice_no}</span>
                                            <Badge variant="outline" className="text-[9px] h-4 font-black uppercase tracking-tighter">
                                                {b.booking_type}
                                            </Badge>
                                        </div>
                                        <span className="text-[11px] text-foreground font-medium">{b.customer_name}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[10px] font-bold ${b.balance_due > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {b.balance_due > 0 ? `Balance: Rs ${b.balance_due.toLocaleString()}` : 'Fully Paid'}
                                            </span>
                                            {b.pnr_number && <span className="text-[10px] text-muted-foreground font-mono">PNR: {b.pnr_number}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={(e) => handleAction(e, () => navigate(`/admin/bookings/${b.booking_id}`))}>
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={(e) => handleAction(e, () => window.open(`https://wa.me/?text=Ref:${b.invoice_no}`, '_blank'))}>
                                        <MessageSquare className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {results.customers.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Customer Directory">
                            {results.customers.map((c) => (
                                <CommandItem
                                    key={c.id}
                                    onSelect={() => {
                                        navigate(`/admin/customers`);
                                        onOpenChange(false);
                                    }}
                                    className="group flex items-center justify-between py-3 cursor-pointer"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{c.full_name}</span>
                                            <span className="text-[11px] text-muted-foreground">{c.phone} • {c.city || 'No City'}</span>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[8px] font-bold px-1.5 h-3.5">
                                                    Loyal Client
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-7 text-[10px] font-bold gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                                            onClick={(e) => handleAction(e, () => navigate(`/admin/bookings`))}
                                        >
                                            <History className="h-3 w-3" /> Ledger
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-emerald-500"
                                            onClick={(e) => handleAction(e, () => window.open(`https://wa.me/${c.phone.replace(/\D/g,'')}`, '_blank'))}
                                        >
                                            <MessageSquare className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                {results.agents.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Agent Registry">
                            {results.agents.map((a) => (
                                <CommandItem
                                    key={a.id}
                                    onSelect={() => {
                                        navigate(`/admin/agent-ledger`);
                                        onOpenChange(false);
                                    }}
                                    className="group flex items-center justify-between py-3 cursor-pointer"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-gold/10 text-gold">
                                            <Wallet className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{a.name}</span>
                                            <span className="text-[11px] text-muted-foreground">{a.phone}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-7 text-[10px] font-bold gap-1 border-gold/20 text-gold hover:bg-gold/5"
                                            onClick={(e) => handleAction(e, () => navigate(`/admin/agent-ledger`))}
                                        >
                                            <History className="h-3 w-3" /> Statement
                                        </Button>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                <CommandSeparator />
                <CommandGroup heading="Quick Navigation">
                    <CommandItem onSelect={() => { navigate("/admin/dashboard"); onOpenChange(false); }}>
                        <ArrowRight className="mr-2 h-4 w-4" /> Dashboard
                    </CommandItem>
                    <CommandItem onSelect={() => { navigate("/admin/bookings"); onOpenChange(false); }}>
                        <ArrowRight className="mr-2 h-4 w-4" /> All Bookings
                    </CommandItem>
                    <CommandItem onSelect={() => { navigate("/admin/expenses"); onOpenChange(false); }}>
                        <ArrowRight className="mr-2 h-4 w-4" /> Business Expenses
                    </CommandItem>
                </CommandGroup>
            </CommandList>
            <div className="p-2 bg-muted/50 border-t flex items-center justify-between text-[10px] text-muted-foreground font-medium px-4">
                <div className="flex gap-4">
                    <span><kbd className="bg-background border rounded px-1 text-[9px]">↑↓</kbd> Navigate</span>
                    <span><kbd className="bg-background border rounded px-1 text-[9px]">Enter</kbd> Select</span>
                </div>
                <div>
                    Press <kbd className="bg-background border rounded px-1 text-[9px]">Esc</kbd> to close
                </div>
            </div>
        </CommandDialog>
    );
}
