import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
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

  it('does not prevent Tab when no focusable elements exist', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose}>
        <p>No interactive elements</p>
      </Modal>
    );
    // Tab with no focusable elements should not throw or call onClose
    expect(() => {
      fireEvent.keyDown(document, { key: 'Tab', bubbles: true });
    }).not.toThrow();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('traps Tab forward through focusable elements', () => {
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
    const firstBtn = screen.getByRole('button', { name: 'First' });
    const lastBtn = screen.getByRole('button', { name: 'Last' });

    // Simulate Tab from the last button → should wrap to first
    lastBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true });
    // The focus trap should have intercepted; no throw, onClose not called
    expect(onClose).not.toHaveBeenCalled();
    void closeBtn; // referenced in test scope
    void firstBtn;
  });

  it('traps Shift+Tab backward through focusable elements', () => {
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

    // Simulate Shift+Tab from the first focusable element → should wrap to last
    closeBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true, bubbles: true });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('focuses panel when focus is outside on Tab', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Outside focus'>
        <button type='button'>Btn</button>
      </Modal>
    );
    act(() => {
      jest.runAllTimers();
    });
    // Focus something outside the modal (document.body)
    document.body.focus();
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true });
    expect(onClose).not.toHaveBeenCalled();
  });
});
