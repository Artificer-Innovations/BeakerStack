import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'sm' | 'md' | 'lg';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  /** Renders a title row when `title` is set. */
  showCloseButton?: boolean;
  size?: ModalSize;
  className?: string;
  /** className for the white panel */
  contentClassName?: string;
  /** ARIA: override label; defaults to `title` when set */
  'aria-label'?: string;
};

const sizeToMax: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(
    [
      'a[href]',
      'area[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'iframe',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ')
  );
  return Array.from(nodes).filter(
    element =>
      !element.hasAttribute('disabled') &&
      element.tabIndex !== -1 &&
      element.getAttribute('aria-hidden') !== 'true'
  );
}

function getPortalRoot(): Element | null {
  if (typeof document === 'undefined') return null;
  return document.body;
}

/**
 * Web modal: portal overlay, scroll lock, Escape to close, focus on open.
 */
export function Modal({
  open,
  onClose,
  children,
  title,
  showCloseButton = true,
  size = 'md',
  className = '',
  contentClassName = '',
  'aria-label': ariaLabel,
}: ModalProps) {
  const id = useId();
  const titleId = title ? `modal-title-${id}` : undefined;
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const { overflow } = html.style;
    html.style.overflow = 'hidden';
    previouslyFocused.current = document.activeElement as HTMLElement;
    // Focus the dialog panel
    setTimeout(() => {
      panelRef.current?.focus();
    }, 0);
    return () => {
      html.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      const isShift = e.shiftKey;

      if (!active || !panel.contains(active)) {
        e.preventDefault();
        (isShift ? last : first).focus();
        return;
      }

      if (!isShift && active === last) {
        e.preventDefault();
        first.focus();
      } else if (isShift && active === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const root = getPortalRoot();
  if (!root) {
    return null;
  }

  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      aria-label={ariaLabel ?? (title ? undefined : 'Dialog')}
    >
      <div
        className='absolute inset-0 bg-black/50'
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={[
          'relative w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl focus:outline-none',
          sizeToMax[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className='mb-4 flex items-start justify-between gap-4'>
            <h2 id={titleId} className='text-lg font-semibold text-gray-900 dark:text-white'>
              {title}
            </h2>
            {showCloseButton && (
              <button
                type='button'
                onClick={onClose}
                className='rounded p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                aria-label='Close dialog'
              >
                <span aria-hidden className='text-xl leading-none'>
                  &times;
                </span>
              </button>
            )}
          </div>
        )}
        <div className={contentClassName}>{children}</div>
      </div>
    </div>,
    root
  );
}
