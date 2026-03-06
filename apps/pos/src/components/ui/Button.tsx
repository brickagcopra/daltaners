import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm',
        secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 shadow-sm',
        success: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm',
        danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
        warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
        ghost: 'text-gray-300 hover:bg-pos-hover hover:text-white',
        outline: 'border border-pos-border text-gray-300 hover:bg-pos-hover hover:text-white',
        dark: 'bg-pos-card text-gray-300 hover:bg-pos-hover border border-pos-border',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  kbd?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, kbd, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : null}
        {children}
        {kbd ? <span className="kbd ml-1">{kbd}</span> : null}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { buttonVariants };
