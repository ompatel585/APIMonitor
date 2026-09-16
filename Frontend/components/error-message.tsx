import { errorMessage, isApiErrorPayload } from '@/store/base-query';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

export function ErrorMessage({ error }: { error: unknown }): React.JSX.Element {
  const message = isFetchBaseQueryError(error)
    ? errorMessage(error)
    : error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.';

  return (
    <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

export { isApiErrorPayload };
