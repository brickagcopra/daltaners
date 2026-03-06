import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 bg-pos-surface rounded-lg p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
            activeTab === tab.id
              ? 'bg-primary-500 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-pos-hover',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'min-w-[1.25rem] h-5 flex items-center justify-center rounded-full text-xs font-semibold px-1.5',
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-pos-border text-gray-400',
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
