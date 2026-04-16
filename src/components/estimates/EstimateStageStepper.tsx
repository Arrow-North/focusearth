import { Check, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EstimateStage, OrderPath } from '@/types/database';

const STAGES: { key: EstimateStage; label: string }[] = [
  { key: 'created', label: 'Created' },
  { key: 'estimate', label: 'Estimate' },
  { key: 'approved', label: 'Approved' },
  { key: 'order', label: 'Order' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'receipt', label: 'Receipt' },
  { key: 'fulfilled', label: 'Fulfilled' },
];

interface EstimateStageStepperProps {
  currentStage: EstimateStage;
  orderPath: OrderPath;
}

function isStageCompleted(stage: EstimateStage, orderPath: OrderPath): boolean {
  switch (stage) {
    case 'created':
      return true;
    case 'estimate':
      return orderPath.is_estimate === true;
    case 'approved':
      return (orderPath.su_approved === true || orderPath.reu_approved === true) && orderPath.admin_signed;
    case 'order':
      return orderPath.is_order === true;
    case 'shipping':
      return orderPath.is_shipping === true;
    case 'invoice':
      return orderPath.is_invoice === true;
    case 'receipt':
      return orderPath.is_receipt === true;
    case 'fulfilled':
      return orderPath.marked_fulfilled === true;
    default:
      return false;
  }
}

export function EstimateStageStepper({ currentStage, orderPath }: EstimateStageStepperProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="space-y-3">
      <div className="flex items-center w-full gap-0.5">
        {STAGES.map((stage, index) => {
          const completed = isStageCompleted(stage.key, orderPath);
          const isCurrent = stage.key === currentStage;

          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium border-2 transition-colors',
                    completed && !isCurrent && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'border-primary bg-primary/10 text-primary',
                    !completed && !isCurrent && 'border-muted-foreground/30 text-muted-foreground/40'
                  )}
                >
                  {completed && !isCurrent ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                <span
                  className={cn(
                    'text-[9px] font-medium whitespace-nowrap',
                    isCurrent && 'text-primary',
                    completed && !isCurrent && 'text-foreground',
                    !completed && !isCurrent && 'text-muted-foreground/40'
                  )}
                >
                  {stage.label}
                </span>
              </div>

              {index < STAGES.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-0.5 mt-[-14px]',
                    index < currentIndex ? 'bg-primary' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Archive indicator */}
      {orderPath.archived && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
          <Archive className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">Archived</span>
        </div>
      )}
    </div>
  );
}
