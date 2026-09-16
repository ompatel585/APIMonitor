import { Spinner } from '@/components/spinner';

export function FullPageSpinner(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
