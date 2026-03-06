import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCityStore } from '@/stores/city.store';

export function CitySelector() {
  const { t } = useTranslation();
  const { selectedCity, cities, setCity } = useCityStore();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={t('city.selectCity', 'Select city')}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        <span className="hidden sm:inline">{selectedCity}</span>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-white py-1 shadow-lg animate-fade-in z-50">
          <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('city.selectCity', 'Select City')}
          </p>
          {cities.map((city) => (
            <button
              key={city.name}
              onClick={() => {
                setCity(city.name);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                selectedCity === city.name
                  ? 'bg-primary/5 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {selectedCity === city.name && (
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
              <span className={selectedCity === city.name ? '' : 'ml-6'}>{city.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
