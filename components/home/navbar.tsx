'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image src="/logo.png" alt="September Logo" width={32} height={32} className="mr-2" />
              <span className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
                September
              </span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="font-semibold text-gray-700 hover:text-amber-600 transition"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="font-semibold text-gray-700 hover:text-amber-600 transition"
            >
              How It Works
            </a>
            <a href="#faq" className="font-semibold text-gray-700 hover:text-amber-600 transition">
              FAQ
            </a>
            <Link
              href="/talk"
              className="bg-amber-500 font-semibold text-white px-6 py-2 rounded-full hover:bg-amber-600 transition"
            >
              Try September
            </Link>
          </div>
          <button
            className="md:hidden text-gray-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4">
            <div className="space-y-4">
              <a
                href="#features"
                className="block font-semibold text-gray-700 hover:text-amber-600"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="block font-semibold text-gray-700 hover:text-amber-600"
              >
                How It Works
              </a>
              <a href="#faq" className="block font-semibold text-gray-700 hover:text-amber-600">
                FAQ
              </a>
              <Link
                href="/talk"
                className="block w-full bg-amber-500 font-semibold text-white px-6 py-2 rounded-full hover:bg-amber-600 text-center"
              >
                Try September
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
