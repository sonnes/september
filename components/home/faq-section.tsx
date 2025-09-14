import faqs from '@/data/home-faqs.json';

export function FAQSection() {
  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map(faq => (
            <details key={faq.id} className="bg-gray-50 rounded-lg p-6 cursor-pointer hover:bg-gray-100 transition group">
              <summary className="font-semibold text-lg list-none flex items-center justify-between">
                <span>{faq.question}</span>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
