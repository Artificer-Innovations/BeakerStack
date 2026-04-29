import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type ModalSize = 'sm' | 'md' | 'lg';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  size?: ModalSize;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  titleStyle?: TextStyle;
};

/**
 * React Native modal: backdrop + centered card.
 */
export function Modal({
  open,
  onClose,
  children,
  title,
  showCloseButton = true,
  style,
  contentStyle,
  titleStyle,
}: ModalProps) {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, 400);

  return (
    <RNModal
      visible={open}
      transparent
      animationType='fade'
      onRequestClose={onClose}
    >
      <View
        style={[
          {
            flex: 1,
            justifyContent: 'center',
            padding: 16,
            alignItems: 'center',
          },
          style,
        ]}
      >
        <Pressable
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.5)' },
          ]}
          accessibilityRole='button'
          accessibilityLabel='Close dialog'
        />
        <View
          style={[
            {
              width: maxW,
              zIndex: 1,
              borderRadius: 12,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              padding: 20,
            },
            contentStyle,
          ]}
        >
          {!!title && (
            <View
              style={{
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Text
                style={[
                  { fontSize: 18, fontWeight: '600', color: '#111827' },
                  titleStyle,
                ]}
              >
                {title}
              </Text>
              {showCloseButton && (
                <Pressable
                  onPress={onClose}
                  accessibilityLabel='Close dialog'
                  style={{ padding: 4 }}
                >
                  <Text style={{ fontSize: 22, color: '#6B7280' }}>×</Text>
                </Pressable>
              )}
            </View>
          )}
          {children}
        </View>
      </View>
    </RNModal>
  );
}
