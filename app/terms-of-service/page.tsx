'use client';

import Link from 'next/link';

import { ClientProviders } from '@/components/context/client-providers';
import SidebarLayout from '@/components/sidebar/layout';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function TermsOfService() {
  return (
    <ClientProviders>
      <SidebarLayout>
        <SidebarLayout.Header>
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Terms of Service</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </SidebarLayout.Header>

        <SidebarLayout.Content>
          <div className="max-w-4xl mx-auto p-6">
            {/* Service Overview */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-amber-900 mb-4">
                What You&apos;re Agreeing To
              </h2>
              <ul className="text-sm text-amber-800 list-disc list-inside space-y-2">
                <li>
                  <strong>Service:</strong> September is an assistive communication app for people
                  with speech/motor difficulties
                </li>
                <li>
                  <strong>Data:</strong> Your data is primarily stored locally on your device
                </li>
                <li>
                  <strong>External Services:</strong> Some features use third-party AI and speech
                  services
                </li>
                <li>
                  <strong>Medical Use:</strong> This is an assistive tool, not a medical device
                </li>
                <li>
                  <strong>Open Source:</strong> Available freely under open source license
                </li>
              </ul>
            </div>

            <div className="prose prose-lg prose-gray max-w-none">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using September (&quot;the Service&quot;), you agree to be bound by
                these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these
                terms, you may not access the Service.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                September is an open-source communication assistant designed specifically for people
                living with ALS, MND, and other neurodegenerative conditions that affect speech and
                motor function. The Service provides:
              </p>
              <ul>
                <li>Text-to-speech synthesis using multiple providers</li>
                <li>AI-powered conversation suggestions and completions</li>
                <li>Voice cloning and personalization features</li>
                <li>Speech-to-text transcription capabilities</li>
                <li>Document processing and text extraction</li>
                <li>Local-first data storage with optional cloud sync</li>
              </ul>

              <h2>3. User Responsibilities</h2>

              <h3>3.1 Appropriate Use</h3>
              <p>You agree to use September responsibly and ethically. You will not:</p>
              <ul>
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Create or share harmful, abusive, or discriminatory content</li>
                <li>Attempt to circumvent or disable security features</li>
                <li>Use voice cloning features to impersonate others without consent</li>
                <li>Share or distribute others&apos; personal information</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
              </ul>

              <h3>3.2 API Keys and External Services</h3>
              <p>
                If you choose to use external services (ElevenLabs, Google Gemini), you are
                responsible for:
              </p>
              <ul>
                <li>Obtaining and maintaining valid API keys</li>
                <li>Complying with third-party service terms and usage policies</li>
                <li>Any costs associated with external service usage</li>
                <li>Protecting your API keys from unauthorized access</li>
              </ul>

              <h3>3.3 Content and Data</h3>
              <p>
                You retain ownership of all content you create or input into September. However, by
                using external AI services, you acknowledge that your data may be processed by third
                parties according to their respective privacy policies.
              </p>

              <h2>4. Medical Disclaimer</h2>

              <div className="bg-red-50 border border-red-200 rounded p-4 my-6">
                <h3 className="font-medium text-red-800 mb-2">⚠️ Important Medical Disclaimer</h3>
                <div className="text-sm text-red-700 space-y-2">
                  <p>
                    <strong>
                      September is NOT a medical device and is NOT intended for medical diagnosis,
                      treatment, or emergency communication.
                    </strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Do not rely on September for emergency communications</li>
                    <li>Always consult healthcare professionals for medical advice</li>
                    <li>The Service may have technical limitations or failures</li>
                    <li>AI-generated content may contain errors or inappropriate suggestions</li>
                  </ul>
                </div>
              </div>

              <h2>5. Service Availability</h2>

              <h3>5.1 Uptime and Reliability</h3>
              <p>While we strive to keep September available 24/7, we do not guarantee:</p>
              <ul>
                <li>Uninterrupted access to the Service</li>
                <li>Availability of third-party integrations (ElevenLabs, Google Gemini)</li>
                <li>Error-free operation of all features</li>
                <li>Compatibility with all devices or browsers</li>
              </ul>

              <h3>5.2 Maintenance and Updates</h3>
              <p>
                We may temporarily disable the Service for maintenance, updates, or improvements. We
                will attempt to provide notice when possible, but emergency maintenance may occur
                without warning.
              </p>

              <h2>6. Privacy and Data</h2>
              <p>
                Your privacy is important to us. Please review our{' '}
                <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>{' '}
                to understand how we collect, use, and protect your information.
              </p>

              <h3>6.1 Data Storage</h3>
              <ul>
                <li>
                  <strong>Local Storage:</strong> Most data is stored locally on your device
                </li>
                <li>
                  <strong>External Processing:</strong> Some features require sending data to
                  third-party services
                </li>
                <li>
                  <strong>No Warranty:</strong> We cannot guarantee the security or availability of
                  locally stored data
                </li>
              </ul>

              <h2>7. Intellectual Property</h2>

              <h3>7.1 Open Source License</h3>
              <p>
                September is open source software. The source code is available on GitHub under the
                applicable open source license. You may use, modify, and distribute the software
                according to the license terms.
              </p>

              <h3>7.2 Third-Party Services</h3>
              <p>
                ElevenLabs, Google Gemini, and other integrated services are owned by their
                respective companies and subject to their own terms of service.
              </p>

              <h2>8. Limitation of Liability</h2>

              <div className="bg-gray-50 border border-gray-200 rounded p-4 my-6">
                <h3 className="font-medium text-gray-800 mb-2">Legal Disclaimer</h3>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>SEPTEMBER IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND</li>
                    <li>WE ARE NOT LIABLE FOR ANY DAMAGES ARISING FROM USE OF THE SERVICE</li>
                    <li>THIS INCLUDES DIRECT, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES</li>
                    <li>YOUR USE OF THE SERVICE IS AT YOUR OWN RISK</li>
                  </ul>
                </div>
              </div>

              <h2>9. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless September and its contributors
                from any claims, damages, or expenses arising from your use of the Service or
                violation of these Terms.
              </p>

              <h2>10. Third-Party Services</h2>
              <p>September integrates with third-party services that have their own terms:</p>
              <ul>
                <li>
                  <strong>ElevenLabs:</strong> Voice synthesis and cloning services
                </li>
                <li>
                  <strong>Google Gemini:</strong> AI text generation and processing
                </li>
                <li>
                  <strong>Supabase:</strong> Database and authentication services
                </li>
              </ul>
              <p>
                Your use of these services is subject to their respective terms of service and
                privacy policies.
              </p>

              <h2>11. Modifications to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Changes will be effective
                immediately upon posting. Your continued use of the Service after changes indicates
                acceptance of the new Terms.
              </p>

              <h2>12. Termination</h2>

              <h3>12.1 Your Rights</h3>
              <p>
                You may stop using September at any time. Since data is stored locally, you can
                delete it by clearing your browser data.
              </p>

              <h3>12.2 Our Rights</h3>
              <p>
                We may suspend or terminate access to the Service for violations of these Terms or
                for any reason with or without notice.
              </p>

              <h2>13. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the jurisdiction where the primary
                maintainer resides. Any disputes will be resolved through appropriate legal channels
                in that jurisdiction.
              </p>

              <h2>14. Severability</h2>
              <p>
                If any provision of these Terms is found unenforceable, the remaining provisions
                will continue in full force and effect.
              </p>

              <h2>15. Contact Information</h2>
              <p>For questions about these Terms of Service, please contact us:</p>
              <ul>
                <li>
                  <strong>GitHub Issues:</strong>{' '}
                  <a
                    href="https://github.com/sonnes/september/issues"
                    className="text-blue-600 hover:underline"
                  >
                    Create an issue
                  </a>
                </li>
                <li>
                  <strong>General Support:</strong> Use GitHub issues for the fastest response
                </li>
              </ul>

              <h2>16. Acknowledgment</h2>
              <p>
                By using September, you acknowledge that you have read these Terms of Service,
                understand them, and agree to be bound by them.
              </p>
            </div>
          </div>
        </SidebarLayout.Content>
      </SidebarLayout>
    </ClientProviders>
  );
}
