import React, {
  forwardRef,
  useEffect,
  useRef,
  useState
} from 'react';

import { Check, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';




export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* =========================================================
   Button
========================================================= */

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'whatsapp';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-full font-medium ' +
      'transition-all duration-200 ease-out ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ' +
      'disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      primary:
        'bg-brand-500 text-white hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm',

      secondary:
        'bg-charcoal text-white hover:bg-charcoal-light hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',

      outline:
        'border border-brand-500 text-brand-600 hover:bg-brand-50 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0',

      ghost:
        'text-charcoal hover:bg-brand-50 hover:text-brand-600 active:bg-brand-100',

      whatsapp:
        'bg-[#25D366] text-white hover:bg-[#128C7E] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0'
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-base',
      lg: 'h-14 px-8 text-lg'
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />

            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

/* =========================================================
   Input
========================================================= */

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-charcoal mb-1.5">
            {label}
          </label>
        )}

        <input
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm',
            'ring-offset-white',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-charcoal-lighter',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            'focus-visible:border-brand-400',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200 ease-out',
            'hover:border-brand-300',
            error &&
              'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500',
            className
          )}
          {...props}
        />

        {error && (
          <p className="mt-1.5 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/* =========================================================
   Textarea
========================================================= */

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ className, label, error, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-charcoal mb-1.5">
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm',
          'ring-offset-white',
          'placeholder:text-charcoal-lighter',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          'focus-visible:border-brand-400',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200 ease-out',
          'hover:border-brand-300',
          error &&
            'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500',
          className
        )}
        {...props}
      />

      {error && (
        <p className="mt-1.5 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

/* =========================================================
   Card
========================================================= */

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-brand-100 bg-white shadow-soft overflow-hidden',
        'transition-all duration-300 ease-out',
        'hover:shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* =========================================================
   Badge
========================================================= */

export function Badge({
  className,
  variant = 'default',
  children
}: {
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  const variants = {
    default: 'bg-brand-100 text-brand-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
/* =========================================================
   Select
========================================================= */

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(
    (option) => option.value === value
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={selectRef}
      className={cn(
        'relative',
        className
      )}
    >
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'group flex h-11 w-full items-center justify-between',
          'rounded-2xl border border-brand-200 bg-white',
          'px-4 text-sm font-medium text-charcoal',
          'shadow-sm',
          'transition-all duration-200 ease-out',
          'hover:border-brand-400 hover:shadow-md',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isOpen &&
            'border-brand-500 shadow-md ring-2 ring-brand-500/15'
        )}
      >
        <span
          className={cn(
            'truncate leading-none',
            !selectedOption && 'text-charcoal-lighter'
          )}
        >
          {selectedOption?.label || placeholder}
        </span>

        <ChevronDown
          className={cn(
            'ml-3 h-4 w-4 flex-shrink-0',
            'text-charcoal-light',
            'transition-all duration-200 ease-out',
            'group-hover:text-brand-500',
            isOpen && 'rotate-180 text-brand-500'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="
            absolute
            left-0
            right-0
            z-50
            mt-2
            rounded-2xl
            border
            border-brand-100
            bg-white
            p-2
            shadow-xl
            origin-top
            animate-in
            fade-in
            zoom-in-95
            duration-150
          "
        >
          <div className="space-y-1">
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex w-full items-center justify-between',
                    'rounded-xl px-3.5 py-2.5',
                    'text-left text-sm',
                    'font-medium tracking-[0.01em]',
                    'transition-all duration-150 ease-out',
                    'text-charcoal-light',
                    'hover:bg-brand-50 hover:text-brand-700',
                    'hover:translate-x-0.5',
                    isSelected &&
                      'bg-brand-50 text-brand-700'
                  )}
                >
                  <span className="leading-5">
                    {option.label}
                  </span>

                  {isSelected && (
                    <span className="ml-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}