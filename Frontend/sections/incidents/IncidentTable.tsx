import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/table';
import { IncidentTableRow } from '@/sections/incidents/IncidentTableRow';
import type { Incident } from '@/api/incidents.api';

export function IncidentTable({ incidents }: { incidents: Incident[] }): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cause</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="text-right">Failures</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((incident) => (
          <IncidentTableRow key={incident.id} incident={incident} />
        ))}
      </TableBody>
    </Table>
  );
}
