'use client';

import React from 'react';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import { Control, Controller, FieldError, FieldPath, FieldValues } from 'react-hook-form';

import { Checkbox } from './checkbox';
import { Dropdown, DropdownOption } from './dropdown';
import { Radio } from './radio';
import { TextInput } from './text-input';
import { TextareaInput } from './textarea-input';

// Base form field wrapper component for labels, required indicators, and error handling
interface FormFieldWrapperProps {
  label?: string;
  id: string;
  required?: boolean;
  error?: FieldError;
  containerClassName?: string;
  children: React.ReactNode;
}

function FormFieldWrapper({
  label,
  id,
  required = false,
  error,
  containerClassName = '',
  children,
}: FormFieldWrapperProps) {
  return (
    <div className={containerClassName}>
      {label && (
        <div className="flex justify-between items-center">
          <label htmlFor={id} className="block text-sm/6 font-medium text-gray-900">
            {label}
          </label>
          {required && <span className="text-red-500 text-xs">*Required</span>}
        </div>
      )}
      <div className="mt-2">{children}</div>
      {error && (
        <p className="mt-1 text-sm text-red-600" id={`${id}-error`}>
          {error.message}
        </p>
      )}
    </div>
  );
}

// Extended Input Component with react-hook-form integration
interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  required?: boolean;
  containerClassName?: string;
}

export function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  required = false,
  containerClassName = '',
  ...props
}: FormInputProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormFieldWrapper
          label={label}
          id={name}
          required={required}
          error={error}
          containerClassName={containerClassName}
        >
          <TextInput
            {...field}
            id={name}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${name}-error` : undefined}
            {...props}
          />
        </FormFieldWrapper>
      )}
    />
  );
}

// Extended Dropdown Component with react-hook-form integration
interface FormDropdownProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  options: DropdownOption[];
  required?: boolean;
  containerClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  onSelect?: (value: string) => void;
}

export function FormDropdown<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  options,
  required = false,
  containerClassName = '',
  placeholder = 'Select an option',
  disabled = false,
  onSelect,
}: FormDropdownProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedOption = options.find(
          option => option.id === field.value || option.name === field.value
        );

        const handleSelect = (optionId: string) => {
          field.onChange(optionId);
          onSelect?.(optionId);
        };

        return (
          <FormFieldWrapper
            label={label}
            id={name}
            required={required}
            error={error}
            containerClassName={containerClassName}
          >
            <Menu as="div" className="relative inline-block w-full">
              <MenuButton
                disabled={disabled}
                className="inline-flex w-full justify-between items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${name}-error` : undefined}
              >
                {selectedOption?.name || placeholder}
                <ChevronDownIcon aria-hidden="true" className="-mr-1 size-5 text-gray-400" />
              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                <div className="py-1">
                  {options && options.length > 0 ? (
                    options.map(option => (
                      <MenuItem key={option.id} disabled={option.disabled}>
                        <button
                          type="button"
                          onClick={() => handleSelect(option.id)}
                          className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {option.name}
                        </button>
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>
                      <span className="block px-4 py-2 text-sm text-gray-500">
                        No options available
                      </span>
                    </MenuItem>
                  )}
                </div>
              </MenuItems>
            </Menu>
          </FormFieldWrapper>
        );
      }}
    />
  );
}

// Textarea Component with react-hook-form integration
interface FormTextareaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  required?: boolean;
  containerClassName?: string;
  helperText?: string;
}

