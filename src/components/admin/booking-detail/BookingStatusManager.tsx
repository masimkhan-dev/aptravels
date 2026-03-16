/**
 * BookingStatusManager.tsx
 * Extracted from AdminBookingDetail.tsx — renders the status badge/dropdown.
 * Admin/manager users see an editable dropdown; others see a read-only badge.
 */

export interface BookingStatusManagerProps {
  status:          string;
  bookingType:     string;
  invoiceNo:       string;
  role:            string | null;
  onStatusChange:  (newStatus: string) => void;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  Draft:     ['Draft', 'Confirmed', 'Voided'],
  Confirmed: ['Confirmed', 'Completed', 'Voided'],
  Completed: ['Completed'],
  Voided:    ['Voided'],
};

const STATUS_COLORS: Record<string, string> = {
  Voided:    'bg-destructive/10 text-destructive ring-destructive/20',
  Completed: 'bg-green-500/10 text-green-600 ring-green-500/20',
  Confirmed: 'bg-gold/10 text-gold ring-gold/20',
  Draft:     'bg-muted text-muted-foreground ring-border',
};

export function BookingStatusManager({
  status,
  bookingType,
  invoiceNo,
  role,
  onStatusChange,
}: BookingStatusManagerProps) {
  const isPrivileged = role === 'admin' || role === 'manager';
  const isTerminal   = status === 'Completed' || status === 'Voided';
  const allowedStatuses = STATUS_TRANSITIONS[status] ?? [status];
  const colorClass = STATUS_COLORS[status] ?? STATUS_COLORS.Draft;

  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-sm font-mono text-muted-foreground uppercase">{invoiceNo}</span>
      <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-muted text-muted-foreground">
        {bookingType}
      </span>

      {isPrivileged ? (
        <select
          value={status}
          onChange={e => onStatusChange(e.target.value)}
          disabled={isTerminal}
          className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ring-1 outline-none cursor-pointer transition-all
            ${colorClass}
            ${isTerminal ? 'cursor-not-allowed opacity-70' : 'hover:opacity-80'}`}
        >
          {allowedStatuses.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ) : (
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ring-1 ${colorClass}`}>
          {status}
        </span>
      )}
    </div>
  );
}
