import { Link, Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Simple header */}
      <header className="border-b border-border bg-white">
        <div className="container-app flex h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-white">B</span>
            </div>
            <span className="text-xl font-bold text-foreground">Daltaners</span>
          </Link>
        </div>
      </header>

      {/* Centered content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Simple footer */}
      <footer className="border-t border-border bg-white py-4">
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Daltaners Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
