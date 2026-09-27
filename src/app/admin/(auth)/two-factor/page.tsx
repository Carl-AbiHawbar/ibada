import type { Metadata } from 'next';
import { AuthCard } from '@/components/admin/auth/auth-card';
import { TwoFactorForm } from '@/components/admin/auth/two-factor-form';

export const metadata: Metadata = { title: 'Two-step sign-in' };

export default function TwoFactorPage() {
  return (
    <AuthCard title="Two-step sign-in" subtitle="Enter the 6-digit code from your authenticator app.">
      <TwoFactorForm />
    </AuthCard>
  );
}
