import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';

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
  borderWidth: number;
} {
  switch (variant) {
    case 'primary':
      return { bg: colors.brand, text: '#ffffff', border: 'transparent', borderWidth: 0 };
    case 'secondary':
      return { bg: colors.cardBg, text: colors.textPrimary, border: colors.border, borderWidth: 1 };
    case 'destructive':
      return { bg: colors.errorIcon, text: '#ffffff', border: 'transparent', borderWidth: 0 };
    case 'ghost':
    default:
      return { bg: 'transparent', text: colors.textBody, border: 'transparent', borderWidth: 0 };
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
  const vc = variantColors(variant);

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
          backgroundColor: vc.bg,
          borderWidth: vc.borderWidth,
          borderColor: vc.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vc.text} />
      ) : typeof children === 'string' ? (
        <Text
          style={[
            { fontSize: font, fontWeight: '600', color: vc.text },
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
