import { useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

interface NumpadInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  prefix?: string;
  maxLength?: number;
  allowDecimal?: boolean;
  className?: string;
}

export function NumpadInput({
  value,
  onChange,
  label,
  prefix = '',
  maxLength = 10,
  allowDecimal = true,
  className,
}: NumpadInputProps) {
  const [hasDecimal, setHasDecimal] = useState(value.includes('.'));

  const handlePress = useCallback(
    (key: string) => {
      if (key === 'C') {
        onChange('');
        setHasDecimal(false);
        return;
      }

      if (key === 'backspace') {
        const newVal = value.slice(0, -1);
        onChange(newVal);
        if (!newVal.includes('.')) setHasDecimal(false);
        return;
      }

      if (key === '.') {
        if (!allowDecimal || hasDecimal) return;
        if (value === '') {
          onChange('0.');
        } else {
          onChange(value + '.');
        }
        setHasDecimal(true);
        return;
      }

      // Prevent leading zeros (except before decimal)
      if (value === '0' && key !== '.') {
        onChange(key);
        return;
      }

      if (value.length >= maxLength) return;

      // Limit to 2 decimal places
      if (hasDecimal) {
        const parts = value.split('.');
        if (parts[1] && parts[1].length >= 2) return;
      }

      onChange(value + key);
    },
    [value, onChange, allowDecimal, hasDecimal, maxLength],
  );

  const displayValue = value || '0';

  const numpadKeys = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    [allowDecimal ? '.' : '', '0', 'backspace'],
  ];

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      )}

      {/* Display */}
      <div className="bg-pos-bg border border-pos-border rounded-lg p-4 mb-3 text-right">
        <span className="text-gray-500 text-lg mr-1">{prefix}</span>
        <span className="text-3xl font-bold text-white font-mono">{displayValue}</span>
      </div>

      {/* Numpad Grid */}
      <div className="grid grid-cols-3 gap-2">
        {numpadKeys.flat().map((key, i) => {
          if (key === '') return <div key={i} />;
          if (key === 'backspace') {
            return (
              <Button
                key={i}
                variant="dark"
                size="xl"
                onClick={() => handlePress('backspace')}
                className="text-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
                </svg>
              </Button>
            );
          }
          return (
            <Button
              key={i}
              variant="dark"
              size="xl"
              onClick={() => handlePress(key)}
              className="text-xl font-semibold"
            >
              {key}
            </Button>
          );
        })}
      </div>

      {/* Clear button */}
      <Button
        variant="outline"
        size="lg"
        onClick={() => handlePress('C')}
        className="w-full mt-2"
      >
        Clear
      </Button>
    </div>
  );
}

// Quick amount buttons for cash payments
interface QuickAmountProps {
  amounts: number[];
  onSelect: (amount: number) => void;
  selectedAmount?: number;
  className?: string;
}

export function QuickAmountButtons({ amounts, onSelect, selectedAmount, className }: QuickAmountProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {amounts.map((amount) => (
        <Button
          key={amount}
          variant={selectedAmount === amount ? 'primary' : 'dark'}
          size="lg"
          onClick={() => onSelect(amount)}
          className="font-mono"
        >
          {'\u20B1'}{amount.toLocaleString()}
        </Button>
      ))}
    </div>
  );
}
