import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { render, screen, fireEvent, within } from '@testing-library/react';
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
});
