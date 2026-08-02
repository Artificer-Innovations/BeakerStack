import React, { ReactNode } from 'react';

export const Navigate = ({ to }: { to: string }) => (
  <div data-testid='navigate'>NAVIGATE:{to}</div>
);

export const BrowserRouter = ({ children }: { children: ReactNode }) => (
  <div>{children}</div>
);

export const MemoryRouter = ({ children }: { children: ReactNode }) => (
  <div>{children}</div>
);

export const useNavigate = () => (_path: string) => {
  /* noop for tests */
};

export const useLocation = () => ({ pathname: '/' });

export const Link = ({
  to,
  children,
  onClick,
  className,
  ...rest
}: {
  to: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) => (
  <a href={to} onClick={onClick} className={className} {...rest}>
    {children}
  </a>
);
