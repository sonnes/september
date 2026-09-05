export function PrivacySection() {
  return (
    <section id="privacy" className="scroll-mt-4 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 border-b border-zinc-200 pb-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
          Your words can stay on this device.
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-zinc-700">
          No September account. No required cloud service. Your spaces, phrases, and notes stay with
          you. Cloud writing and voice services are optional.
        </p>
      </div>
    </section>
  );
}
