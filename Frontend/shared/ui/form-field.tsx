import { useFormContext } from 'react-hook-form';
import { Label } from '@/shared/ui/label';
import { Input, type InputProps } from '@/shared/ui/input';
import { cn } from '@/lib/utils/cn';

export type FormFieldProps = InputProps & {
  name: string;
  label: string;
};

export function FormField({ name, label, className, ...props }: FormFieldProps): React.JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name]?.message as string | undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
        {...register(name)}
        {...props}
      />
      {error ? (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
