import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-zinc-800 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div>
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
              september
            </h3>
            <p className="text-zinc-400 text-sm">
              Communication assistant for people living with ALS, MND, and other conditions.
            </p>
          </div>
        </div>
        <div className="border-t border-gray-800 text-center">
          <p className="text-zinc-400 text-sm">
            © 2024-{new Date().getFullYear()} September. Built with ❤️ by someone who understands.
          </p>
          <div className="mt-4 space-x-6 text-sm">
            <Link href="/privacy-policy" className="text-zinc-400 hover:text-white transition">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-zinc-400 hover:text-white transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
