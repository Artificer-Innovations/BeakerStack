import { useEffect, useId, useRef, type ReactNode } from 'react';

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function isPanelFocusable(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled')) return false;
  if (el.tabIndex < 0) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  return true;
}

export type AdminDetailDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function AdminDetailDrawer({
  open,
  title,
  onClose,
  children,
}: AdminDetailDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const focusFirst = () => {
      const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
      focusables?.[0]?.focus();
    };
    focusFirst();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter(isPanelFocusable);

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables.at(-1);
      if (first === undefined || last === undefined) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex justify-end'
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
    >
      <div
        className='absolute inset-0 bg-gray-900/40'
        aria-hidden='true'
        data-testid='admin-drawer-backdrop'
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className='relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-xl'
      >
        <div className='flex items-center justify-between border-b border-gray-200 px-4 py-4'>
          <h2 id={titleId} className='text-lg font-semibold text-gray-900'>
            {title}
          </h2>
          <button
            type='button'
            onClick={onClose}
            className='rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            aria-label='Close'
          >
            ✕
          </button>
        </div>
        <div className='flex-1 overflow-y-auto px-4 py-4'>{children}</div>
      </aside>
    </div>
  );
}
