'use client';

import { Controller, FormProvider, type UseFormReturn } from 'react-hook-form';
import {
  ALLOWED_INTERVAL_SECONDS,
  type MonitorFormValues,
} from '@/schemas/monitors/monitor-form.schema';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/button';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { ErrorMessage } from '@/components/error-message';

type MonitorFieldsProps = {
  form: UseFormReturn<MonitorFormValues>;
  onSubmit: () => void;
  isPending: boolean;
  error?: unknown;
};

export function MonitorFields({ form, onSubmit, isPending, error }: MonitorFieldsProps): React.JSX.Element {
  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {error ? <ErrorMessage error={error} /> : null}

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

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Create monitor'}
        </Button>
      </form>
    </FormProvider>
  );
}
