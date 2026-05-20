import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminDetailDrawer } from './AdminDetailDrawer.web.js';

describe('AdminDetailDrawer', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <AdminDetailDrawer open={false} title='User' onClose={vi.fn()}>
        <p>Detail</p>
      </AdminDetailDrawer>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title and children when open', () => {
    render(
      <AdminDetailDrawer open title='user@example.com' onClose={vi.fn()}>
        <p>Detail body</p>
      </AdminDetailDrawer>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Detail body')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminDetailDrawer open title='User' onClose={onClose}>
        <p>Detail</p>
      </AdminDetailDrawer>
    );
    await user.click(screen.getByTestId('admin-drawer-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(
      <AdminDetailDrawer open title='User' onClose={onClose}>
        <p>Detail</p>
      </AdminDetailDrawer>
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps Tab focus from last to first focusable in panel', () => {
    render(
      <AdminDetailDrawer open title='User' onClose={vi.fn()}>
        <input aria-label='Notes' />
        <button type='button'>Save</button>
      </AdminDetailDrawer>
    );
    const save = screen.getByRole('button', { name: 'Save' });
    const close = screen.getByLabelText('Close');
    save.focus();
    expect(document.activeElement).toBe(save);

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    document.dispatchEvent(tab);
    expect(document.activeElement).toBe(close);
  });

  it('wraps Shift+Tab focus from first to last focusable in panel', () => {
    render(
      <AdminDetailDrawer open title='User' onClose={vi.fn()}>
        <input aria-label='Notes' />
        <button type='button'>Save</button>
      </AdminDetailDrawer>
    );
    const save = screen.getByRole('button', { name: 'Save' });
    const close = screen.getByLabelText('Close');
    close.focus();
    expect(document.activeElement).toBe(close);

    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(shiftTab);
    expect(document.activeElement).toBe(save);
  });

  it('skips elements with tabindex -1 in the Tab trap', () => {
    render(
      <AdminDetailDrawer open title='User' onClose={vi.fn()}>
        <button type='button' tabIndex={-1}>
          Hidden
        </button>
        <button type='button'>Save</button>
      </AdminDetailDrawer>
    );
    const save = screen.getByRole('button', { name: 'Save' });
    const close = screen.getByLabelText('Close');
    save.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    expect(document.activeElement).toBe(close);
  });

  it('ignores non-Tab keys for focus trap', () => {
    const onClose = vi.fn();
    render(
      <AdminDetailDrawer open title='User' onClose={onClose}>
        <input aria-label='Notes' />
        <button type='button'>Save</button>
      </AdminDetailDrawer>
    );
    screen.getByLabelText('Notes').focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    expect(document.activeElement).toBe(screen.getByLabelText('Notes'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('excludes elements with negative tabindex from the Tab trap', () => {
    render(
      <AdminDetailDrawer open title='User' onClose={vi.fn()}>
        <button type='button' tabIndex={-2}>
          Skip me
        </button>
        <button type='button'>Save</button>
      </AdminDetailDrawer>
    );
    const save = screen.getByRole('button', { name: 'Save' });
    const close = screen.getByLabelText('Close');
    save.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    expect(document.activeElement).toBe(close);
  });

  it('excludes disabled and aria-hidden controls from the Tab trap', () => {
    render(
      <AdminDetailDrawer open title='User' onClose={vi.fn()}>
        <button type='button' disabled>
          Disabled
        </button>
        <button type='button' aria-hidden='true'>
          Hidden
        </button>
        <button type='button'>Save</button>
      </AdminDetailDrawer>
    );
    const save = screen.getByRole('button', { name: 'Save' });
    const close = screen.getByLabelText('Close');
    save.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    expect(document.activeElement).toBe(close);
  });

  it('wraps Tab when the close button is the only focusable control', () => {
    render(
      <AdminDetailDrawer open title='User' onClose={vi.fn()}>
        <p>Read-only detail</p>
      </AdminDetailDrawer>
    );
    const close = screen.getByLabelText('Close');
    close.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    expect(document.activeElement).toBe(close);
  });

  it('no-ops Tab trap when the panel has no focusable elements', () => {
    const original = Element.prototype.querySelectorAll;
    const querySpy = vi
      .spyOn(Element.prototype, 'querySelectorAll')
      .mockImplementation(function (
        this: Element,
        selectors: string
      ): NodeListOf<HTMLElement> {
        if (
          selectors.startsWith('button, [href]') &&
          this.tagName === 'ASIDE'
        ) {
          return [] as unknown as NodeListOf<HTMLElement>;
        }
        return original.call(this, selectors) as NodeListOf<HTMLElement>;
      });

    try {
      render(
        <AdminDetailDrawer open title='User' onClose={vi.fn()}>
          <button type='button'>Save</button>
        </AdminDetailDrawer>
      );
      const close = screen.getByLabelText('Close');
      close.focus();
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      );
      expect(document.activeElement).toBe(close);
    } finally {
      querySpy.mockRestore();
    }
  });

  it('no-ops Tab trap when every candidate is filtered out', () => {
    const original = Element.prototype.querySelectorAll;
    const querySpy = vi
      .spyOn(Element.prototype, 'querySelectorAll')
      .mockImplementation(function (
        this: Element,
        selectors: string
      ): NodeListOf<HTMLElement> {
        if (
          selectors.startsWith('button, [href]') &&
          this.tagName === 'ASIDE'
        ) {
          const disabled = document.createElement('button');
          disabled.setAttribute('disabled', '');
          return [disabled] as unknown as NodeListOf<HTMLElement>;
        }
        return original.call(this, selectors) as NodeListOf<HTMLElement>;
      });

    try {
      render(
        <AdminDetailDrawer open title='User' onClose={vi.fn()}>
          <button type='button'>Save</button>
        </AdminDetailDrawer>
      );
      const close = screen.getByLabelText('Close');
      close.focus();
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      );
      expect(document.activeElement).toBe(close);
    } finally {
      querySpy.mockRestore();
    }
  });

  it('restores focus to the previously focused element on close', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open drawer';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <AdminDetailDrawer open title='User' onClose={vi.fn()}>
        <p>Detail</p>
      </AdminDetailDrawer>
    );
    rerender(
      <AdminDetailDrawer open={false} title='User' onClose={vi.fn()}>
        <p>Detail</p>
      </AdminDetailDrawer>
    );
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('calls onClose when header close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminDetailDrawer open title='User' onClose={onClose}>
        <p>Detail</p>
      </AdminDetailDrawer>
    );
    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
