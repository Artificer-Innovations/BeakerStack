import { Button, type ButtonVariant } from '../primitives/Button.web';

export interface FormButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

function mapVariant(v: FormButtonProps['variant']): ButtonVariant {
  if (v === 'danger') return 'destructive';
  if (v === 'secondary') return 'secondary';
  return 'primary';
}

/**
 * FormButton: thin wrapper around {@link Button} for existing auth/profile forms.
 */
export function FormButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  fullWidth = true,
  type = 'button',
  className = '',
}: FormButtonProps) {
  return (
    <Button
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      variant={mapVariant(variant)}
      size='md'
      fullWidth={fullWidth}
      type={type}
      className={className}
    >
      {title}
    </Button>
  );
}
