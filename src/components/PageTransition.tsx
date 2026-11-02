'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface PageTransitionContextType {
  navigate: (href: string) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType>({
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
  const isNavigatingRef = useRef(false);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Pre-fetch primary target routes on initial load for instant navigation
  useEffect(() => {
    try {
      router.prefetch('/');
      router.prefetch('/login');
      router.prefetch('/signup');
    } catch {}
  }, [router]);

  // When pathname changes (either via router.push or browser popstate), unlock navigation
  useEffect(() => {
    isNavigatingRef.current = false;
  }, [pathname]);

  // Handle popstate for browser Back & Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      isNavigatingRef.current = false;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Stable navigation function with single execution lock and instant transition
  const navigate = useCallback(
    (targetHref: string) => {
      const targetPath = targetHref.split('?')[0].split('#')[0] || '/';
      const currentPath = pathnameRef.current.split('?')[0].split('#')[0] || '/';

      // If already on the requested route, smoothly scroll to top
      if (targetPath === currentPath && !targetHref.includes('#')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Prevent duplicate clicks / multi-triggering
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      // Scroll to top instantly and push route immediately
      window.scrollTo({ top: 0, behavior: 'instant' });
      router.push(targetHref);

      // Release lock after route swap
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 350);
    },
    [router]
  );

  return (
    <PageTransitionContext.Provider value={{ navigate }}>
      <div
        key={pathname}
        className="page-transition-wrapper min-h-screen flex flex-col flex-1 w-full animate-page-fade"
      >
        {children}
      </div>
    </PageTransitionContext.Provider>
  );
};
