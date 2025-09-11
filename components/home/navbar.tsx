import Image from 'next/image';
import Link from 'next/link';


export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="September Logo" width={40} height={40} className="mr-2" />
            <span className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-transparent bg-clip-text">
              september
            </span>
          </Link>
        </div>
        <div className="flex items-center">
          <Link
            href="/talk"
            className="bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Try Now
          </Link>
        </div>
      </div>
    </nav>
  );
}
