import { useTheme } from '../hooks/useTheme';
import type { ThemePreference } from '../contexts/ThemeContext';

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'system', label: 'System', icon: '⊙' },
  { value: 'dark', label: 'Dark', icon: '☾' },
];

export function ThemeToggle() {
  const { preference, setTheme } = useTheme();

  return (
    <div className='inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-0.5'>
      {OPTIONS.map(({ value, label, icon }) => (
        <button
          key={value}
          type='button'
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
            preference === value
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
