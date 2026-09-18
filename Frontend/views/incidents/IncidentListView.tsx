'use client';

import { useState } from 'react';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization-id';
import { useListIncidentsQuery, type IncidentStatus } from '@/api/incidents.api';
import { IncidentTable } from '@/sections/incidents/IncidentTable';
import { IncidentEmptyState } from '@/sections/incidents/IncidentEmptyState';
import { ErrorMessage } from '@/components/error-message';
import { Spinner } from '@/components/spinner';
import { Button } from '@/components/button';

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'OPEN' },
  { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
  { label: 'Resolved', value: 'RESOLVED' },
] as const satisfies readonly { label: string; value: IncidentStatus | undefined }[];

export function IncidentListView(): React.JSX.Element {
  const organizationId = useCurrentOrganizationId();
  const [status, setStatus] = useState<IncidentStatus | undefined>(undefined);

  const { data, isLoading, isFetching, isError, error } = useListIncidentsQuery(
    { organizationId: organizationId ?? '', status },
    { skip: !organizationId },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Incidents</h1>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.label}
              variant={status === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading || !organizationId ? (
        <Spinner className="h-6 w-6" />
      ) : isError ? (
        <ErrorMessage error={error} />
      ) : !data || data.items.length === 0 ? (
        <IncidentEmptyState />
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <IncidentTable incidents={data.items} />
        </div>
      )}
    </div>
  );
}
