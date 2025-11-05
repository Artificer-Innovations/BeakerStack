import React, { ReactNode } from "react";

export const Navigate = ({ to }: { to: string }) => <div data-testid="navigate">NAVIGATE:{to}</div>;

export const BrowserRouter = ({ children }: { children: ReactNode }) => <div>{children}</div>;

export const MemoryRouter = ({ children }: { children: ReactNode }) => <div>{children}</div>;

export const useNavigate = () => (path: string) => { /* noop for tests */ };

export const useLocation = () => ({ pathname: "/" });

export const Link = ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>;

