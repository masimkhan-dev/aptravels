import { 
    HelpCircle, Book, ShieldAlert, Edit3, 
    RotateCcw, Search, Zap, Wallet, 
    CheckCircle2, AlertCircle, Info, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminHelp() {
    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Header */}
            <div className="text-center space-y-4 pt-8">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gold/10 text-gold mb-4">
                    <Book className="w-10 h-10" />
                </div>
                <h1 className="text-4xl font-display font-black text-foreground tracking-tight uppercase">
                    Operations <span className="text-gold">Manual</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                    A professional guide for Akbar Pura Travels staff to ensure financial accuracy, 
                    operational speed, and system integrity.
                </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-3xl border-border/50 hover:shadow-xl transition-all group">
                    <CardHeader>
                        <Zap className="w-8 h-8 text-gold mb-2 group-hover:scale-110 transition-transform" />
                        <CardTitle className="text-xl">Speed First</CardTitle>
                        <CardDescription>Master the Ctrl+K Command Palette to navigate in seconds.</CardDescription>
                    </CardHeader>
                </Card>
                <Card className="rounded-3xl border-border/50 hover:shadow-xl transition-all group">
                    <CardHeader>
                        <ShieldAlert className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                        <CardTitle className="text-xl">Safety Always</CardTitle>
                        <CardDescription>Learn why we reverse instead of delete to keep audits clean.</CardDescription>
                    </CardHeader>
                </Card>
                <Card className="rounded-3xl border-border/50 hover:shadow-xl transition-all group">
                    <CardHeader>
                        <Wallet className="w-8 h-8 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                        <CardTitle className="text-xl">Financial Trust</CardTitle>
                        <CardDescription>Best practices for recording agent and client payments.</CardDescription>
                    </CardHeader>
                </Card>
            </div>

            {/* Main Content Sections */}
            <div className="space-y-16">
                
                {/* 1. Correction Policy */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1.5 bg-red-600 rounded-full" />
                        <h2 className="text-2xl font-black uppercase tracking-tight">How to Edit Mistakes?</h2>
                    </div>
                    <Card className="border-red-200 bg-red-50/30 overflow-hidden rounded-[2rem]">
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-start gap-4">
                                <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-1" />
                                <div className="space-y-2">
                                    <p className="font-bold text-red-900 text-lg">The "Immutable Audit" Rule</p>
                                    <p className="text-red-700/80 leading-relaxed">
                                        In professional financial systems, you **NEVER** delete or "overwrite" a 
                                        transaction. If you entered the wrong amount or selected the wrong agent:
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-6 bg-white rounded-2xl border border-red-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <RotateCcw className="w-4 h-4 text-red-600" />
                                        <span className="font-black text-xs uppercase tracking-widest text-red-900">Step 1: Reverse</span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Find the wrong entry in the Ledger. Click the **"Reverse"** (Void) button. 
                                        The system will automatically post a counter-entry to cancel it out.
                                    </p>
                                </div>
                                <div className="p-6 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Edit3 className="w-4 h-4 text-emerald-600" />
                                        <span className="font-black text-xs uppercase tracking-widest text-emerald-900">Step 2: Correct</span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Once the reversal is saved, create a **New Entry** with the correct 
                                        details. This preserves a "History of Correction" for the auditors.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* 2. Global Search */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1.5 bg-gold rounded-full" />
                        <h2 className="text-2xl font-black uppercase tracking-tight">Using the Smart Search (Ctrl+K)</h2>
                    </div>
                    <div className="bg-muted/30 rounded-[2rem] p-8 border border-border/50">
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold text-gold shrink-0 border border-gold/20 shadow-sm">1</div>
                                <div>
                                    <p className="font-bold">Find Anything Fast</p>
                                    <p className="text-sm text-muted-foreground">Type a Customer Name, Invoice Number, or PNR. The system indexes across all records.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold text-gold shrink-0 border border-gold/20 shadow-sm">2</div>
                                <div>
                                    <p className="font-bold">Instant Context</p>
                                    <p className="text-sm text-muted-foreground">Results show you the **Balance Due** immediately. You don't need to open the profile to see if they owe money.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold text-gold shrink-0 border border-gold/20 shadow-sm">3</div>
                                <div>
                                    <p className="font-bold">Quick Actions</p>
                                    <p className="text-sm text-muted-foreground">Use the hover buttons on search results to open **WhatsApp** or download an **Invoice** without clicking through menus.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* 3. Common Workflows */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1.5 bg-blue-600 rounded-full" />
                        <h2 className="text-2xl font-black uppercase tracking-tight">Standard Operating Procedures</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl bg-background border border-border/50 space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-100 text-emerald-700 border-none px-2 py-0">New Booking</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                1. Search for Customer (or create new).<br/>
                                2. Add Booking details (Ticket/Visa/Package).<br/>
                                3. Set "Total Price" and "Supplier Cost" (Mandatory).<br/>
                                4. Record initial payment via the Payment tab.
                            </p>
                        </div>
                        <div className="p-6 rounded-3xl bg-background border border-border/50 space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-700 border-none px-2 py-0">Agent Settlement</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                1. Open Agent Ledger.<br/>
                                2. Select Agent and check current "Khata" balance.<br/>
                                3. Click "New Settlement".<br/>
                                4. Use "Auto-fill Remaining" if linked to a specific booking.
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            {/* Footer Help */}
            <div className="p-8 rounded-[3rem] bg-gold text-white text-center space-y-4 shadow-gold-lg">
                <Info className="w-8 h-8 mx-auto" />
                <h3 className="text-2xl font-display font-black uppercase">Need Technical Support?</h3>
                <p className="max-w-md mx-auto opacity-90 text-sm font-medium">
                    If you encounter a system error or need a new feature, contact the 
                    Akbar Pura Systems administrator immediately.
                </p>
                <div className="pt-4">
                    <button className="bg-white text-gold px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-xl transition-all">
                        Open Support Ticket
                    </button>
                </div>
            </div>
        </div>
    );
}
