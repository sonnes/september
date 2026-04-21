import Link from 'next/link';

import { Callout } from '@september/ui/components/callout';

export const metadata = {
  title: 'Terms of Service — September',
};

export default function TermsOfService() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-10 space-y-2">
        <p className="text-sm font-medium text-indigo-600">Legal</p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Terms of Service
        </h1>
        <p className="text-sm text-zinc-600">
          The terms that apply when you use September.
        </p>
      </header>

      <Callout tone="warning" title="What you're agreeing to" className="mb-8">
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>Service:</strong> September is an assistive communication app for people
            with speech/motor difficulties.
          </li>
          <li>
            <strong>Data:</strong> Your data is primarily stored locally on your device.
          </li>
          <li>
            <strong>External services:</strong> Some features use third-party AI and speech
            services.
          </li>
          <li>
            <strong>Medical use:</strong> This is an assistive tool, not a medical device.
          </li>
          <li>
            <strong>Open source:</strong> Available freely under an open-source license.
          </li>
        </ul>
      </Callout>

      <article className="space-y-8 text-zinc-700 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_p]:leading-relaxed [&_section]:space-y-3">
        <section>
          <h2>1. Acceptance of terms</h2>
          <p>
            By accessing or using September (&quot;the Service&quot;), you agree to be bound by
            these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these
            terms, you may not access the Service.
          </p>
        </section>

        <section>
          <h2>2. Description of service</h2>
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
        </section>

        <section>
          <h2>3. User responsibilities</h2>
          <h3>3.1 Appropriate use</h3>
          <p>You agree to use September responsibly and ethically. You will not:</p>
          <ul>
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>Create or share harmful, abusive, or discriminatory content</li>
            <li>Attempt to circumvent or disable security features</li>
            <li>Use voice cloning features to impersonate others without consent</li>
            <li>Share or distribute others&apos; personal information</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
          </ul>

          <h3>3.2 API keys and external services</h3>
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

          <h3>3.3 Content and data</h3>
          <p>
            You retain ownership of all content you create or input into September. However, by
            using external AI services, you acknowledge that your data may be processed by third
            parties according to their respective privacy policies.
          </p>
        </section>

        <section>
          <h2>4. Medical disclaimer</h2>
          <Callout tone="destructive" title="Important medical disclaimer">
            <p className="font-medium text-red-900">
              September is NOT a medical device and is NOT intended for medical diagnosis,
              treatment, or emergency communication.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Do not rely on September for emergency communications</li>
              <li>Always consult healthcare professionals for medical advice</li>
              <li>The Service may have technical limitations or failures</li>
              <li>AI-generated content may contain errors or inappropriate suggestions</li>
            </ul>
          </Callout>
        </section>

        <section>
          <h2>5. Service availability</h2>
          <h3>5.1 Uptime and reliability</h3>
          <p>While we strive to keep September available 24/7, we do not guarantee:</p>
          <ul>
            <li>Uninterrupted access to the Service</li>
            <li>Availability of third-party integrations (ElevenLabs, Google Gemini)</li>
            <li>Error-free operation of all features</li>
            <li>Compatibility with all devices or browsers</li>
          </ul>

          <h3>5.2 Maintenance and updates</h3>
          <p>
            We may temporarily disable the Service for maintenance, updates, or improvements. We
            will attempt to provide notice when possible, but emergency maintenance may occur
            without warning.
          </p>
        </section>

        <section>
          <h2>6. Privacy and data</h2>
          <p>
            Your privacy is important to us. Please review our{' '}
            <Link
              href="/privacy-policy"
              className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
            >
              Privacy Policy
            </Link>{' '}
            to understand how we collect, use, and protect your information.
          </p>
          <h3>6.1 Data storage</h3>
          <ul>
            <li>
              <strong>Local storage:</strong> Most data is stored locally on your device
            </li>
            <li>
              <strong>External processing:</strong> Some features require sending data to
              third-party services
            </li>
            <li>
              <strong>No warranty:</strong> We cannot guarantee the security or availability of
              locally stored data
            </li>
          </ul>
        </section>

        <section>
          <h2>7. Intellectual property</h2>
          <h3>7.1 Open-source license</h3>
          <p>
            September is open-source software. The source code is available on GitHub under the
            applicable open-source license. You may use, modify, and distribute the software
            according to the license terms.
          </p>

          <h3>7.2 Third-party services</h3>
          <p>
            ElevenLabs, Google Gemini, and other integrated services are owned by their
            respective companies and subject to their own terms of service.
          </p>
        </section>

        <section>
          <h2>8. Limitation of liability</h2>
          <Callout tone="info" icon={null} title="Legal disclaimer">
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>SEPTEMBER IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND</li>
              <li>WE ARE NOT LIABLE FOR ANY DAMAGES ARISING FROM USE OF THE SERVICE</li>
              <li>THIS INCLUDES DIRECT, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES</li>
              <li>YOUR USE OF THE SERVICE IS AT YOUR OWN RISK</li>
            </ul>
          </Callout>
        </section>

        <section>
          <h2>9. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless September and its contributors
            from any claims, damages, or expenses arising from your use of the Service or
            violation of these Terms.
          </p>
        </section>

        <section>
          <h2>10. Third-party services</h2>
          <p>September integrates with third-party services that have their own terms:</p>
          <ul>
            <li>
              <strong>ElevenLabs:</strong> Voice synthesis and cloning services
            </li>
            <li>
              <strong>Google Gemini:</strong> AI text generation and processing
            </li>
          </ul>
          <p>
            Your use of these services is subject to their respective terms of service and
            privacy policies.
          </p>
        </section>

        <section>
          <h2>11. Modifications to terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will be effective
            immediately upon posting. Your continued use of the Service after changes indicates
            acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2>12. Termination</h2>
          <h3>12.1 Your rights</h3>
          <p>
            You may stop using September at any time. Since data is stored locally, you can
            delete it by clearing your browser data.
          </p>

          <h3>12.2 Our rights</h3>
          <p>
            We may suspend or terminate access to the Service for violations of these Terms or
            for any reason with or without notice.
          </p>
        </section>

        <section>
          <h2>13. Governing law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction where the primary
            maintainer resides. Any disputes will be resolved through appropriate legal channels
            in that jurisdiction.
          </p>
        </section>

        <section>
          <h2>14. Severability</h2>
          <p>
            If any provision of these Terms is found unenforceable, the remaining provisions
            will continue in full force and effect.
          </p>
        </section>

        <section>
          <h2>15. Contact information</h2>
          <p>For questions about these Terms of Service, please contact us:</p>
          <ul>
            <li>
              <strong>GitHub issues:</strong>{' '}
              <a
                href="https://github.com/sonnes/september/issues"
                className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
              >
                Create an issue
              </a>
            </li>
            <li>
              <strong>General support:</strong> Use GitHub issues for the fastest response
            </li>
          </ul>
        </section>

        <section>
          <h2>16. Acknowledgment</h2>
          <p>
            By using September, you acknowledge that you have read these Terms of Service,
            understand them, and agree to be bound by them.
          </p>
        </section>
      </article>
    </div>
  );
}
