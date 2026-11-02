'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface PageTransitionContextType {
  isNavigating: boolean;
  navigate: (href: string) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType>({
  isNavigating: false,
  navigate: () => {},
});

export const usePageTransition = () => useContext(PageTransitionContext);

interface PageTransitionProviderProps {
  children: React.ReactNode;
}

export const PageTransitionProvider: React.FC<PageTransitionProviderProps> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [transitionState, setTransitionState] = useState<'idle' | 'entering' | 'exiting'>('idle');
  const isNavigatingRef = useRef(false);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const enterTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-fetch primary target routes on initial load for instant zero-lag transitions
  useEffect(() => {
    try {
      router.prefetch('/');
      router.prefetch('/login');
      router.prefetch('/signup');
    } catch {}
  }, [router]);

  // When pathname changes (either via router.push or browser back/forward popstate)
  useEffect(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    isNavigatingRef.current = false;

    // Trigger smooth, fast GPU-composited enter transition
    setTransitionState('entering');

    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    enterTimerRef.current = setTimeout(() => {
      // Revert to idle so no residual transforms or will-change remain
      setTransitionState('idle');
    }, 280);

    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, [pathname]);

  // Handle popstate for browser Back & Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      isNavigatingRef.current = false;
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, []);

  const navigate = useCallback(
    (targetHref: string) => {
      const targetPath = targetHref.split('?')[0].split('#')[0] || '/';
      const currentPath = pathname.split('?')[0].split('#')[0] || '/';

      if (targetPath === currentPath && !targetHref.includes('#')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        router.push(targetHref);
        isNavigatingRef.current = false;
        return;
      }

      // Snappy micro-fadeout (70ms) before route switch for zero perceived latency
      setTransitionState('exiting');

      exitTimerRef.current = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        router.push(targetHref);

        // Fallback safety timeout
        exitTimerRef.current = setTimeout(() => {
          setTransitionState('idle');
          isNavigatingRef.current = false;
        }, 350);
      }, 70);
    },
    [pathname, router]
  );

  return (
    <PageTransitionContext.Provider
      value={{ isNavigating: transitionState === 'exiting', navigate }}
    >
      <div
        key={pathname}
        className={`page-transition-wrapper min-h-screen flex flex-col flex-1 w-full ${
          transitionState === 'exiting'
            ? 'page-transition-exit'
            : transitionState === 'entering'
            ? 'page-transition-enter'
            : ''
        }`}
      >
        {children}
      </div>
    </PageTransitionContext.Provider>
  );
};
