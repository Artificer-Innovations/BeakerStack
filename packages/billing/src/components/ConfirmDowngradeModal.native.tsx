import type { ReactElement } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Plan } from '../types.js';

type Props = {
  visible: boolean;
  targetPlan: Plan;
  currentPlan: Plan | null;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
};

function featuresLost(current: Plan | null, target: Plan): string[] {
  if (!current) return [];
  const lost: string[] = [];
  for (const [key, value] of Object.entries(current.features)) {
    const targetValue = target.features[key];
    if (value === true && targetValue !== true) {
      lost.push(key.replace(/_/g, ' '));
    }
    if (
      typeof value === 'number' &&
      typeof targetValue === 'number' &&
      targetValue < value
    ) {
      lost.push(`${key.replace(/_/g, ' ')} (${value} → ${targetValue} limit)`);
    }
    if (typeof value === 'number' && targetValue === undefined) {
      lost.push(key.replace(/_/g, ' '));
    }
  }
  return lost;
}

export function ConfirmDowngradeModal({
  visible,
  targetPlan,
  currentPlan,
  onConfirm,
  onCancel,
  pending = false,
}: Props): ReactElement {
  const lost = featuresLost(currentPlan, targetPlan);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onCancel}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <Text style={s.title}>Downgrade to {targetPlan.display_name}?</Text>

          {lost.length > 0 ? (
            <>
              <Text style={s.warningLabel}>You will lose access to:</Text>
              <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
                {lost.map(item => (
                  <View key={item} style={s.listRow}>
                    <Text style={s.bullet}>•</Text>
                    <Text style={s.listItem}>{item}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <Text style={s.body}>
              This will change your plan to{' '}
              <Text style={s.bold}>{targetPlan.display_name}</Text> at the end
              of the current billing period.
            </Text>
          )}

          <View style={s.actions}>
            <Pressable
              onPress={onCancel}
              style={[s.btn, s.cancelBtn]}
              disabled={pending}
            >
              <Text style={s.cancelText}>Keep current plan</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[s.btn, s.confirmBtn]}
              disabled={pending}
            >
              {pending ? (
                <ActivityIndicator color='#fff' size='small' />
              ) : (
                <Text style={s.confirmText}>Confirm downgrade</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    maxHeight: '75%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  warningLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  list: { maxHeight: 200, marginBottom: 16 },
  listRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  bullet: { color: '#d97706', fontWeight: '700' },
  listItem: { fontSize: 14, color: '#374151', flex: 1 },
  body: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 16 },
  bold: { fontWeight: '600' },
  actions: { gap: 10, marginTop: 8 },
  btn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  confirmBtn: {
    backgroundColor: '#dc2626',
  },
  cancelText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  confirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
