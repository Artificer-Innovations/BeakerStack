import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Modal } from '@beakerstack/shared/components/primitives/Modal.web';

describe('Modal (Web)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders nothing when closed', () => {
    const onClose = jest.fn();
    render(
      <Modal open={false} onClose={onClose}>
        Body
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog with children when open', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='My title'>
        <p>Body text</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('My title')).toBeInTheDocument();
    expect(within(dialog).getByText('Body text')).toBeInTheDocument();
  });

  it('uses aria-label when title is absent', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} aria-label='Custom label'>
        X
      </Modal>
    );
    expect(
      screen.getByRole('dialog', { name: 'Custom label' })
    ).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose}>
        X
      </Modal>
    );
    fireEvent.keyDown(document, {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose}>
        Inner
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when panel content is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose}>
        <button type='button'>Inside</button>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Inside' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose from header close button', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Titled'>
        Body
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides header close button when showCloseButton is false', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Titled' showCloseButton={false}>
        Body
      </Modal>
    );
    expect(
      screen.queryByRole('button', { name: 'Close dialog' })
    ).not.toBeInTheDocument();
  });

  it('applies size max-width class to panel', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <Modal open onClose={onClose} size='sm'>
        S
      </Modal>
    );
    let dialog = screen.getByRole('dialog');
    let panel = dialog.querySelector('.max-w-sm');
    expect(panel).toBeTruthy();

    rerender(
      <Modal open onClose={onClose} size='lg'>
        L
      </Modal>
    );
    dialog = screen.getByRole('dialog');
    panel = dialog.querySelector('.max-w-lg');
    expect(panel).toBeTruthy();
  });

  it('merges className and contentClassName', () => {
    const onClose = jest.fn();
    render(
      <Modal
        open
        onClose={onClose}
        className='panel-extra'
        contentClassName='content-extra'
      >
        C
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('.panel-extra')).toBeTruthy();
    expect(dialog.querySelector('.content-extra')).toBeTruthy();
  });

  it('locks scroll on open and restores on close', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <Modal open onClose={onClose}>
        X
      </Modal>
    );
    expect(document.documentElement.style.overflow).toBe('hidden');

    rerender(
      <Modal open={false} onClose={onClose}>
        X
      </Modal>
    );
    expect(document.documentElement.style.overflow).not.toBe('hidden');
  });

  it('focuses panel on Tab when focusable list is empty', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Empty focus'>
        <p tabIndex={-1}>Static</p>
      </Modal>
    );
    act(() => {
      jest.runAllTimers();
    });
    const dialog = screen.getByRole('dialog');
    const panel = dialog.querySelector('[tabindex="-1"]') as HTMLElement;
    panel?.focus();
    fireEvent.keyDown(document, {
      key: 'Tab',
      code: 'Tab',
      bubbles: true,
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not prevent Tab when no focusable elements exist', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose}>
        <p>No interactive elements</p>
      </Modal>
    );
    await user.tab();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('traps Tab forward through focusable elements', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Trap test'>
        <button type='button'>First</button>
        <button type='button'>Last</button>
      </Modal>
    );
    act(() => {
      jest.runAllTimers();
    });
    const lastBtn = screen.getByRole('button', { name: 'Last' });

    lastBtn.focus();
    await user.tab();
    expect(onClose).not.toHaveBeenCalled();
    // focus should have wrapped back into the modal
    expect(document.activeElement).not.toBe(document.body);
  });

  it('traps Shift+Tab backward through focusable elements', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Trap test'>
        <button type='button'>First</button>
        <button type='button'>Last</button>
      </Modal>
    );
    act(() => {
      jest.runAllTimers();
    });
    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });

    closeBtn.focus();
    await user.tab({ shift: true });
    expect(onClose).not.toHaveBeenCalled();
    // focus should have wrapped to the last focusable element
    expect(document.activeElement).not.toBe(document.body);
  });

  it('focuses panel when focus is outside on Tab', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Outside focus'>
        <button type='button'>Btn</button>
      </Modal>
    );
    act(() => {
      jest.runAllTimers();
    });
    document.body.focus();
    await user.tab();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('wraps Tab forward from last focusable back to first in panel', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Wrap forward'>
        <button type='button'>First</button>
        <button type='button'>Last</button>
      </Modal>
    );
    act(() => {
      jest.runAllTimers();
    });
    screen.getByRole('button', { name: 'Last' }).focus();
    await user.tab();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close dialog' })
    );
  });

  it('wraps Shift+Tab backward from first focusable to last in panel', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Wrap back'>
        <button type='button'>First</button>
        <button type='button'>Last</button>
      </Modal>
    );
    act(() => {
      jest.runAllTimers();
    });
    screen.getByRole('button', { name: 'Close dialog' }).focus();
    await user.tab({ shift: true });
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Last' })
    );
  });
});
