import type { ReactElement } from 'react';
import { Pressable, Text } from 'react-native';
import { useCustomerPortal } from '../hooks/useCustomerPortal.js';
import type { ProductBillingConfig } from '../schema.js';
import type { CustomerPortalLinkProps } from './CustomerPortalLink.types.js';

export function CustomerPortalLink<P extends ProductBillingConfig>({
  children,
  style,
}: CustomerPortalLinkProps): ReactElement {
  const { openPortal, pending } = useCustomerPortal<P>();
  return (
    <Pressable
      style={style}
      disabled={pending}
      onPress={() => void openPortal()}
    >
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Pressable>
  );
}
