/**
 * CustomerIdentityPanel.tsx
 * Extracted from AdminBookingDetail.tsx — renders customer identity info.
 * Role-aware: cnic_passport is only visible when explicitly revealed by an
 * admin/manager via the reveal button. The raw PII data must be fetched by
 * the parent (via get_customer_pii RPC) and passed as a prop.
 */

import { User, Eye, EyeOff } from 'lucide-react';

export interface CustomerIdentityPanelProps {
  customerName:    string;
  phone:           string;
  address:         string | null;
  cnicPassport:    string | null; // raw value from parent; null until revealed
  role:            string | null;
  cnicRevealed:    boolean;
  onToggleCnic:    () => void;
}

export function CustomerIdentityPanel({
  customerName,
  phone,
  address,
  cnicPassport,
  role,
  cnicRevealed,
  onToggleCnic,
}: CustomerIdentityPanelProps) {
  const isPrivileged = role === 'admin' || role === 'manager';

  const maskedCnic = '•••••-•••••••-•';
  const displayCnic = cnicRevealed && cnicPassport ? cnicPassport : maskedCnic;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-black mb-4 flex items-center gap-2">
        <User className="w-3.5 h-3.5 text-gold" /> Customer Identity
      </h3>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Full Name</p>
          <p className="font-bold text-foreground">{customerName}</p>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Phone</p>
          <p className="font-medium text-foreground">{phone}</p>
        </div>

        {address && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Address</p>
            <p className="font-medium text-foreground text-sm">{address}</p>
          </div>
        )}

        {/* CNIC / Passport: masked by default, reveal only for privileged roles */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">CNIC / Passport</p>
            {isPrivileged && (
              <button
                onClick={onToggleCnic}
                className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-gold transition-colors font-bold uppercase tracking-tight"
                title={cnicRevealed ? 'Mask CNIC' : 'Reveal CNIC (Privileged)'}
              >
                {cnicRevealed
                  ? <><EyeOff className="w-3 h-3" /> Mask</>
                  : <><Eye className="w-3 h-3" /> Reveal</>
                }
              </button>
            )}
          </div>
          <p className={`font-mono font-black text-sm ${cnicRevealed ? 'text-foreground' : 'text-muted-foreground tracking-widest'}`}>
            {displayCnic}
          </p>
          {!isPrivileged && (
            <p className="text-[9px] text-muted-foreground mt-0.5 italic">
              CNIC is restricted to admin/manager roles.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