export function FormTextarea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  required = false,
  containerClassName = '',
  helperText,
  ...props
}: FormTextareaProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={containerClassName}>
          {label && (
            <div className="flex justify-between items-center">
              <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900">
                {label}
              </label>
              {required && <span className="text-red-500 text-xs">*Required</span>}
            </div>
          )}
          <div className="mt-2">
            <TextareaInput
              {...field}
              id={name}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? `${name}-error` : undefined}
              {...props}
            />
          </div>
          {helperText && <p className="mt-3 text-sm/6 text-gray-600">{helperText}</p>}
          {error && (
            <p className="mt-1 text-sm text-red-600" id={`${name}-error`}>
              {error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}

// Checkbox Component with react-hook-form integration
interface FormCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  description?: string;
  required?: boolean;
  containerClassName?: string;
}

export function FormCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  required = false,
  containerClassName = '',
  ...props
}: FormCheckboxProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={containerClassName}>
          {label && (
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-900">{label}</label>
              {required && <span className="text-red-500 text-xs">*Required</span>}
            </div>
          )}
          <div className="flex gap-3">
            <Checkbox
              {...field}
              id={name}
              checked={field.value}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? `${name}-error` : undefined}
              {...props}
            />
            {label && (
              <div className="text-sm/6">
                <label htmlFor={name} className="font-medium text-gray-900">
                  {label}
                </label>
                {description && (
                  <p id={`${name}-description`} className="text-gray-500">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
          {error && (
            <p className="mt-1 text-sm text-red-600" id={`${name}-error`}>
              {error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}

// Radio Group Component with react-hook-form integration
interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface FormRadioGroupProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  options: RadioOption[];
  required?: boolean;
  containerClassName?: string;
}

export function FormRadioGroup<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  options,
  required = false,
  containerClassName = '',
}: FormRadioGroupProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={containerClassName}>
          {label && (
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-900">{label}</label>
              {required && <span className="text-red-500 text-xs">*Required</span>}
            </div>
          )}
          <div className="space-y-2">
            {options.map(option => (
              <div key={option.value} className="flex items-center gap-x-3">
                <Radio
                  id={`${name}-${option.value}`}
                  name={name}
                  value={option.value}
                  checked={field.value === option.value}
                  onChange={e => field.onChange(e.target.value)}
                  disabled={option.disabled}
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? `${name}-error` : undefined}
                />
                <label
                  htmlFor={`${name}-${option.value}`}
                  className="block text-sm/6 font-medium text-gray-900"
                >
                  {option.label}
                </label>
                {option.description && <p className="text-gray-500">{option.description}</p>}
              </div>
            ))}
          </div>
          {error && (
            <p className="mt-1 text-sm text-red-600" id={`${name}-error`}>
              {error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}

// Range Input Component with react-hook-form integration
interface FormRangeProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  required?: boolean;
  containerClassName?: string;
  min: number;
  max: number;
  step?: number;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}

export function FormRange<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  required = false,
  containerClassName = '',
  min,
  max,
  step = 1,
  showValue = true,
  valueFormatter,
  ...props
}: FormRangeProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const currentValue = field.value || min;
        const displayValue = valueFormatter ? valueFormatter(currentValue) : currentValue;

        return (
          <FormFieldWrapper
            label={label}
            id={name}
            required={required}
            error={error}
            containerClassName={containerClassName}
          >
            <div className="space-y-2">
              <input
                {...field}
                type="range"
                min={min}
                max={max}
                step={step}
                value={currentValue}
                onChange={e => field.onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${name}-error` : undefined}
                {...props}
              />
              {showValue && <div className="text-center text-sm text-gray-600">{displayValue}</div>}
            </div>
          </FormFieldWrapper>
        );
      }}
    />
  );
}

// Range Input with Labels Component
interface FormRangeWithLabelsProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  leftLabel?: string;
  rightLabel?: string;
  required?: boolean;
  containerClassName?: string;
  min: number;
  max: number;
  step?: number;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}

export function FormRangeWithLabels<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  leftLabel,
  rightLabel,
  required = false,
  containerClassName = '',
  min,
  max,
  step = 1,
  showValue = true,
  valueFormatter,
  ...props
}: FormRangeWithLabelsProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const currentValue = field.value || min;
        const displayValue = valueFormatter ? valueFormatter(currentValue) : currentValue;

        return (
          <FormFieldWrapper
            label={label}
            id={name}
            required={required}
            error={error}
            containerClassName={containerClassName}
          >
            <div className="space-y-2">
              {(leftLabel || rightLabel) && (
                <div className="flex justify-between text-sm text-gray-500">
                  {leftLabel && <span>{leftLabel}</span>}
                  {rightLabel && <span>{rightLabel}</span>}
                </div>
              )}
              <input
                {...field}
                type="range"
                min={min}
                max={max}
                step={step}
                value={currentValue}
                onChange={e => field.onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${name}-error` : undefined}
                {...props}
              />
              {showValue && <div className="text-center text-sm text-gray-600">{displayValue}</div>}
            </div>
          </FormFieldWrapper>
        );
      }}
    />
  );
}

// Usage examples:
/*
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, FormDropdown, FormTextarea, FormCheckbox, FormRadioGroup, FormRangeWithLabels } from '@/components/ui/form';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  country: z.string().min(1, 'Country is required'),
  category: z.string().min(1, 'Category is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  newsletter: z.boolean(),
  gender: z.string().min(1, 'Gender is required'),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      newsletter: false,
    },
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormInput
        name="name"
        control={form.control}
        label="Full Name"
        required
        placeholder="Enter your full name"
      />
      
      <FormInput
        name="email"
        control={form.control}
        label="Email Address"
        type="email"
        required
        placeholder="Enter your email"
      />
      
      <FormDropdown
        name="country"
        control={form.control}
        label="Country"
        required
        options={[
          { id: 'us', name: 'United States' },
          { id: 'ca', name: 'Canada' },
          { id: 'uk', name: 'United Kingdom' },
        ]}
      />
      
      <FormDropdown
        name="category"
        control={form.control}
        label="Category"
        required
        options={[
          { id: 'tech', name: 'Technology' },
          { id: 'design', name: 'Design' },
          { id: 'business', name: 'Business' },
        ]}
      />
      
      <FormTextarea
        name="message"
        control={form.control}
        label="Message"
        required
        placeholder="Enter your message"
        rows={4}
        helperText="Please provide a detailed message."
      />
      
      <FormCheckbox
        name="newsletter"
        control={form.control}
        label="Subscribe to newsletter"
        description="Get notified about new features and updates."
      />
      
      <FormRadioGroup
        name="gender"
        control={form.control}
        label="Gender"
        required
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' },
        ]}
      />
      
      <button type="submit">Submit</button>
    </form>
  );
}
*/
