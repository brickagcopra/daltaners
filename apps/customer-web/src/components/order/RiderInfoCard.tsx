import { Card, CardContent } from '@/components/ui/Card';

interface RiderInfoCardProps {
  riderName: string;
  vehicleType: string;
  etaMinutes?: number;
  riderPhone?: string;
}

const vehicleIcons: Record<string, string> = {
  motorcycle: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-2-2-3H9v6l-4 1v3c0 .6.4 1 1 1h1',
  bicycle: 'M5 17a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0zM7 17l5-8 4 4h4',
  car: 'M16 3H1v11h15V3zM16 8l4 2v4h-2m-2 0H3m0 0a2 2 0 104 0H3zm10 0a2 2 0 104 0h-4z',
};

export function RiderInfoCard({ riderName, vehicleType, etaMinutes, riderPhone }: RiderInfoCardProps) {
  const iconPath = vehicleIcons[vehicleType] || vehicleIcons.motorcycle;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{riderName}</p>
            <p className="text-xs text-muted-foreground capitalize">{vehicleType.replace(/_/g, ' ')}</p>
          </div>
          {etaMinutes != null && (
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-primary">~{Math.round(etaMinutes)}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">min</p>
            </div>
          )}
        </div>
        {riderPhone && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Contact: <span className="text-foreground font-medium">{riderPhone}</span>
            </p>
          </div>
        )}
        {etaMinutes != null && (
          <p className="mt-2 text-xs text-muted-foreground">
            Arrives in ~{Math.round(etaMinutes)} min
          </p>
        )}
      </CardContent>
    </Card>
  );
}
