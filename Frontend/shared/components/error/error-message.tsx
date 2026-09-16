import { ApiError } from '@/lib/http/api-error';

export function ErrorMessage({ error }: { error: unknown }): React.JSX.Element {
  const message = ApiError.isApiError(error) ? error.message : 'Something went wrong. Please try again.';

  return (
    <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}
