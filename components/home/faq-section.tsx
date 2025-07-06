import Link from 'next/link';

import faqs from '@/data/home-faqs.json';

export function FAQSection() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:pt-32 lg:px-8 lg:py-40">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <h2 className="text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-pretty text-base/7 text-gray-600">
              Can&apos;t find the answer you&apos;re looking for?{' '}
              <Link href="/contact" className="font-semibold text-amber-500 hover:text-amber-600">
                Reach out to our team
              </Link>
            </p>
          </div>
          <div className="mt-10 lg:col-span-7 lg:mt-0">
            <dl className="space-y-10">
              {faqs.map(faq => (
                <div key={faq.id}>
                  <dt className="text-base/7 font-semibold text-gray-900">{faq.question}</dt>
                  <dd className="mt-2 text-base/7 text-gray-600">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
