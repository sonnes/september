import React from 'react';

interface FormSectionHeaderProps {
  title: string;
  description?: string;
}

export function FormSectionHeader({ title, description }: FormSectionHeaderProps) {
  return (
    <>
      <h2 className="text-base/7 font-semibold text-zinc-900">{title}</h2>
      {description && <p className="mt-1 text-sm/6 text-zinc-600">{description}</p>}
    </>
  );
}
// Usage:
// <FormSectionHeader title="Profile" description="This information will be displayed publicly so be careful what you share." />
