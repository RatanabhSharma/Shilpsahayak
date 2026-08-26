import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { cn } from './ui';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function ThemeToggle({
  className,
  size = 'md',
  showLabel = false,
}: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200',
        'border border-zinc-200/90 bg-white/90 text-charcoal shadow-sm hover:border-brand-500 hover:text-brand-600',
        'dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
        size === 'sm' ? 'h-9 px-2.5 text-xs' : 'h-10 px-3 text-sm',
        !showLabel && (size === 'sm' ? 'w-9 px-0' : 'w-10 px-0'),
        className
      )}
    >
      <div className="relative flex h-5 w-5 items-center justify-center">
        {/* Sun Icon (shown in dark mode) */}
        <Sun
          className={cn(
            'h-4 w-4 transition-all duration-300 transform',
            isDark
              ? 'scale-100 rotate-0 text-amber-400 opacity-100'
              : 'scale-0 -rotate-90 text-transparent opacity-0 absolute'
          )}
        />

        {/* Moon Icon (shown in light mode) */}
        <Moon
          className={cn(
            'h-4 w-4 transition-all duration-300 transform',
            !isDark
              ? 'scale-100 rotate-0 text-slate-700 opacity-100 group-hover:text-brand-600'
              : 'scale-0 rotate-90 text-transparent opacity-0 absolute'
          )}
        />
      </div>

      {showLabel && (
        <span className="font-mono text-xs font-semibold select-none">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}

