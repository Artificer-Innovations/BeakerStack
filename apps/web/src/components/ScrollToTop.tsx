import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const HASH_SCROLL_MAX_FRAMES = 60;

function scrollToHashElement(hash: string): boolean {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView();
  return true;
}

/** Retry until lazy below-fold sections (pricing, FAQ) have mounted. */
export function scrollToHash(hash: string, frame = 0): void {
  if (scrollToHashElement(hash)) return;
  if (frame >= HASH_SCROLL_MAX_FRAMES) return;
  requestAnimationFrame(() => scrollToHash(hash, frame + 1));
}

export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const topRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (hash) {
      scrollToHash(hash);
      return;
    }
    window.scrollTo(0, 0);
    topRef.current?.focus({ preventScroll: true });
  }, [pathname, hash]);

  return (
    <span
      ref={topRef}
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: 0,
        width: 0,
        height: 0,
        overflow: 'hidden',
      }}
    />
  );
}
