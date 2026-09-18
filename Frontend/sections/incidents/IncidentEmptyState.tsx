export function IncidentEmptyState(): React.JSX.Element {
  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-8 text-center">
      <p className="text-sm font-medium">No incidents</p>
      <p className="text-sm text-muted-foreground">
        Incidents open automatically when a monitor fails its configured failure threshold.
      </p>
    </div>
  );
}
