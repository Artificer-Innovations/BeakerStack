import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal } from '@beakerstack/shared/components/primitives/Modal.web';

describe('Modal.web — coverage gaps', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('focuses first focusable when active element is outside panel', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Outside active'>
        <button type='button'>Inside</button>
      </Modal>
    );

    act(() => {
      jest.runAllTimers();
    });

    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    outside.focus();

    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', bubbles: true });
    expect(onClose).not.toHaveBeenCalled();
    expect(outside).not.toHaveFocus();
    expect(dialogContainsFocus(screen.getByRole('dialog'))).toBe(true);

    outside.remove();
  });

  it('focuses panel when focusable list has holes', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Sparse focusables'>
        <button type='button'>Only</button>
      </Modal>
    );

    act(() => {
      jest.runAllTimers();
    });

    const dialog = screen.getByRole('dialog');
    const panel = dialog.querySelector('[tabindex="-1"]') as HTMLElement;
    const filterSpy = jest
      .spyOn(Array.prototype, 'filter')
      .mockImplementationOnce(function (this: HTMLElement[]) {
        if (this.some(el => el instanceof HTMLButtonElement)) {
          return [undefined as unknown as HTMLElement];
        }
        return Array.prototype.filter.call(
          this,
          Boolean as unknown as (value: HTMLElement) => boolean
        );
      });

    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', bubbles: true });
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(panel);
    filterSpy.mockRestore();
  });

  it('returns null when document is unavailable', () => {
    const savedDocument = global.document;
    // @ts-expect-error SSR guard
    delete global.document;

    try {
      const { container } = render(
        <Modal open onClose={jest.fn()} title='SSR'>
          <button type='button'>Inside</button>
        </Modal>
      );
      expect(container.innerHTML).toBe('');
    } finally {
      global.document = savedDocument;
    }
  });

  it('focuses last focusable when shift-tab starts outside panel', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Shift outside'>
        <button type='button'>First</button>
        <button type='button'>Last</button>
      </Modal>
    );

    act(() => {
      jest.runAllTimers();
    });

    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    outside.focus();

    fireEvent.keyDown(document, {
      key: 'Tab',
      code: 'Tab',
      shiftKey: true,
      bubbles: true,
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(dialogContainsFocus(screen.getByRole('dialog'))).toBe(true);
    outside.remove();
  });

  it('focuses panel when tab is pressed but panel ref is missing', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Missing panel ref'>
        <button type='button'>Inside</button>
      </Modal>
    );

    act(() => {
      jest.runAllTimers();
    });

    const dialog = screen.getByRole('dialog');
    const panel = dialog.querySelector('[tabindex="-1"]') as HTMLElement;
    const querySpy = jest
      .spyOn(panel, 'querySelectorAll')
      .mockReturnValue([] as unknown as NodeListOf<HTMLElement>);
    Object.defineProperty(panel, 'querySelectorAll', {
      configurable: true,
      value: querySpy,
    });

    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', bubbles: true });
    expect(onClose).not.toHaveBeenCalled();
    querySpy.mockRestore();
  });
});

function dialogContainsFocus(dialog: HTMLElement): boolean {
  const active = document.activeElement;
  return !!active && dialog.contains(active);
}
