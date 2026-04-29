import type { ReactElement } from 'react';
import { useCustomerPortal } from '../hooks/useCustomerPortal.js';
import type { ProductBillingConfig } from '../schema.js';
import type { CustomerPortalLinkProps } from './CustomerPortalLink.types.js';

export function CustomerPortalLink<P extends ProductBillingConfig>({
  children,
  className,
  style,
}: CustomerPortalLinkProps): ReactElement {
  const { openPortal, pending } = useCustomerPortal<P>();
  return (
    <button
      type='button'
      className={className}
      style={style as React.CSSProperties}
      disabled={pending}
      onClick={() => void openPortal()}
    >
      {children}
    </button>
  );
}
