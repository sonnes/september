import React from 'react';

import clsx from 'clsx';

export function Fieldset({
  className,
  ...props
}: { disabled?: boolean } & Omit<React.ComponentPropsWithoutRef<'fieldset'>, 'disabled'>) {
  return (
    <fieldset
      {...props}
      className={clsx(
        className,
        'group',
        // Disabled state
        'data-disabled:opacity-50 disabled:opacity-50'
      )}
    />
  );
}

export function Legend({ className, ...props }: React.ComponentPropsWithoutRef<'legend'>) {
  return (
    <legend
      {...props}
      data-slot="legend"
      className={clsx(
        className,
        'text-base/6 font-semibold text-zinc-950 data-disabled:opacity-50 sm:text-sm/6'
      )}
    />
  );
}

export function FieldGroup({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div {...props} data-slot="control" className={clsx(className, 'space-y-8')} />;
}

export function Field({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div {...props} data-slot="field" className={clsx(className, 'space-y-3')} />;
}

export function Label({ className, ...props }: React.ComponentPropsWithoutRef<'label'>) {
  return (
    <label
      {...props}
      data-slot="label"
      className={clsx(
        className,
        'select-none text-base/6 text-zinc-950 data-disabled:opacity-50 sm:text-sm/6'
      )}
    />
  );
}

export function Description({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
  return (
    <p
      {...props}
      data-slot="description"
      className={clsx(className, 'text-base/6 text-zinc-500 data-disabled:opacity-50 sm:text-sm/6')}
    />
  );
}

export function ErrorMessage({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
  return (
    <p
      {...props}
      data-slot="error"
      className={clsx(className, 'text-base/6 text-red-600 data-disabled:opacity-50 sm:text-sm/6')}
    />
  );
}
