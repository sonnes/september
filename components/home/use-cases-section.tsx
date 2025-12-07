import { Briefcase, Heart, Home, Star } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

export function UseCasesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Built for Real Life</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-purple-50 border-none hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Home className="w-8 h-8 text-purple-600 mb-4" />
              <h3 className="font-semibold mb-2">Daily Living</h3>
              <p className="text-gray-700 text-sm">Ask for help, express needs, share preferences</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-none hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Briefcase className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="font-semibold mb-2">Work & Collaboration</h3>
              <p className="text-gray-700 text-sm">
                Use your own voice in meetings, code reviews, team discussions
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-none hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Heart className="w-8 h-8 text-green-600 mb-4" />
              <h3 className="font-semibold mb-2">Family & Friends</h3>
              <p className="text-gray-700 text-sm">Video calls, stories, staying connected</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-none hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <Star className="w-8 h-8 text-yellow-600 mb-4" />
              <h3 className="font-semibold mb-2">Creative Expression</h3>
              <p className="text-gray-700 text-sm">Write, document, share your experiences</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
