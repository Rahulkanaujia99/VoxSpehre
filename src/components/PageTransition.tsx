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
  const [isExiting, setIsExiting] = useState(false);
  const isNavigatingRef = useRef(false);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // When pathname changes (either via router.push or browser back/forward popstate)
  useEffect(() => {
    setIsExiting(false);
    isNavigatingRef.current = false;
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
  }, [pathname]);

  // Clean up timer on unmount and listen to popstate
  useEffect(() => {
    const handlePopState = () => {
      setIsExiting(false);
      isNavigatingRef.current = false;
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = null;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }
    };
  }, []);

  const navigate = useCallback(
    (targetHref: string) => {
      // Clean paths to compare
      const targetPath = targetHref.split('?')[0].split('#')[0] || '/';
      const currentPath = pathname.split('?')[0].split('#')[0] || '/';

      // If already on the target path and no hash change is requested, just scroll to top
      if (targetPath === currentPath && !targetHref.includes('#')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Prevent overlapping navigations
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      // Check user preference for reduced motion
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        router.push(targetHref);
        isNavigatingRef.current = false;
        return;
      }

      // Trigger subtle exit transition
      setIsExiting(true);

      exitTimeoutRef.current = setTimeout(() => {
        // Instant top scroll before new page enters
        window.scrollTo({ top: 0, behavior: 'instant' });
        router.push(targetHref);

        // Safety timeout in case navigation is delayed or cancelled
        exitTimeoutRef.current = setTimeout(() => {
          setIsExiting(false);
          isNavigatingRef.current = false;
        }, 400);
      }, 160);
    },
    [pathname, router]
  );

  return (
    <PageTransitionContext.Provider value={{ isNavigating: isExiting, navigate }}>
      <div
        key={pathname}
        className={`page-transition-wrapper min-h-screen flex flex-col flex-1 w-full ${
          isExiting ? 'page-transition-exit' : 'page-transition-enter'
        }`}
      >
        {children}
      </div>
    </PageTransitionContext.Provider>
  );
};
