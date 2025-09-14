export function PersonalStoryBanner() {
  return (
    <section className="py-16 bg-gradient-to-r from-purple-600 to-blue-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <svg className="w-10 h-10 text-white/30 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
        </svg>
        <blockquote className="text-2xl text-white font-light italic mb-4">
          &ldquo;After my ALS diagnosis in 2019, I discovered that existing tools weren&rsquo;t designed for how we actually communicate. So I built September.&rdquo;
        </blockquote>
        <p className="text-white/90 font-medium">— Ravi Atluri, Founder</p>
      </div>
    </section>
  );
}