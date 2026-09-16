'use client';

import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  monitorFormSchema,
  ALLOWED_INTERVAL_SECONDS,
  type MonitorFormValues,
} from '@/features/monitors/schemas/monitor-form.schema';
import { useCreateMonitor } from '@/features/monitors/api/mutations';
import type { Monitor } from '@/features/monitors/types';
import type { components } from '@/types/api/generated';

type AllowedIntervalSeconds = components['schemas']['CreateMonitorDto']['intervalSeconds'];
import { FormField } from '@/shared/ui/form-field';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { ErrorMessage } from '@/shared/components/error/error-message';
import { Controller } from 'react-hook-form';

type MonitorFormProps = {
  organizationId: string;
  projectId: string;
  monitor?: Monitor;
};

export function MonitorForm({ organizationId, projectId, monitor }: MonitorFormProps): React.JSX.Element {
  const router = useRouter();
  const create = useCreateMonitor(organizationId, projectId);

  const form = useForm<MonitorFormValues>({
    resolver: zodResolver(monitorFormSchema),
    defaultValues: {
      name: monitor?.name ?? '',
      url: monitor?.url ?? '',
      method: monitor?.method ?? 'GET',
      intervalSeconds: monitor?.intervalSeconds ?? 60,
      timeoutMs: monitor?.timeoutMs ?? 5000,
      expectedStatusCodes: monitor?.expectedStatusCodes.join(', ') ?? '200',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const expectedStatusCodes = values.expectedStatusCodes
      .split(',')
      .map((code) => Number(code.trim()))
      .filter((code) => Number.isInteger(code));

    create.mutate(
      {
        projectId,
        name: values.name,
        url: values.url,
        method: values.method,
        // Runtime-validated against the same allow-list by monitorFormSchema.
        intervalSeconds: values.intervalSeconds as AllowedIntervalSeconds,
        timeoutMs: values.timeoutMs,
        expectedStatusCodes,
        followRedirects: true,
      },
      { onSuccess: (result) => router.push(`/projects/${projectId}/monitors/${result.id}`) },
    );
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {create.isError ? <ErrorMessage error={create.error} /> : null}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Basics</h2>
          <FormField name="name" label="Monitor name" />
          <FormField name="url" label="URL" placeholder="https://api.example.com/health" />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Request</h2>
          <div className="space-y-2">
            <Label htmlFor="method">Method</Label>
            <Controller
              control={form.control}
              name="method"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const).map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <FormField name="expectedStatusCodes" label="Expected status codes (comma-separated)" />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Schedule</h2>
          <div className="space-y-2">
            <Label htmlFor="intervalSeconds">Check interval</Label>
            <Controller
              control={form.control}
              name="intervalSeconds"
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger id="intervalSeconds">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_INTERVAL_SECONDS.map((seconds) => (
                      <SelectItem key={seconds} value={String(seconds)}>
                        Every {seconds}s
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <FormField name="timeoutMs" label="Timeout (ms)" type="number" />
        </section>

        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Saving…' : 'Create monitor'}
        </Button>
      </form>
    </FormProvider>
  );
}
