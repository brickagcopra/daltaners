const BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  halal: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Halal' },
  vegan: { bg: 'bg-green-100', text: 'text-green-700', label: 'Vegan' },
  vegetarian: { bg: 'bg-lime-100', text: 'text-lime-700', label: 'Vegetarian' },
  'gluten-free': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Gluten-Free' },
  kosher: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Kosher' },
  organic: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Organic' },
};

interface DietaryBadgeProps {
  tag: string;
  size?: 'sm' | 'md';
}

export function DietaryBadge({ tag, size = 'sm' }: DietaryBadgeProps) {
  const style = BADGE_STYLES[tag] || { bg: 'bg-gray-100', text: 'text-gray-700', label: tag };
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${style.bg} ${style.text} ${sizeClasses}`}>
      {style.label}
    </span>
  );
}
