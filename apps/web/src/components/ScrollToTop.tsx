import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();
  const topRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    topRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <span
      ref={topRef}
      tabIndex={-1}
      style={{ position: 'fixed', top: 0, width: 0, height: 0, overflow: 'hidden' }}
    />
  );
}
