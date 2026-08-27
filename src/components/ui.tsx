import React, {
  forwardRef,
  useEffect,
  useRef,
  useState
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import brandLogoImg from '../assets/pictures/logo.png';

/* =========================================================
   Shared className utility
   ========================================================= */

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* =========================================================
   Brand Logo & Icon Mark
   ========================================================= */

interface BrandLogoProps {
  className?: string;
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  taglineText?: string;
  isDarkTheme?: boolean;
  showText?: boolean;
}

export function BrandLogo({
  className,
  size = 'md',
  showTagline = false,
  taglineText = 'If you can imagine it, we can print it.',
  isDarkTheme = false,
  showText = true,
}: BrandLogoProps) {
  const markSizes = {
    sm: 'h-8 w-8 rounded-lg',
    md: 'h-10 w-10 sm:h-11 sm:w-11 rounded-xl',
    lg: 'h-12 w-12 sm:h-14 sm:w-14 rounded-2xl',
    xl: 'h-16 w-16 sm:h-20 sm:w-20 rounded-2xl',
  };

  const titleSizes = {
    sm: 'text-sm font-bold',
    md: 'text-base sm:text-lg font-bold',
    lg: 'text-lg sm:text-xl font-bold',
    xl: 'text-2xl font-bold',
  };

  return (
    <div className={cn('flex items-center gap-2.5 sm:gap-3 select-none group', className)}>
      {/* Official Company Logo Emblem */}
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden border shadow-soft transition-transform duration-300 group-hover:scale-105 shrink-0',
          markSizes[size],
          isDarkTheme ? 'border-zinc-800 bg-white/95 ring-1 ring-white/10' : 'bg-white border-line'
        )}
        aria-hidden="true"
      >
        <img
          src={brandLogoImg}
          alt="Shilp Sahayak Logo"
          className="h-full w-full object-contain p-0.5"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
          }}
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              'font-display tracking-tight leading-none',
              isDarkTheme ? 'text-white' : 'text-ink',
              titleSizes[size]
            )}
          >
            SHILP <span className="text-accent">SAHAYAK</span>
          </span>

          {showTagline && (
            <span
              className={cn(
                'font-sans text-[11px] font-medium tracking-wide mt-1 leading-tight',
                isDarkTheme ? 'text-zinc-400' : 'text-muted'
              )}
            >
              {taglineText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Button
   ========================================================= */

export interface ButtonProps
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
      isLoading = false,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 ' +
      'font-sans font-semibold tracking-[-0.01em] ' +
      'rounded-xl border transition-all duration-200 ease-out ' +
      'focus-visible:outline-none focus-visible:ring-2 ' +
      'focus-visible:ring-accent/40 focus-visible:ring-offset-2 ' +
      'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]';

    const variants = {
      primary:
        'border-accent bg-accent text-white shadow-sm ' +
        'hover:bg-accent-dark hover:border-accent-dark hover:shadow-accent/25 hover:shadow-md',

      secondary:
        'border-dark bg-dark text-white ' +
        'hover:bg-zinc-800 hover:border-zinc-800 hover:shadow-md',

      outline:
        'border-line bg-white text-ink ' +
        'hover:border-accent hover:bg-accent-soft hover:text-accent',

      ghost:
        'border-transparent bg-transparent text-muted ' +
        'hover:bg-accent-soft hover:text-accent',

      whatsapp:
        'border-[#25D366] bg-[#25D366] text-white shadow-sm ' +
        'hover:bg-[#1EBE5D] hover:border-[#1EBE5D] hover:shadow-emerald-500/25 hover:shadow-md'
    };

    const sizes = {
      sm: 'h-9 px-3.5 text-xs font-semibold',
      md: 'h-11 px-5 text-sm font-semibold',
      lg: 'h-13 px-7 text-base font-semibold'
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || disabled}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block font-mono text-xs font-semibold uppercase tracking-wider text-muted"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'flex h-11 w-full rounded-xl border bg-white px-3.5 py-2.5',
            'text-sm text-ink shadow-sm font-sans',
            'placeholder:text-muted/70',
            'transition-all duration-150 ease-out',
            'border-line hover:border-zinc-300',
            'focus:border-accent focus:outline-none',
            'focus:ring-2 focus:ring-accent/15',
            'disabled:cursor-not-allowed disabled:bg-shell disabled:opacity-60',
            'file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium',
            error &&
              'border-red-500 focus:border-red-500 focus:ring-red-500/15',
            className
          )}
          {...props}
        />

        {error && (
          <p
            id={errorId}
            className="mt-1.5 font-sans text-xs leading-relaxed text-red-600 font-medium"
          >
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

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ className, label, error, id, ...props }, ref) => {
  const generatedId = React.useId();
  const textareaId = id || generatedId;
  const errorId = `${textareaId}-error`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="mb-1.5 block font-mono text-xs font-semibold uppercase tracking-wider text-muted"
        >
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'flex min-h-[100px] w-full resize-y rounded-xl border bg-white px-3.5 py-2.5',
          'text-sm leading-relaxed text-ink shadow-sm font-sans',
          'placeholder:text-muted/70',
          'transition-all duration-150 ease-out',
          'border-line hover:border-zinc-300',
          'focus:border-accent focus:outline-none',
          'focus:ring-2 focus:ring-accent/15',
          'disabled:cursor-not-allowed disabled:bg-shell disabled:opacity-60',
          error &&
            'border-red-500 focus:border-red-500 focus:ring-red-500/15',
          className
        )}
        {...props}
      />

      {error && (
        <p
          id={errorId}
          className="mt-1.5 font-sans text-xs leading-relaxed text-red-600 font-medium"
        >
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
        'rounded-2xl border border-line bg-white',
        'shadow-soft transition-all duration-200',
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
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  const variants = {
    default:
      'border-line bg-shell text-ink',
    brand:
      'border-accent/30 bg-accent-soft text-accent',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning:
      'border-amber-200 bg-amber-50 text-amber-700',
    danger:
      'border-rose-200 bg-rose-50 text-rose-700'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5',
        'font-mono text-[11px] font-bold uppercase tracking-wider',
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

export interface SelectProps {
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

  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    openUpward: boolean;
  } | null>(null);

  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(
    (option) => option.value === value
  );

  const updateDropdownPosition = () => {
    if (!selectRef.current) return;

    const rect =
      selectRef.current.getBoundingClientRect();

    const viewportPadding = 12;
    const gap = 6;
    const maxMenuHeight = 360;

    const spaceAbove =
      rect.top - viewportPadding;

    const spaceBelow =
      window.innerHeight -
      rect.bottom -
      viewportPadding;

    const openUpward =
      spaceBelow < 220 &&
      spaceAbove > spaceBelow;

    const availableSpace = openUpward
      ? spaceAbove - gap
      : spaceBelow - gap;

    const maxHeight = Math.max(
      160,
      Math.min(maxMenuHeight, availableSpace)
    );

    const top = openUpward
      ? Math.max(
          viewportPadding,
          rect.top - maxHeight - gap
        )
      : Math.min(
          window.innerHeight -
            viewportPadding -
            maxHeight,
          rect.bottom + gap
        );

    const left = Math.max(
      viewportPadding,
      Math.min(
        rect.left,
        window.innerWidth -
          rect.width -
          viewportPadding
      )
    );

    setDropdownPosition({
      top,
      left,
      width: rect.width,
      maxHeight,
      openUpward
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();

    const handleResize = () => {
      updateDropdownPosition();
    };

    const handleScroll = () => {
      updateDropdownPosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, options.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        selectRef.current &&
        !selectRef.current.contains(target)
      ) {
        const element = event.target as HTMLElement;

        if (
          !element.closest('[data-select-dropdown="true"]')
        ) {
          setIsOpen(false);
        }
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
      className={cn('relative w-full', className)}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen((previous) => !previous);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'group flex h-11 w-full items-center justify-between',
          'rounded-xl border border-line bg-white shadow-sm',
          'px-3.5 text-left text-sm font-medium text-ink',
          'transition-all duration-150 ease-out',
          'hover:border-zinc-300',
          'focus:outline-none focus:ring-2 focus:ring-accent/15',
          'disabled:cursor-not-allowed disabled:bg-shell disabled:opacity-60',
          isOpen &&
            'border-accent ring-2 ring-accent/15'
        )}
      >
        <span
          className={cn(
            'truncate leading-5',
            !selectedOption && 'text-muted'
          )}
        >
          {selectedOption?.label || placeholder}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={cn(
            'ml-3 h-4 w-4 shrink-0 text-muted',
            'transition-transform duration-150',
            'group-hover:text-accent',
            isOpen && 'rotate-180 text-accent'
          )}
        />
      </button>

      {isOpen && dropdownPosition && (
        <div
          data-select-dropdown="true"
          role="listbox"
          aria-label="Select an option"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            maxHeight: dropdownPosition.maxHeight
          }}
          className={cn(
            'z-[9999] overflow-y-auto rounded-xl',
            'border border-line bg-white',
            'p-1.5 shadow-card',
            dropdownPosition.openUpward
              ? 'origin-bottom'
              : 'origin-top'
          )}
        >
          <div className="space-y-0.5">
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
                    'rounded-lg px-3 py-2.5',
                    'text-left text-sm font-medium',
                    'transition-colors duration-100',
                    'text-ink',
                    'hover:bg-accent-soft hover:text-accent',
                    isSelected &&
                      'bg-accent-soft text-accent font-semibold'
                  )}
                >
                  <span className="leading-5">
                    {option.label}
                  </span>

                  {isSelected && (
                    <span
                      className={cn(
                        'ml-3 flex h-5 w-5 shrink-0',
                        'items-center justify-center',
                        'rounded-full bg-accent'
                      )}
                    >
                      <Check
                        aria-hidden="true"
                        className="h-3 w-3 text-white"
                      />
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