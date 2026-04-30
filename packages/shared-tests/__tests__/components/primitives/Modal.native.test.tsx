import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { Text } from 'react-native';
import '@testing-library/jest-dom';
import { Modal } from '@beakerstack/shared/components/primitives/Modal.native';

describe('Modal (Native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when open', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose}>
        <Text>Modal body</Text>
      </Modal>
    );
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('renders title and close control when title is set', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='Settings'>
        <Text>Content</Text>
      </Modal>
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('×')).toBeInTheDocument();
  });

  it('hides close button in header when showCloseButton is false', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='T' showCloseButton={false}>
        <Text>Content</Text>
      </Modal>
    );
    expect(screen.queryByText('×')).not.toBeInTheDocument();
  });

  it('calls onClose when header close is pressed', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title='T'>
        <Text>Content</Text>
      </Modal>
    );
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is activated', () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose}>
        <Text>Body</Text>
      </Modal>
    );
    const closeTargets = screen.getAllByLabelText('Close dialog');
    fireEvent.click(closeTargets[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
