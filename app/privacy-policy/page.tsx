import type { Metadata } from 'next';
import Link from 'next/link';

import Layout from '@/components/layout';
import { DesktopNav, MobileNav } from '@/components/nav';

import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';

import { createClient } from '@/supabase/server';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for September - Communication Assistant',
};

export default async function PrivacyPolicy() {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();
  const provider = user ? 'supabase' : 'triplit';

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <Layout>
        <Layout.Header>
          <DesktopNav user={user} current="/privacy-policy" />
          <MobileNav title="Privacy Policy" user={user} current="/privacy-policy">
            <Link
              href="/"
              className="p-2 text-white rounded-full transition-colors cursor-pointer hover:bg-white/10"
              aria-label="Back to home"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          </MobileNav>
          <div className="hidden md:flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-white">Privacy Policy</h1>
          </div>
        </Layout.Header>

        <Layout.Content>
          <div className="max-w-4xl mx-auto">
            {/* Data Storage Overview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">How Your Data is Stored</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-blue-800 mb-2">🖥️ Local Storage (Browser)</h3>
                  <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                    <li>Messages and conversations</li>
                    <li>Account settings and preferences</li>
                    <li>Audio recordings and voice data</li>
                    <li>AI instructions and training corpus</li>
                    <li>Speech synthesis settings</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-blue-800 mb-2">☁️ External Services</h3>
                  <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                    <li>
                      <strong>ElevenLabs:</strong> Text for voice synthesis
                    </li>
                    <li>
                      <strong>Google Gemini:</strong> Text/audio for AI features
                    </li>
                    <li>
                      <strong>Supabase:</strong> Data for authenticated users
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="prose prose-lg prose-gray max-w-none">
              <h2>1. Introduction</h2>
              <p>
                September (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to
                protecting your privacy. This Privacy Policy explains how we collect, use, and
                safeguard your information when you use our communication assistant application
                designed for people living with ALS, MND, and other neurodegenerative conditions.
              </p>

              <h2>2. Information We Collect</h2>

              <h3>2.1 Information Stored Locally</h3>
              <p>
                September uses a local-first approach for unauthenticated users. The following data
                is stored in your browser&apos;s local storage:
              </p>
              <ul>
                <li>
                  <strong>Account Information:</strong> Name, location, medical diagnosis details,
                  and onboarding preferences
                </li>
                <li>
                  <strong>Messages:</strong> All conversations, text content, and message metadata
                </li>
                <li>
                  <strong>Audio Data:</strong> Speech recordings, voice synthesis settings, and
                  audio alignment data
                </li>
                <li>
                  <strong>AI Settings:</strong> Custom instructions, training corpus, and API keys
                  you provide
                </li>
                <li>
                  <strong>Speech Preferences:</strong> Voice selection, speed, pitch, and other TTS
                  settings
                </li>
                <li>
                  <strong>Documents:</strong> Any text documents you create or upload
                </li>
              </ul>

              <h3>2.2 Information Sent to External Services</h3>
              <p>
                To provide AI-powered features, we share specific data with external service
                providers:
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 my-4">
                <h4 className="font-medium text-yellow-800 mb-2">ElevenLabs (Voice Synthesis)</h4>
                <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                  <li>Text content you want to convert to speech</li>
                  <li>Voice settings (speed, stability, similarity)</li>
                  <li>Your ElevenLabs API key (if provided)</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-4 my-4">
                <h4 className="font-medium text-green-800 mb-2">Google Gemini AI</h4>
                <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
                  <li>Text for generating conversation suggestions</li>
                  <li>Previous message context for better predictions</li>
                  <li>Audio files for speech-to-text transcription</li>
                  <li>Images and documents for text extraction</li>
                  <li>Your Gemini API key (if provided)</li>
                  <li>Persona information for corpus generation</li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded p-4 my-4">
                <h4 className="font-medium text-purple-800 mb-2">
                  Supabase (Authenticated Users Only)
                </h4>
                <ul className="text-sm text-purple-700 list-disc list-inside space-y-1">
                  <li>All account information and preferences</li>
                  <li>Messages and conversation history</li>
                  <li>Audio files and recordings</li>
                  <li>Search queries and usage patterns</li>
                </ul>
              </div>

              <h2>3. How We Use Your Information</h2>
              <ul>
                <li>
                  <strong>Communication Assistance:</strong> To provide text-to-speech, AI-powered
                  suggestions, and transcription services
                </li>
                <li>
                  <strong>Personalization:</strong> To improve AI responses based on your
                  communication patterns and preferences
                </li>
                <li>
                  <strong>Voice Synthesis:</strong> To generate speech audio using your selected
                  voice and settings
                </li>
                <li>
                  <strong>Document Processing:</strong> To extract text from images and documents
                  you upload
                </li>
                <li>
                  <strong>Service Improvement:</strong> To enhance our application&apos;s
                  functionality and user experience
                </li>
              </ul>

              <h2>4. Data Retention</h2>
              <ul>
                <li>
                  <strong>Local Data:</strong> Stored in your browser until you clear it or
                  uninstall the application
                </li>
                <li>
                  <strong>External Services:</strong> Subject to each provider&apos;s retention
                  policies (ElevenLabs, Google, Supabase)
                </li>
                <li>
                  <strong>API Processing:</strong> Most external services process data temporarily
                  and don&apos;t retain it long-term
                </li>
              </ul>

              <h2>5. Your Privacy Rights</h2>
              <h3>5.1 Data Control</h3>
              <ul>
                <li>
                  <strong>Local Data:</strong> You have complete control - clear browser data to
                  delete all local information
                </li>
                <li>
                  <strong>API Keys:</strong> You can revoke or change your API keys at any time
                  through settings
                </li>
                <li>
                  <strong>External Services:</strong> Contact service providers directly to manage
                  data they process
                </li>
              </ul>

              <h3>5.2 Data Portability</h3>
              <p>
                Since most data is stored locally, you can export your information by backing up
                your browser data or using our export features (where available).
              </p>

              <h2>6. Security</h2>
              <ul>
                <li>
                  <strong>Local Storage:</strong> Protected by your device&apos;s security measures
                  and browser isolation
                </li>
                <li>
                  <strong>API Communications:</strong> All external service communications use HTTPS
                  encryption
                </li>
                <li>
                  <strong>No Server Storage:</strong> We don&apos;t store your personal data on our
                  servers for unauthenticated users
                </li>
                <li>
                  <strong>API Key Security:</strong> Your API keys are stored locally and never sent
                  to our servers
                </li>
              </ul>

              <h2>7. Third-Party Services</h2>
              <p>Our application integrates with:</p>
              <ul>
                <li>
                  <strong>ElevenLabs:</strong> Voice synthesis and cloning services
                </li>
                <li>
                  <strong>Google Gemini:</strong> AI-powered text generation and processing
                </li>
                <li>
                  <strong>Supabase:</strong> Cloud database for authenticated users
                </li>
              </ul>
              <p>
                Each service has its own privacy policy. We recommend reviewing their policies to
                understand how they handle your data.
              </p>

              <h2>8. Medical Disclaimer</h2>
              <p>
                September is an assistive communication tool, not a medical device. We do not
                collect, store, or process personal health information beyond basic diagnosis
                categories you choose to share for personalization purposes.
              </p>

              <h2>9. Children&apos;s Privacy</h2>
              <p>
                Our service is not directed to children under 13. We do not knowingly collect
                personal information from children under 13. If you believe we have collected
                information from a child under 13, please contact us immediately.
              </p>

              <h2>10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by posting the new Privacy Policy on this page and updating the &quot;Last
                updated&quot; date.
              </p>

              <h2>11. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us at:</p>
              <ul>
                <li>
                  <strong>GitHub:</strong>{' '}
                  <a
                    href="https://github.com/sonnes/september/issues"
                    className="text-blue-600 hover:underline"
                  >
                    Create an issue
                  </a>
                </li>
                <li>
                  <strong>Email:</strong> Create an issue on GitHub for the fastest response
                </li>
              </ul>
            </div>
          </div>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
