import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
          Get Started in Minutes
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-none bg-transparent shadow-none">
            <CardContent className="text-center p-0">
              <Avatar className="w-16 h-16 mx-auto mb-4 text-2xl font-bold">
                <AvatarFallback className="bg-purple-600 text-white">1</AvatarFallback>
              </Avatar>
              <h3 className="font-semibold mb-2">Open in Any Browser</h3>
              <p className="text-gray-600 text-sm">No downloads or complex setup</p>
            </CardContent>
          </Card>

          <Card className="border-none bg-transparent shadow-none">
            <CardContent className="text-center p-0">
              <Avatar className="w-16 h-16 mx-auto mb-4 text-2xl font-bold">
                <AvatarFallback className="bg-purple-600 text-white">2</AvatarFallback>
              </Avatar>
              <h3 className="font-semibold mb-2">Set Up Your Voice</h3>
              <p className="text-gray-600 text-sm">Clone your voice or select alternatives</p>
            </CardContent>
          </Card>

          <Card className="border-none bg-transparent shadow-none">
            <CardContent className="text-center p-0">
              <Avatar className="w-16 h-16 mx-auto mb-4 text-2xl font-bold">
                <AvatarFallback className="bg-purple-600 text-white">3</AvatarFallback>
              </Avatar>
              <h3 className="font-semibold mb-2">Start Communicating</h3>
              <p className="text-gray-600 text-sm">Type, speak, and connect naturally</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
