/**
 * VisaWorkflowTracker.tsx
 * Extracted from AdminBookingDetail.tsx — renders the visa stamping pipeline.
 * Only shown when booking_type === 'Visa'. Pure UI; parent keeps toggle handler.
 */

import { FileText, Check } from 'lucide-react';

interface VisaStep {
  key:   string;
  label: string;
}

const VISA_STEPS: VisaStep[] = [
  { key: 'visa_step_passport_received',  label: 'Passport Received' },
  { key: 'visa_step_medical_cleared',    label: 'Medical Cleared' },
  { key: 'visa_step_enumber_generated',  label: 'E-Number Generated' },
  { key: 'visa_step_protector_stamp',    label: 'Protector Stamp' },
  { key: 'visa_step_final_stamping',     label: 'Final Stamping' },
];

export interface VisaWorkflowTrackerProps {
  /** Booking data — only `visa_step_*` fields are accessed */
  booking: Record<string, unknown>;
  role:    string | null;
  onToggleStep: (key: string, currentValue: boolean) => void;
}

export function VisaWorkflowTracker({
  booking,
  role,
  onToggleStep,
}: VisaWorkflowTrackerProps) {
  const canEdit = role === 'admin' || role === 'manager' || role === 'ops';
  const completedCount = VISA_STEPS.filter(s => Boolean(booking[s.key])).length;
  const progressPercent = (completedCount / VISA_STEPS.length) * 100;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-500 mb-8">
      <div className="p-6 border-b border-border bg-blue-500/[0.03] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="font-bold text-sm text-blue-600 uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4" /> Visa Stamping Pipeline
            </h3>
          </div>
          <p className="text-[10px] text-muted-foreground font-black tracking-widest uppercase">
            System Tracked • Stage {completedCount}/5
          </p>
        </div>
        <div className="bg-blue-600/10 px-4 py-2 rounded-xl border border-blue-600/20">
          <p className="text-2xl font-black text-blue-600 leading-none">{Math.round(progressPercent)}%</p>
          <p className="text-[8px] font-bold text-blue-400 uppercase mt-1 text-center">Done</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pt-5">
        <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/50 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.4)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step Buttons */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {VISA_STEPS.map((step, idx) => {
          const isDone = Boolean(booking[step.key]);
          return (
            <button
              key={step.key}
              onClick={() => canEdit && onToggleStep(step.key, isDone)}
              className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all text-center relative overflow-hidden group
                ${isDone
                  ? 'bg-emerald-600 border-emerald-600 shadow-lg shadow-emerald-500/20 -translate-y-0.5'
                  : 'bg-background border-border hover:border-blue-400 hover:bg-muted/50'
                }
                ${!canEdit ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={!canEdit}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform duration-300
                ${canEdit ? 'group-hover:scale-110' : ''}
                ${isDone ? 'bg-white/20 border-white text-white' : 'bg-muted border-border text-muted-foreground'}`}
              >
                {isDone ? <Check className="w-4 h-4" /> : <span className="text-[10px] font-black">{idx + 1}</span>}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tight leading-tight ${isDone ? 'text-white' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
              {/* Shimmer on done */}
              {isDone && (
                <div className="absolute top-0 left-[-100%] w-full h-full bg-white/10 skew-x-[-20deg] group-hover:left-[100%] transition-all duration-1000" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
