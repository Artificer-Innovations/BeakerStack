import type { InputHTMLAttributes } from 'react';

export interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'password';
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * FormInput component for web
 * Provides a styled input field with label and error message
 */
export function FormInput({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = 'text',
  multiline = false,
  rows = 3,
  disabled = false,
  required = false,
  className = '',
  'aria-label': ariaLabel,
}: FormInputProps) {
  const inputId = `form-input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = !!error;

  const baseInputClasses = `w-full px-3 py-2 border rounded-md text-sm transition-colors ${
    hasError
      ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-500'
      : 'border-gray-300 bg-white focus:border-primary-500 focus:ring-primary-500'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  const labelClasses = `block text-sm font-medium mb-1 ${
    hasError ? 'text-red-700' : 'text-gray-700'
  }`;

  return (
    <div className="w-full">
      <label htmlFor={inputId} className={labelClasses}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {multiline ? (
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          required={required}
          className={baseInputClasses}
          aria-label={ariaLabel || label}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={baseInputClasses}
          aria-label={ariaLabel || label}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
        />
      )}
      {hasError && (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

