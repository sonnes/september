'use client';

import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// ============================================================================
// FormField - Input field wrapper
// ============================================================================

interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<React.ComponentProps<typeof Input>, 'name'> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
}

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ name, control, label, ...props }: FormFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
          <Input
            {...field}
            value={field.value as string}
            id={field.name}
            aria-invalid={fieldState.invalid}
            {...props}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

// ============================================================================
// FormTextarea - Textarea field wrapper
// ============================================================================

interface FormTextareaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<React.ComponentProps<typeof Textarea>, 'name'> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  description?: string;
}

export function FormTextarea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ name, control, label, description, ...props }: FormTextareaProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
          {description && <FieldDescription>{description}</FieldDescription>}
          <Textarea
            {...field}
            value={field.value as string}
            id={field.name}
            aria-invalid={fieldState.invalid}
            {...props}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

// ============================================================================
// FormCheckbox - Checkbox field wrapper
// ============================================================================

interface FormCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<React.ComponentProps<typeof Checkbox>, 'name' | 'checked' | 'onCheckedChange'> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  description?: string;
}

export function FormCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ name, control, label, description, ...props }: FormCheckboxProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} orientation="horizontal">
          <Checkbox
            id={field.name}
            checked={field.value as boolean}
            onCheckedChange={field.onChange}
            aria-invalid={fieldState.invalid}
            {...props}
          />
          <div className="flex flex-col gap-1">
            {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
            {description && <FieldDescription>{description}</FieldDescription>}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </div>
        </Field>
      )}
    />
  );
}

// ============================================================================
// FormSelect - Select field wrapper
// ============================================================================

interface SelectOption {
  id: string;
  name: string;
}

interface FormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
}

export function FormSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  placeholder = 'Select an option',
  options,
  disabled,
}: FormSelectProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
          {description && <FieldDescription>{description}</FieldDescription>}
          <Select onValueChange={field.onChange} value={field.value as string} disabled={disabled}>
            <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
