import React from 'react';

export function HighlightCard({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className={`rounded-xl py-6 px-8 flex space-x-4 items-center shadow-sm`}>
      <div className={`bg-gray-100 p-3 rounded-xl shrink-0`}>{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
      </div>
    </div>
  );
}
