import { cn } from '@/lib/cn';

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd className={cn('kbd', className)}>
      {children}
    </kbd>
  );
}

interface ShortcutHintProps {
  shortcut: string;
  label: string;
  className?: string;
}

export function ShortcutHint({ shortcut, label, className }: ShortcutHintProps) {
  const keys = shortcut.split('+').map((k) => k.trim());

  return (
    <div className={cn('flex items-center gap-2 text-gray-500 text-xs', className)}>
      <div className="flex items-center gap-0.5">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center gap-0.5">
            {i > 0 && <span className="text-gray-600">+</span>}
            <Kbd>{key.toUpperCase()}</Kbd>
          </span>
        ))}
      </div>
      <span>{label}</span>
    </div>
  );
}
