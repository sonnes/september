import Link from 'next/link';

import { Github, Play } from 'lucide-react';

import { KeyboardProvider } from '@/components/context/keyboard-provider';
import { TextProvider } from '@/components/context/text-provider';
import Autocomplete from '@/components/editor/autocomplete';
import Editor from '@/components/editor/simple';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="pt-24 pb-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-8">
            <Badge
              asChild
              variant="secondary"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200"
            >
              <a
                href="https://github.com/sonnes/september"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-4 h-4" />
                <span>Open Source</span>
              </a>
            </Badge>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            <span className="text-amber-500">Faster</span> Communication
            <br />
            <span className="text-amber-500">Fewer</span> Keystrokes
          </h1>
          <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
            A communication assistant for people living with ALS, MND, and other speech & motor
            difficulties
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 h-auto rounded-full text-lg font-semibold shadow-lg hover:shadow-xl"
            >
              <Link href="/onboarding">Get Started</Link>
            </Button>
            {/* <Button
              variant="outline"
              className="bg-white text-amber-600 px-8 py-4 h-auto rounded-full text-lg font-semibold border-2 border-amber-600 hover:bg-amber-50"
            >
              <Play className="w-5 h-5" />
              Watch Demo
            </Button> */}
          </div>
        </div>

        {/* Interactive Demo Visualization */}
        <div className="mt-16 relative">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto border border-zinc-200">
            <div className="flex items-center mb-6">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="ml-4 text-gray-500 text-sm font-medium">September</span>
            </div>
            <KeyboardProvider>
              <TextProvider defaultText="I would like ">
                <Autocomplete />
                <Editor />
              </TextProvider>
            </KeyboardProvider>
          </div>
        </div>
      </div>
    </section>
  );
}
