import type { ElementType, ReactNode } from 'react';
import {
  LAYOUT_WIDTH,
  type LayoutWidthVariant,
} from '../../config/layoutWidth';

function joinClasses(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface ContentContainerProps {
  variant?: LayoutWidthVariant;
  className?: string;
  as?: ElementType;
  children?: ReactNode;
}

export function ContentContainer({
  variant = 'content',
  className,
  as: Component = 'div',
  children,
}: ContentContainerProps) {
  return (
    <Component className={joinClasses(LAYOUT_WIDTH[variant], className)}>
      {children}
    </Component>
  );
}
