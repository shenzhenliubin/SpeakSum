import { Outlet, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { routeMeta } from '@/router';

// Loading component for suspense fallback
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="w-8 h-8 border-3 border-terracotta border-t-transparent rounded-full animate-spin" />
  </div>
);

export const RootLayout: React.FC = () => {
  const location = useLocation();

  // Update page title based on route
  useEffect(() => {
    const meta = routeMeta[location.pathname];
    if (meta) {
      document.title = meta.title;
    }
  }, [location.pathname]);

  // Check if current route is login page
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
