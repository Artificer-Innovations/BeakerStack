import { Logger } from '@beakerstack/logger';
import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';

const HASH_SCROLL_MAX_FRAMES = 60;

function parseHashId(hash: string): string | null {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  try {
    const id = decodeURIComponent(raw);
    return id || null;
  } catch {
    return null;
  }
}

export function scrollToHashElement(hash: string): boolean {
  const id = parseHashId(hash);
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView();
  return true;
}

/** Retry until lazy below-fold sections (pricing, FAQ) have mounted. Returns cleanup. */
export function startHashScroll(hash: string): () => void {
  let cancelled = false;

  function attempt(frame: number) {
    if (cancelled) return;
    if (scrollToHashElement(hash)) return;
    if (frame >= HASH_SCROLL_MAX_FRAMES) {
      if (import.meta.env.DEV) {
        Logger.warn(`ScrollToTop: hash anchor not found: ${hash}`);
      }
      return;
    }
    requestAnimationFrame(() => attempt(frame + 1));
  }

  attempt(0);
  return () => {
    cancelled = true;
  };
}

export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const topRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (hash) {
      return startHashScroll(hash);
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
