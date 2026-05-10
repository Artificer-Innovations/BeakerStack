import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

export type ButtonProps = {
  children: React.ReactNode;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Ignored on native; kept for API parity with web. */
  loadingText?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

const sizePadding: Record<ButtonSize, { v: number; h: number; font: number }> =
  {
    sm: { v: 8, h: 12, font: 14 },
    md: { v: 12, h: 16, font: 14 },
    lg: { v: 14, h: 20, font: 16 },
  };

function variantColors(variant: ButtonVariant): {
  bg: string;
  text: string;
  border: string;
} {
  switch (variant) {
    case 'primary':
      return { bg: '#4F46E5', text: '#FFFFFF', border: 'transparent' };
    case 'secondary':
      return { bg: '#FFFFFF', text: '#111827', border: '#E5E7EB' };
    case 'destructive':
      return { bg: '#DC2626', text: '#FFFFFF', border: 'transparent' };
    case 'ghost':
    default:
      return { bg: 'transparent', text: '#374151', border: 'transparent' };
  }
}

/**
 * Generic button for React Native.
 */
export function Button({
  children,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { v, h, font } = sizePadding[size];
  const colors = variantColors(variant);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        {
          flexDirection: 'row',
          paddingVertical: v,
          paddingHorizontal: h,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: size === 'lg' ? 48 : 40,
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.5 : 1,
          backgroundColor: colors.bg,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : typeof children === 'string' ? (
        <Text
          style={[
            { fontSize: font, fontWeight: '600', color: colors.text },
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
