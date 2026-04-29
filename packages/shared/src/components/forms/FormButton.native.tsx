import { Button, type ButtonVariant } from '../primitives/Button.native';

export interface FormButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  style?: import('react-native').ViewStyle;
  textStyle?: import('react-native').TextStyle;
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
  style,
  textStyle,
}: FormButtonProps) {
  return (
    <Button
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      variant={mapVariant(variant)}
      size='md'
      fullWidth={fullWidth}
      {...(style !== undefined ? { style } : {})}
      {...(textStyle !== undefined ? { textStyle } : {})}
    >
      {title}
    </Button>
  );
}
