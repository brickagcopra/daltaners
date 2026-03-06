import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/components/ui/cn';

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
  navigateOnSearch?: boolean;
  className?: string;
  autoFocus?: boolean;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search for products, stores...',
  onSearch,
  navigateOnSearch = false,
  className,
  autoFocus = false,
  suggestions = [],
  onSuggestionSelect,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearch?.(query);
      }, 300);
    },
    [onSearch],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show suggestions when they arrive and input is focused
  useEffect(() => {
    if (suggestions.length > 0 && value.trim().length >= 2) {
      setShowSuggestions(true);
    }
    setSelectedIdx(-1);
  }, [suggestions, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };

  const selectSuggestion = (suggestion: string) => {
    setValue(suggestion);
    setShowSuggestions(false);
    onSuggestionSelect?.(suggestion);
    onSearch?.(suggestion);
    if (navigateOnSearch) {
      navigate(`/search?q=${encodeURIComponent(suggestion)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[selectedIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setShowSuggestions(false);
    onSearch?.(value);
    if (navigateOnSearch && value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  const handleClear = () => {
    setValue('');
    setShowSuggestions(false);
    onSearch?.('');
  };

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0 && value.trim().length >= 2) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              'h-10 w-full rounded-full border border-border bg-white pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              'transition-all duration-200',
            )}
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Autocomplete Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg">
          {suggestions.map((suggestion, idx) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
                  idx === selectedIdx
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                <svg
                  className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
