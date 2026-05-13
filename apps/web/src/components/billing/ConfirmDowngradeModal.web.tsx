import { Button } from '@beakerstack/shared/components/primitives/Button.web';
import { Modal } from '@beakerstack/shared/components/primitives/Modal.web';

export function ConfirmDowngradeModal({
  open,
  onClose,
  onConfirm,
  planName,
  bodyText,
  pending = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  planName: string;
  bodyText: string;
  pending?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Downgrade to ${planName}?`}
      size='md'
      contentClassName=''
    >
      <p className='text-sm text-gray-600 dark:text-gray-300'>{bodyText}</p>
      <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
        Changes that reduce your entitlements take effect at the end of the
        current billing period, unless your payment provider processes them
        sooner. Proration is handled by Stripe.
      </p>
      <div className='mt-6 flex justify-end gap-3'>
        <Button
          type='button'
          variant='secondary'
          onPress={onClose}
          disabled={pending}
          fullWidth={false}
        >
          Cancel
        </Button>
        <Button
          type='button'
          variant='destructive'
          onPress={onConfirm}
          loading={pending}
          fullWidth={false}
        >
          Confirm downgrade
        </Button>
      </div>
    </Modal>
  );
}
