import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegister } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const registerSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required').max(50),
    last_name: z.string().min(1, 'Last name is required').max(50),
    identifier: z.string().min(1, 'Email or phone number is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterForm) => {
    const payload =
      method === 'email'
        ? {
            email: data.identifier,
            password: data.password,
            first_name: data.first_name,
            last_name: data.last_name,
          }
        : {
            phone: data.identifier,
            password: data.password,
            first_name: data.first_name,
            last_name: data.last_name,
          };

    registerMutation.mutate(payload);
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Join Daltaners and start shopping from local stores
        </p>
      </div>

      {registerMutation.error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {(registerMutation.error as Error).message || 'Registration failed. Please try again.'}
        </div>
      )}

      <div className="mb-6 flex rounded-lg border border-border bg-muted p-1">
        <button
          type="button"
          onClick={() => setMethod('email')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            method === 'email'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMethod('phone')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            method === 'phone'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Phone
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First name"
            placeholder="Juan"
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Input
            label="Last name"
            placeholder="Dela Cruz"
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>

        <Input
          label={method === 'email' ? 'Email address' : 'Phone number'}
          type={method === 'email' ? 'email' : 'tel'}
          placeholder={method === 'email' ? 'you@example.com' : '+63 9XX XXX XXXX'}
          error={errors.identifier?.message}
          {...register('identifier')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Create a strong password"
          error={errors.password?.message}
          helperText="Min 8 chars with uppercase, lowercase, and number"
          {...register('password')}
        />

        <Input
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          error={errors.confirm_password?.message}
          {...register('confirm_password')}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={registerMutation.isPending}
        >
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By creating an account, you agree to our{' '}
        <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
        {' '}and{' '}
        <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
      </p>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:text-primary-600 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
