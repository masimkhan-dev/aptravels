/**
 * PaymentHistoryTable.tsx
 * Extracted from AdminBookingDetail.tsx — renders the payment ledger.
 * All state and handlers remain in the parent. This component is PURE UI.
 */

import { DollarSign, Loader2, X, History, TrendingUp, Check } from 'lucide-react';

interface Payment {
  id:             string;
  amount_paid:    number;
  payment_method: string;
  reference_no:   string | null;
  payment_date:   string;
  voided:         boolean;
  void_reason:    string | null;
}

export interface PaymentHistoryTableProps {
  payments:          Payment[];
  totalPrice:        number;
  balance:           number;
  totalPaid:         number;
  role:              string | null;
  bookingStatus:     string;
  margin:            number | null;

  // Payment form state (lifted to parent)
  payAmount:         string;
  payMethod:         string;
  payDate:           string;
  paying:            boolean;
  onPayAmountChange: (v: string) => void;
  onPayMethodChange: (v: string) => void;
  onPayDateChange:   (v: string) => void;
  onSubmitPayment:   (e: React.FormEvent) => void;

  // Margin editing state (lifted to parent)
  isEditingMargin:    boolean;
  editMarginValue:    string;
  updatingMargin:     boolean;
  onToggleMargin:     () => void;
  onMarginChange:     (v: string) => void;
  onSaveMargin:       () => void;

  // Void modal (lifted to parent)
  onOpenVoid:         (id: string) => void;
  voidTargetId:       string | null;
  voidReason:         string;
  voiding:            boolean;
  onVoidReasonChange: (v: string) => void;
  onVoidConfirm:      () => void;
  onVoidCancel:       () => void;

  onOpenEditPrice?:   () => void;
}

export function PaymentHistoryTable({
  payments,
  totalPrice,
  balance,
  totalPaid,
  role,
  bookingStatus,
  margin,
  payAmount, payMethod, payDate, paying,
  onPayAmountChange, onPayMethodChange, onPayDateChange, onSubmitPayment,
  isEditingMargin, editMarginValue, updatingMargin,
  onToggleMargin, onMarginChange, onSaveMargin,
  onOpenVoid,
  voidTargetId, voidReason, voiding,
  onVoidReasonChange, onVoidConfirm, onVoidCancel,
  onOpenEditPrice
}: PaymentHistoryTableProps) {
  const isPrivileged = role === 'admin' || role === 'manager';
  const isTerminal   = bookingStatus === 'Completed' || bookingStatus === 'Voided';

  return (
    <>
      {/* Transaction History Card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-gold" /> Transaction History
          </h3>
          <div className="text-right">
            <p className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mb-1">Current Balance Due</p>
            <p className="text-2xl font-black text-gold">Rs {balance.toLocaleString()}</p>
          </div>
        </div>

        {/* Profit Margin Section */}
        {isPrivileged && margin !== undefined && (
          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 m-6 mb-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Profit Margin</span>
              </div>
              <button
                onClick={onToggleMargin}
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tight"
              >
                {isEditingMargin ? 'Cancel' : 'Edit Margin'}
              </button>
            </div>
            {isEditingMargin ? (
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 text-[10px] font-black">Rs</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-emerald-200 bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-emerald-700"
                    value={editMarginValue}
                    onChange={e => onMarginChange(e.target.value)}
                  />
                </div>
                <button
                  onClick={onSaveMargin}
                  disabled={updatingMargin}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {updatingMargin ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
              </div>
            ) : (
              <p className="text-xl font-black text-emerald-700">Rs {Number(margin || 0).toLocaleString()}</p>
            )}
          </div>
        )}

        {/* Payment Rows */}
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
                  {isPrivileged && (
                    <p className="text-[9px] text-destructive italic font-medium max-w-[120px] truncate">{p.void_reason}</p>
                  )}
                </div>
              ) : (
                isPrivileged && (
                  <button
                    onClick={() => onOpenVoid(p.id)}
                    className="text-[10px] text-muted-foreground hover:text-destructive font-bold uppercase tracking-widest border border-border px-3 py-1 rounded-full hover:border-destructive transition-all"
                  >
                    Void
                  </button>
                )
              )}
            </div>
          ))}
        </div>

        <div className="p-6 bg-muted/10 border-t border-border flex justify-between items-center font-bold flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm">Total Quote: Rs {Number(totalPrice).toLocaleString()}</span>
            {isPrivileged && !isTerminal && onOpenEditPrice && (
              <button 
                onClick={onOpenEditPrice}
                className="text-[10px] text-blue-500 hover:text-blue-600 uppercase tracking-widest font-black bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded transition-colors"
                title="Edit Total Price"
              >
                Edit
              </button>
            )}
          </div>
          <span className="text-sm text-green-500">Net Received: Rs {totalPaid.toLocaleString()}</span>
        </div>
      </div>

      {/* Add Payment Form */}
      {isPrivileged && !isTerminal && (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" /> Professional Receipting
          </h3>
          <form onSubmit={onSubmitPayment} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">Rs</span>
              <input
                type="number"
                placeholder="0.00"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-gold font-bold"
                value={payAmount}
                onChange={e => onPayAmountChange(e.target.value)}
              />
            </div>
            <input
              type="date"
              className="px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-gold text-sm"
              value={payDate}
              onChange={e => onPayDateChange(e.target.value)}
            />
            <select
              className="px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-gold font-medium"
              value={payMethod}
              onChange={e => onPayMethodChange(e.target.value)}
            >
              <option value="Cash">Cash Payment</option>
              <option value="Bank Transfer">Bank Transfer / Online</option>
              <option value="Cheque">Cheque Deposit</option>
            </select>
            <button
              disabled={paying}
              className="bg-gold-gradient text-secondary rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-gold"
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              {paying ? 'Recording...' : 'Add Payment'}
            </button>
          </form>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {voidTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border bg-destructive/5 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-destructive">Void Payment</h3>
                <p className="text-xs text-muted-foreground mt-0.5">This action is irreversible and will be logged.</p>
              </div>
              <button onClick={onVoidCancel} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">
                  Void Reason <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={voidReason}
                  onChange={e => onVoidReasonChange(e.target.value)}
                  minLength={10}
                  rows={3}
                  placeholder="Describe the reason for voiding (min. 10 characters)..."
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-destructive text-sm resize-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">{voidReason.length}/10 minimum characters</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onVoidCancel}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={onVoidConfirm}
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
    </>
  );
}
