import React, { forwardRef, Component } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
  ref) =>
  {
    const baseStyles =
    'inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50';
    const variants = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
      secondary: 'bg-charcoal text-white hover:bg-charcoal-light shadow-sm',
      outline: 'border border-brand-500 text-brand-600 hover:bg-brand-50',
      ghost: 'hover:bg-brand-50 text-charcoal',
      whatsapp: 'bg-[#25D366] text-white hover:bg-[#128C7E] shadow-sm'
    };
    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-base',
      lg: 'h-14 px-8 text-lg'
    };
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}>
        
        {isLoading ?
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24">
          
            <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4">
          </circle>
            <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
          </svg> :
        null}
        {children}
      </button>);

  }
);
Button.displayName = 'Button';
// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label &&
        <label className="block text-sm font-medium text-charcoal mb-1.5">
            {label}
          </label>
        }
        <input
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-charcoal-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          {...props} />
        
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>);

  }
);
Input.displayName = 'Input';
// Textarea Component
interface TextareaProps extends
  React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label &&
        <label className="block text-sm font-medium text-charcoal mb-1.5">
            {label}
          </label>
        }
        <textarea
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-charcoal-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          {...props} />
        
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>);

  }
);
Textarea.displayName = 'Textarea';
// Card Component
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-brand-100 bg-white shadow-soft overflow-hidden',
        className
      )}
      {...props}>
      
      {children}
    </div>);

}
// Badge Component
export function Badge({
  className,
  variant = 'default',
  children




}: {className?: string;variant?: 'default' | 'success' | 'warning' | 'danger';children: React.ReactNode;}) {
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
      )}>
      
      {children}
    </span>);

}