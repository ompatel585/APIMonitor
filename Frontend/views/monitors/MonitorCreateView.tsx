'use client';

import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization-id';
import { useCreateMonitorMutation } from '@/api/monitors.api';
import { monitorFormSchema, type MonitorFormValues } from '@/schemas/monitors/monitor-form.schema';
import { MonitorFields } from '@/sections/monitors/MonitorFields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { Spinner } from '@/components/spinner';
import type { components } from '@/types/api/generated';

type AllowedIntervalSeconds = components['schemas']['CreateMonitorDto']['intervalSeconds'];

export function MonitorCreateView(): React.JSX.Element {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const organizationId = useCurrentOrganizationId();
  const [createMonitor, { isLoading, isError, error }] = useCreateMonitorMutation();

  const form = useForm<MonitorFormValues>({
    resolver: zodResolver(monitorFormSchema),
    defaultValues: {
      name: '',
      url: '',
      method: 'GET',
      intervalSeconds: 60,
      timeoutMs: 5000,
      expectedStatusCodes: '200',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (!organizationId) return;
    const expectedStatusCodes = values.expectedStatusCodes
      .split(',')
      .map((code) => Number(code.trim()))
      .filter((code) => Number.isInteger(code));

    createMonitor({
      organizationId,
      projectId,
      body: {
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
    })
      .unwrap()
      .then((result) => router.push(`/projects/${projectId}/monitors/${result.id}`))
      .catch(() => undefined);
  });

  if (!organizationId) {
    return <Spinner className="h-6 w-6" />;
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>New monitor</CardTitle>
      </CardHeader>
      <CardContent>
        <MonitorFields form={form} onSubmit={onSubmit} isPending={isLoading} error={isError ? error : undefined} />
      </CardContent>
    </Card>
  );
}
