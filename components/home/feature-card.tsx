import React from 'react';

export function FeatureCard({
  title,
  description,
  link,
  href,
  media,
  reverse = false,
}: {
  title: string;
  description: string;
  link?: string;
  href?: string;
  media?: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col md:flex-row items-center gap-12 ${reverse ? 'md:flex-row-reverse' : ''}`}
        >
          <div className="md:w-1/2">
            <h2 className="text-4xl font-bold mb-6">{title}</h2>
            <p className="text-lg mb-6">{description}</p>
            {link && href && (
              <a
                href={href}
                className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {link}
              </a>
            )}
          </div>
          {media && (
            <div className="md:w-1/2">
              <div className="relative">{media}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
