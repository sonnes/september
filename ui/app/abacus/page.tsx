import { DictationCard } from '@/components/abacus/dictation-card';
import { DictationForm } from '@/components/abacus/dictation-form';
import SingleColumnLayout from '@/components/layouts/single-column';
import { getAllDictations } from '@/db/dictations';

export const metadata = {
  title: 'Abacus Dictation',
};

// By default, Next.js components are Server Components
// No need for 'use client' directive
export default async function AbacusPage() {
  // This will run on the server
  const dictations = getAllDictations();

  return (
    <SingleColumnLayout title={metadata.title} color="amber">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="row-span-2">
          <DictationForm />
        </div>

        {dictations.map(dictation => (
          <DictationCard key={dictation.id} dictation={dictation} />
        ))}
      </div>
    </SingleColumnLayout>
  );
}
