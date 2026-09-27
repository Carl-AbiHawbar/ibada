import type { Metadata } from 'next';
import { AuthCard } from '@/components/admin/auth/auth-card';
import { LoginForm } from '@/components/admin/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  const invited = (await searchParams).invited === '1';
  return (
    <AuthCard title="Sign in" subtitle="Manage orders, products and your shop.">
      <LoginForm notice={invited ? 'Your account is ready. Sign in to set up two-step sign-in.' : undefined} />
    </AuthCard>
  );
}
