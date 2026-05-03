import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface AgentStatementPrintProps {
    agentName: string;
    agentPhone: string;
    balance: number;
    transactions: any[];
}

export function AgentStatementPrint({ agentName, agentPhone, balance, transactions }: AgentStatementPrintProps) {
    return (
        <div className="hidden print:block p-8 bg-white text-black min-h-screen font-sans">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                <div className="flex gap-4 items-center">
                    <img src="/logo-main.png" alt="Logo" className="w-16 h-16 object-contain" />
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter">Akbar Pura Travels</h1>
                        <p className="text-xs font-bold text-gray-600">Premium Travel & Tours Management Suite</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-black text-gold uppercase underline decoration-2">Agent Statement</h2>
                    <p className="text-[10px] text-gray-500 mt-1">Generated on: {format(new Date(), "PPP p")}</p>
                </div>
            </div>

            {/* Agent Info */}
            <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Statement For</p>
                    <p className="text-lg font-black">{agentName}</p>
                    <p className="text-sm font-medium text-gray-600">{agentPhone}</p>
                </div>
                <div className="text-right space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Balance</p>
                    <p className={`text-2xl font-black ${balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        Rs {Math.abs(balance).toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        {balance >= 0 ? "Outstanding Receivable" : "Accounts Payable"}
                    </p>
                </div>
            </div>

            {/* Transactions Table */}
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-black text-white text-[10px] font-black uppercase tracking-widest">
                        <th className="py-3 px-4 text-left border border-gray-300">Date</th>
                        <th className="py-3 px-4 text-left border border-gray-300">Description</th>
                        <th className="py-3 px-4 text-left border border-gray-300">Ref / Invoice</th>
                        <th className="py-3 px-4 text-right border border-gray-300">Debit (Out)</th>
                        <th className="py-3 px-4 text-right border border-gray-300">Credit (In)</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((t, i) => (
                        <tr key={t.id} className={`text-sm border-b border-gray-200 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="py-3 px-4 border border-gray-200 font-medium">
                                {format(new Date(t.performed_at), "dd MMM yyyy")}
                            </td>
                            <td className="py-3 px-4 border border-gray-200">
                                <div className="flex flex-col">
                                    <span className="font-bold">{t.notes || "Standard Settlement"}</span>
                                    {t.reversed && <span className="text-[9px] text-red-600 font-black uppercase tracking-tighter">[REVERSED]</span>}
                                </div>
                            </td>
                            <td className="py-3 px-4 border border-gray-200 text-xs font-mono">
                                {t.bookings?.invoice_no || "---"}
                            </td>
                            <td className="py-3 px-4 border border-gray-200 text-right font-bold text-red-600">
                                {t.direction === 'SEND' ? `Rs ${t.amount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-3 px-4 border border-gray-200 text-right font-bold text-emerald-700">
                                {t.direction === 'RECEIVE' ? `Rs ${t.amount.toLocaleString()}` : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Summary Footer */}
            <div className="mt-8 pt-6 border-t-2 border-black flex justify-between items-start">
                <div className="max-w-[300px]">
                    <p className="text-[10px] font-bold text-gray-500 italic">
                        Note: This is a computer-generated statement. Please report any discrepancies within 3 business days.
                    </p>
                </div>
                <div className="w-[250px] space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Total Outflow:</span>
                        <span className="font-bold text-red-600">Rs {transactions.filter(t => t.direction === 'SEND').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Total Inflow:</span>
                        <span className="font-bold text-emerald-700">Rs {transactions.filter(t => t.direction === 'RECEIVE').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-gray-300 my-2" />
                    <div className="flex justify-between items-end">
                        <span className="text-[12px] font-black uppercase tracking-widest">Net Balance:</span>
                        <span className="text-lg font-black underline decoration-double">Rs {Math.abs(balance).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Footer Signatures */}
            <div className="mt-20 flex justify-between px-10">
                <div className="text-center">
                    <div className="w-40 border-b border-black mb-1" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Accounts Department</p>
                </div>
                <div className="text-center">
                    <div className="w-40 border-b border-black mb-1" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Agent Acknowledgment</p>
                </div>
            </div>
        </div>
    );
}
