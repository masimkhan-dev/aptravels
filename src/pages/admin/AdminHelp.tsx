import { useState } from "react";
import { 
    HelpCircle, BookOpen, ShieldAlert, Edit2, 
    Trash2, Check, X, Shield, FileText,
    Users, Ticket, TrendingDown, Info, ArrowRight,
    Lock, AlertCircle, CheckCircle2, ListTodo, HelpCircle as QuestionIcon
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TabType = "general" | "customers" | "bookings" | "expenses" | "guide";

export default function AdminHelp() {
    const [activeTab, setActiveTab] = useState<TabType>("general");

    const tabs = [
        { id: "general", label: "Overview & Roles", icon: BookOpen },
        { id: "customers", label: "Customer Module", icon: Users },
        { id: "bookings", label: "Booking Module", icon: Ticket },
        { id: "expenses", label: "Expense Module", icon: TrendingDown },
        { id: "guide", label: "System Icons & Rules", icon: Info }
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div className="text-center space-y-4 pt-6">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gold/10 text-gold mb-2">
                    <HelpCircle className="w-10 h-10 animate-float" />
                </div>
                <h1 className="text-4xl font-display font-black text-foreground tracking-tight uppercase">
                    System Help & <span className="text-gold">User Guide</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                    Learn how to use the Admin System step by step. Master roles, workflows, and strict operational guidelines.
                </p>
            </div>

            {/* Interactive Tab Switcher */}
            <div className="flex flex-wrap justify-center gap-2 border-b border-border/60 pb-4">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all duration-300 ${
                                isActive 
                                    ? "bg-gold text-white shadow-gold-lg" 
                                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Contents */}
            <div className="mt-8 transition-all duration-300">
                {/* 1. OVERVIEW & ROLES TAB */}
                {activeTab === "general" && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* User Roles Section */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Shield className="w-6 h-6 text-gold" />
                                User Roles & Permissions
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                The system uses Role-Based Access Control (RBAC) to protect business intelligence and financial integrity.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                {/* Admin */}
                                <Card className="border-border/50 hover:shadow-premium transition-all rounded-3xl overflow-hidden">
                                    <CardHeader className="bg-navy/5 border-b border-border/30">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-lg font-black text-navy uppercase">Admin</CardTitle>
                                            <Badge className="bg-navy text-white text-xs font-bold uppercase">Full Access</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-2">
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            Complete system control. Admin accounts have access to financial ledgers, audit logs, staff profiles management, settings, and database backups.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Manager */}
                                <Card className="border-border/50 hover:shadow-premium transition-all rounded-3xl overflow-hidden">
                                    <CardHeader className="bg-gold/5 border-b border-border/30">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-lg font-black text-gold uppercase">Manager</CardTitle>
                                            <Badge className="bg-gold text-white text-xs font-bold uppercase">Almost Full Access</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-2">
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            Can view analytics, manage customer records, setup packages/services, track settlements, and edit bookings. Cannot delete audit logs or access root configuration.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Sales */}
                                <Card className="border-border/50 hover:shadow-premium transition-all rounded-3xl overflow-hidden">
                                    <CardHeader className="bg-emerald-50 border-b border-border/30">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-lg font-black text-emerald-700 uppercase">Sales</CardTitle>
                                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-xs font-bold uppercase">Sales & Booking</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-2">
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            Responsible for customer onboarding and booking creation. Can register customers, create bookings, record customer payments, and view standard ledgers.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Ops */}
                                <Card className="border-border/50 hover:shadow-premium transition-all rounded-3xl overflow-hidden">
                                    <CardHeader className="bg-blue-50 border-b border-border/30">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-lg font-black text-blue-700 uppercase">Ops</CardTitle>
                                            <Badge className="bg-blue-100 text-blue-800 border-none text-xs font-bold uppercase">Operations Only</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-2">
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            Operational logistics management. Can update travel dates, flight PNRs, ticket sectors, and track step-by-step visa processes. Has no access to financial totals or margins.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Daily Workflow Section */}
                        <div className="space-y-6 pt-4 border-t border-border/60">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <ListTodo className="w-6 h-6 text-gold" />
                                Daily Workflow Guidance
                            </h2>
                            <div className="bg-muted/30 rounded-3xl p-8 border border-border/50 space-y-6">
                                <p className="text-muted-foreground text-sm font-medium">
                                    Follow this operational sequence daily to prevent financial discrepancies and keep data synchronized:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="p-5 bg-white rounded-2xl border border-border/40 shadow-sm relative space-y-2">
                                        <div className="absolute top-3 right-3 text-2xl font-black text-gold/20">1</div>
                                        <span className="font-bold text-xs uppercase tracking-wider text-navy block">Add Customer</span>
                                        <p className="text-xs text-muted-foreground">Always use the Ctrl+K search first to ensure the customer doesn't already exist.</p>
                                    </div>
                                    <div className="p-5 bg-white rounded-2xl border border-border/40 shadow-sm relative space-y-2">
                                        <div className="absolute top-3 right-3 text-2xl font-black text-gold/20">2</div>
                                        <span className="font-bold text-xs uppercase tracking-wider text-navy block">Create Booking</span>
                                        <p className="text-xs text-muted-foreground">Select customer, choose booking type (Visa, Ticket, Umrah), and enter pricing.</p>
                                    </div>
                                    <div className="p-5 bg-white rounded-2xl border border-border/40 shadow-sm relative space-y-2">
                                        <div className="absolute top-3 right-3 text-2xl font-black text-gold/20">3</div>
                                        <span className="font-bold text-xs uppercase tracking-wider text-navy block">Update Details</span>
                                        <p className="text-xs text-muted-foreground">Fill in flight details, airline sectors, and visa milestones as they are updated.</p>
                                    </div>
                                    <div className="p-5 bg-white rounded-2xl border border-border/40 shadow-sm relative space-y-2">
                                        <div className="absolute top-3 right-3 text-2xl font-black text-gold/20">4</div>
                                        <span className="font-bold text-xs uppercase tracking-wider text-navy block">Add Expenses</span>
                                        <p className="text-xs text-muted-foreground">Log supplier payments, utility invoices, and general expenses in real-time.</p>
                                    </div>
                                    <div className="p-5 bg-white rounded-2xl border border-border/40 shadow-sm relative space-y-2">
                                        <div className="absolute top-3 right-3 text-2xl font-black text-gold/20">5</div>
                                        <span className="font-bold text-xs uppercase tracking-wider text-navy block">Review Balance</span>
                                        <p className="text-xs text-muted-foreground">Regularly check outstanding client dues and agent balances on the dashboard.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. CUSTOMER MODULE TAB */}
                {activeTab === "customers" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <Card className="rounded-[2rem] border-border/60 overflow-hidden shadow-premium">
                            <CardHeader className="bg-muted/30 border-b border-border/40 p-8">
                                <CardTitle className="text-2xl font-black uppercase text-foreground">Customer Directory</CardTitle>
                                <CardDescription>Managing client profiles, contact information, and security compliance.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="font-black text-sm uppercase tracking-wider text-emerald-700">What you can do:</h3>
                                        <ul className="space-y-3 text-sm text-muted-foreground">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                                <span><strong>Register New Customers:</strong> Save basic fields to set up a billing ledger.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                                <span><strong>Edit Profile Information:</strong> Correct typo mistakes in contact details.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                                <span><strong>View History:</strong> Trace all tickets, package bookings, and past payments.</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-black text-sm uppercase tracking-wider text-gold">Edit Rules & Archiving:</h3>
                                        <ul className="space-y-3 text-sm text-muted-foreground">
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                                                <span>Editable fields are limited to <strong>Full Name</strong>, <strong>Phone</strong>, <strong>Email</strong>, and <strong>Address</strong>.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                                                <span><strong>CNIC/Passport</strong> details cannot be changed once the profile is created.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                                                <span>Deleted customers are soft-deleted (archived/hidden) to preserve historical records.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200/60 flex items-start gap-3">
                                    <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <h4 className="font-black text-sm text-amber-800 uppercase tracking-wide">Important: CNIC & Passport Restrictions</h4>
                                        <p className="text-xs text-amber-700 leading-relaxed">
                                            Due to strict government regulations and identity lookup requirements, CNIC and Passport numbers cannot be edited. If you made an entry error, you must ask an Administrator to void the profile and register a correct one.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 3. BOOKING MODULE TAB */}
                {activeTab === "bookings" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <Card className="rounded-[2rem] border-border/60 overflow-hidden shadow-premium">
                            <CardHeader className="bg-muted/30 border-b border-border/40 p-8">
                                <CardTitle className="text-2xl font-black uppercase text-foreground">Booking Operations Ledger</CardTitle>
                                <CardDescription>Update logistics tracking, flights, visa status, and packages.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Ticket card */}
                                    <div className="p-6 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
                                        <span className="font-black text-xs uppercase tracking-widest text-slate-800 bg-slate-200 px-2 py-0.5 rounded">Ticket Bookings</span>
                                        <div className="space-y-2 text-xs">
                                            <p className="font-bold text-slate-700 uppercase">Editable Operations Fields:</p>
                                            <ul className="list-disc pl-4 space-y-1.5 text-muted-foreground">
                                                <li>PNR Number (e.g. AM29X)</li>
                                                <li>Airline Name</li>
                                                <li>Ticket Sector (e.g. LHE-DXB)</li>
                                                <li>Travel Date</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Visa card */}
                                    <div className="p-6 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
                                        <span className="font-black text-xs uppercase tracking-widest text-slate-800 bg-slate-200 px-2 py-0.5 rounded">Visa Bookings</span>
                                        <div className="space-y-2 text-xs">
                                            <p className="font-bold text-slate-700 uppercase">Editable Operations Fields:</p>
                                            <ul className="list-disc pl-4 space-y-1.5 text-muted-foreground">
                                                <li>Visa Country</li>
                                                <li>Visa Profession</li>
                                                <li>Travel Date</li>
                                                <li>Workflow Steps Checkboxes</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Package card */}
                                    <div className="p-6 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
                                        <span className="font-black text-xs uppercase tracking-widest text-slate-800 bg-slate-200 px-2 py-0.5 rounded">Umrah Packages</span>
                                        <div className="space-y-2 text-xs">
                                            <p className="font-bold text-slate-700 uppercase">Editable Operations Fields:</p>
                                            <ul className="list-disc pl-4 space-y-1.5 text-muted-foreground">
                                                <li>Estimated Travel Date</li>
                                                <li>Group Accommodation Details</li>
                                                <li>Transport Logistics Notes</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                    <div className="space-y-2">
                                        <h4 className="font-black text-sm uppercase text-red-700 flex items-center gap-1.5">
                                            <Lock className="w-4 h-4" /> Financial Integrity Protection
                                        </h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Financial variables such as <strong>Total Price</strong>, <strong>Cost</strong>, and <strong>Profit Margin</strong> cannot be modified from the logistics panel. These fields are auto-locked once the booking draft is finalized and confirmed.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-black text-sm uppercase text-navy flex items-center gap-1.5">
                                            <AlertCircle className="w-4 h-4" /> Status Flow Guidelines
                                        </h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Visa workflows and booking statuses must be processed in sequence. Changes are immediately audited and added to the ledger reports to ensure transparency.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 4. EXPENSE MODULE TAB */}
                {activeTab === "expenses" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <Card className="rounded-[2rem] border-border/60 overflow-hidden shadow-premium">
                            <CardHeader className="bg-muted/30 border-b border-border/40 p-8">
                                <CardTitle className="text-2xl font-black uppercase text-foreground">Expense Module (Outgoing Payments)</CardTitle>
                                <CardDescription>Track payments to suppliers, operational payouts, and customer refunds.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="font-black text-sm uppercase tracking-wider text-emerald-700">What you can do:</h3>
                                        <ul className="space-y-3 text-sm text-muted-foreground">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                                <span><strong>Log Outgoing Transactions:</strong> Keep account statements synchronized.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                                <span><strong>Link Bookings:</strong> Tag expenses to specific client bookings.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                                <span><strong>Audit Log:</strong> Verify paid_to/supplier fields for compliance.</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-black text-sm uppercase tracking-wider text-red-700">Financial Rules:</h3>
                                        <ul className="space-y-3 text-sm text-muted-foreground">
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                                <span>Any change to the **payout amount** requires an explicit confirmation modal verification.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                                <span>Expenses cannot be deleted manually to prevent bookkeeping fraud.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                                <span>Past payments locked in settled accounts require admin override.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 5. SYSTEM ICONS & RULES TAB */}
                {activeTab === "guide" && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Buttons Guide Section */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                Button Icons Directory
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="p-5 bg-white rounded-2xl border border-border/40 shadow-sm flex flex-col items-center text-center space-y-2">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <Edit2 className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs uppercase tracking-wider">✏️ Edit Button</span>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Modify profile records, ticket numbers, or operational fields.</p>
                                </div>

                                <div className="p-5 bg-white rounded-2xl border border-border/40 shadow-sm flex flex-col items-center text-center space-y-2">
                                    <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                                        <Trash2 className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs uppercase tracking-wider">🗑️ Delete Button</span>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Soft delete (archive) entries. Does not permanently remove.</p>
                                </div>

                                <div className="p-5 bg-white rounded-2xl border border-border/40 shadow-sm flex flex-col items-center text-center space-y-2">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <Check className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs uppercase tracking-wider">💾 Save Button</span>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Write changes to the database and update relevant views.</p>
                                </div>

                                <div className="p-5 bg-white rounded-2xl border border-border/40 shadow-sm flex flex-col items-center text-center space-y-2">
                                    <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
                                        <X className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-xs uppercase tracking-wider">❌ Cancel Button</span>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Close modal dialog, discard pending changes safely.</p>
                                </div>
                            </div>
                        </div>

                        {/* Crucial Warning Box */}
                        <div className="space-y-4 pt-4 border-t border-border/60">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 text-red-700">
                                <ShieldAlert className="w-6 h-6" />
                                Critical System Warnings
                            </h2>
                            
                            <Card className="border-red-200 bg-red-50/20 rounded-[2rem] overflow-hidden">
                                <CardContent className="p-8 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />
                                        <div className="space-y-2 text-red-900">
                                            <p className="font-black uppercase tracking-wider text-sm">Rules that must not be broken:</p>
                                            <ul className="list-disc pl-5 space-y-2 text-xs text-red-950/80 leading-relaxed font-medium">
                                                <li><strong>No CNIC/Passport Editing:</strong> Handled through secure workflows to comply with civil regulatory standards.</li>
                                                <li><strong>No Financial Modifications:</strong> To protect billing consistency, booking totals and cost values are strictly immutable post-finalization.</li>
                                                <li><strong>Reversals over Deletions:</strong> Double-entry ledger lines cannot be deleted; incorrect payments should be neutralized via reversals.</li>
                                                <li><strong>Auto-Locks:</strong> The system automatically blocks payouts that exceed booking costs to shield business margins.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* Support Footer */}
            <div className="p-8 rounded-[2rem] bg-navy text-white text-center space-y-3 shadow-premium-lg">
                <h3 className="text-xl font-display font-black uppercase tracking-wide">Need Admin Support?</h3>
                <p className="max-w-md mx-auto opacity-80 text-xs">
                    If you require database updates, access overrides, or report system anomalies, please alert your administrator.
                </p>
                <div className="pt-2">
                    <button className="bg-gold text-white hover:bg-gold-light px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-xs shadow-gold-lg transition-all duration-300">
                        Contact Support
                    </button>
                </div>
                <div className="pt-4 border-t border-white/10 mt-4 flex flex-col items-center gap-1">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">System Information</p>
                    <p className="text-[10px] text-white/40">
                        v1.0.0 &nbsp;|&nbsp; Lead Developer: <span className="text-gold/60">Iqra Zakir</span> &nbsp;|&nbsp; Former Developer: <span className="text-white/50">M. Asim Khan</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
