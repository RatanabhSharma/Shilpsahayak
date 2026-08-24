import React, {
  forwardRef,
  useEffect,
  useRef,
  useState
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/* =========================================================
   Shared className utility
   ========================================================= */

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
      'font-medium tracking-[-0.01em] ' +
      'border transition-all duration-200 ease-out ' +
      'focus-visible:outline-none focus-visible:ring-2 ' +
      'focus-visible:ring-[#b4491e]/30 focus-visible:ring-offset-2 ' +
      'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50';

    const variants = {
      primary:
        'border-[#14120f] bg-[#14120f] text-[#f7f4ee] ' +
        'hover:-translate-y-0.5 hover:bg-[#2b2724] hover:shadow-md ' +
        'active:translate-y-0 active:shadow-sm',

      secondary:
        'border-[#b4491e] bg-[#b4491e] text-white ' +
        'hover:-translate-y-0.5 hover:bg-[#963d18] hover:shadow-md ' +
        'active:translate-y-0 active:shadow-sm',

      outline:
        'border-[#b8aea0] bg-transparent text-[#14120f] ' +
        'hover:-translate-y-0.5 hover:border-[#b4491e] ' +
        'hover:bg-[#f4dccf]/40 hover:text-[#7b2f11] ' +
        'active:translate-y-0',

      ghost:
        'border-transparent bg-transparent text-[#6b6156] ' +
        'hover:bg-[#ebe6dc] hover:text-[#14120f] ' +
        'active:bg-[#d9d2c7]',

      whatsapp:
        'border-[#25d366] bg-[#25d366] text-white ' +
        'hover:-translate-y-0.5 hover:bg-[#128c7e] hover:shadow-md ' +
        'active:translate-y-0'
    };

    const sizes = {
      sm: 'min-h-9 px-3.5 text-xs rounded-sm',
      md: 'min-h-11 px-5 text-sm rounded-sm',
      lg: 'min-h-13 px-7 text-base rounded-sm'
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

interface InputProps
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
            className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-[#6b6156]"
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
            'flex h-11 w-full rounded-sm border bg-white px-3.5 py-2.5',
            'text-sm text-[#14120f] shadow-none',
            'placeholder:text-[#8e8275]',
            'transition-all duration-150 ease-out',
            'border-[#cfc7bb]',
            'hover:border-[#8e8275]',
            'focus:border-[#b4491e] focus:outline-none',
            'focus:ring-2 focus:ring-[#b4491e]/15',
            'disabled:cursor-not-allowed disabled:bg-[#ebe6dc] disabled:opacity-60',
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
            className="mt-1.5 text-xs leading-relaxed text-red-600"
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

interface TextareaProps
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
          className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-[#6b6156]"
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
          'flex min-h-[100px] w-full resize-y rounded-sm border bg-white px-3.5 py-2.5',
          'text-sm leading-relaxed text-[#14120f]',
          'placeholder:text-[#8e8275]',
          'transition-all duration-150 ease-out',
          'border-[#cfc7bb]',
          'hover:border-[#8e8275]',
          'focus:border-[#b4491e] focus:outline-none',
          'focus:ring-2 focus:ring-[#b4491e]/15',
          'disabled:cursor-not-allowed disabled:bg-[#ebe6dc] disabled:opacity-60',
          error &&
            'border-red-500 focus:border-red-500 focus:ring-red-500/15',
          className
        )}
        {...props}
      />

      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-xs leading-relaxed text-red-600"
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
        'overflow-hidden border border-[#d9d2c7] bg-white',
        'shadow-[0_1px_2px_rgba(20,18,15,0.04)]',
        'transition-shadow duration-200',
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
    default:
      'border-[#d9d2c7] bg-[#ebe6dc] text-[#514a42]',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning:
      'border-amber-200 bg-amber-50 text-amber-700',
    danger:
      'border-red-200 bg-red-50 text-red-700'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2.5 py-1',
        'text-[11px] font-medium uppercase tracking-[0.06em]',
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

    window.addEventListener(
      'resize',
      handleResize
    );

    window.addEventListener(
      'scroll',
      handleScroll,
      true
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      );

      window.removeEventListener(
        'scroll',
        handleScroll,
        true
      );
    };
  }, [isOpen, options.length]);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      const target = event.target as Node;

      if (
        selectRef.current &&
        !selectRef.current.contains(target)
      ) {
        const element =
          event.target as HTMLElement;

        if (
          !element.closest(
            '[data-select-dropdown="true"]'
          )
        ) {
          setIsOpen(false);
        }
      }
    };

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    document.addEventListener(
      'keydown',
      handleEscape
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );

      document.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, []);

  const handleSelect = (
    optionValue: string
  ) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={selectRef}
      className={cn(
        'relative w-full',
        className
      )}
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
          'rounded-sm border border-[#cfc7bb] bg-white',
          'px-3.5 text-left text-sm font-medium text-[#14120f]',
          'transition-all duration-150 ease-out',
          'hover:border-[#8e8275]',
          'focus:outline-none focus:ring-2 focus:ring-[#b4491e]/15',
          'disabled:cursor-not-allowed disabled:bg-[#ebe6dc] disabled:opacity-60',
          isOpen &&
            'border-[#b4491e] ring-2 ring-[#b4491e]/15'
        )}
      >
        <span
          className={cn(
            'truncate leading-5',
            !selectedOption &&
              'text-[#8e8275]'
          )}
        >
          {selectedOption?.label || placeholder}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={cn(
            'ml-3 h-4 w-4 shrink-0 text-[#6b6156]',
            'transition-transform duration-150',
            'group-hover:text-[#b4491e]',
            isOpen &&
              'rotate-180 text-[#b4491e]'
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
            maxHeight:
              dropdownPosition.maxHeight
          }}
          className={cn(
            'z-[9999] overflow-y-auto',
            'border border-[#d9d2c7] bg-white',
            'p-1.5 shadow-[0_12px_32px_rgba(20,18,15,0.14)]',
            dropdownPosition.openUpward
              ? 'origin-bottom'
              : 'origin-top'
          )}
        >
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected =
                option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() =>
                    handleSelect(
                      option.value
                    )
                  }
                  className={cn(
                    'flex w-full items-center justify-between',
                    'rounded-sm px-3 py-2.5',
                    'text-left text-sm',
                    'transition-colors duration-100',
                    'text-[#514a42]',
                    'hover:bg-[#f7f4ee] hover:text-[#14120f]',
                    isSelected &&
                      'bg-[#f4dccf] text-[#7b2f11]'
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
                        'rounded-full bg-[#b4491e]'
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