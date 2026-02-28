import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useLogin } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginPage() {
  const { isAuthenticated } = useAuthStore();
  const loginMutation = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
            <span className="text-xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Daltaners Admin</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your admin account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <Input
            label="Email"
            type="email"
            placeholder="admin@daltaners.ph"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {loginMutation.isError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : 'Invalid credentials. Please try again.'}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={loginMutation.isPending}
          >
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Daltaners Platform &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
