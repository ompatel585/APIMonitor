'use client';

import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormValues } from '@/features/auth/schemas/register.schema';
import { useRegister } from '@/features/auth/api/mutations';
import { FormField } from '@/shared/ui/form-field';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/components/error/error-message';

export function RegisterForm(): React.JSX.Element {
  const router = useRouter();
  const register = useRegister();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', displayName: '', organizationName: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    register.mutate(values, {
      onSuccess: () => router.push('/dashboard'),
    });
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {register.isError ? <ErrorMessage error={register.error} /> : null}
        <FormField name="displayName" label="Your name" autoComplete="name" />
        <FormField name="organizationName" label="Organization name" autoComplete="organization" />
        <FormField name="email" label="Email" type="email" autoComplete="email" />
        <FormField name="password" label="Password" type="password" autoComplete="new-password" />
        <Button type="submit" className="w-full" disabled={register.isPending}>
          {register.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </FormProvider>
  );
}
