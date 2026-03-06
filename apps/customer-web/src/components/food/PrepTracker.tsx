import { useTranslation } from 'react-i18next';

interface PrepTrackerProps {
  status: string;
}

const PREP_STEPS = [
  { key: 'confirmed', label: 'food.prepConfirmed' },
  { key: 'preparing', label: 'food.prepPreparing' },
  { key: 'ready', label: 'food.prepReady' },
  { key: 'picked_up', label: 'food.prepPickedUp' },
];

function getStepIndex(status: string): number {
  const idx = PREP_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

export function PrepTracker({ status }: PrepTrackerProps) {
  const { t } = useTranslation();
  const currentIndex = getStepIndex(status);

  if (currentIndex < 0) return null;

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        {t('food.prepProgress', 'Preparation Progress')}
      </h3>
      <div className="flex items-center justify-between">
        {PREP_STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              {/* Line + Circle */}
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div className={`h-0.5 flex-1 ${idx <= currentIndex ? 'bg-primary' : 'bg-muted'}`} />
                )}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                    isCompleted
                      ? 'border-primary bg-primary text-white'
                      : isCurrent
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted bg-white text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span className="text-xs font-medium">{idx + 1}</span>
                  )}
                </div>
                {idx < PREP_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 ${idx < currentIndex ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
              {/* Label */}
              <span
                className={`mt-2 text-[10px] text-center ${
                  isCurrent ? 'font-semibold text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t(step.label, step.key)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
