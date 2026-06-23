import { createFileRoute } from '@tanstack/react-router';

import { pageTitle } from '@/lib/seo';
import { Callout } from '@/packages/ui/components/callout';

export const Route = createFileRoute('/_marketing/privacy-policy')({
  head: () => ({
    meta: [{ title: pageTitle('Privacy Policy') }],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-10 space-y-2">
        <p className="text-sm font-medium text-indigo-600">Legal</p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-sm text-zinc-600">
          How September handles the data you create and share.
        </p>
      </header>

      <Callout tone="info" title="How your data is stored" className="mb-8">
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>Local storage:</strong> Messages, settings, recordings, AI instructions, and
            speech preferences stay in your browser.
          </li>
          <li>
            <strong>External services:</strong> ElevenLabs receives text for voice synthesis;
            Google Gemini receives text, audio, images, or documents for AI features.
          </li>
          <li>
            <strong>API keys:</strong> Keys you provide are stored locally and can be changed or
            revoked in settings.
          </li>
          <li>
            <strong>Control:</strong> You can clear browser data to delete local information.
          </li>
        </ul>
      </Callout>

      <article className="space-y-8 text-sm text-zinc-700 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_p]:leading-relaxed [&_section]:space-y-3">
        <section>
          <h2>1. Introduction</h2>
          <p>
            September (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to
            protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard
            your information when you use our communication assistant application designed for
            people living with ALS, MND, and other neurodegenerative conditions.
          </p>
        </section>

        <section>
          <h2>2. Information we collect</h2>
          <h3>2.1 Information stored locally</h3>
          <p>
            September uses a local-first approach for unauthenticated users. The following data is
            stored in your browser&apos;s local storage:
          </p>
          <ul>
            <li>
              <strong>Account information:</strong> Name, location, medical diagnosis details, and
              onboarding preferences
            </li>
            <li>
              <strong>Messages:</strong> All conversations, text content, and message metadata
            </li>
            <li>
              <strong>Audio data:</strong> Speech recordings, voice synthesis settings, and audio
              alignment data
            </li>
            <li>
              <strong>AI settings:</strong> Custom instructions, training corpus, and API keys you
              provide
            </li>
            <li>
              <strong>Speech preferences:</strong> Voice selection, speed, pitch, and other TTS
              settings
            </li>
            <li>
              <strong>Notes:</strong> Any notes you create or files you upload
            </li>
          </ul>

          <h3>2.2 Information sent to external services</h3>
          <p>
            To provide AI-powered features, we share specific data with external service providers:
          </p>

          <Callout tone="warning" title="ElevenLabs (voice synthesis)">
            <ul className="list-disc space-y-1 pl-5">
              <li>Text content you want to convert to speech</li>
              <li>Voice settings (speed, stability, similarity)</li>
              <li>Your ElevenLabs API key (if provided)</li>
            </ul>
          </Callout>

          <Callout tone="success" title="Google Gemini AI">
            <ul className="list-disc space-y-1 pl-5">
              <li>Text for generating conversation suggestions</li>
              <li>Previous message context for better predictions</li>
              <li>Audio files for speech-to-text transcription</li>
              <li>Images and documents for text extraction</li>
              <li>Your Gemini API key (if provided)</li>
              <li>Persona information for corpus generation</li>
            </ul>
          </Callout>
        </section>

        <section>
          <h2>3. How we use your information</h2>
          <ul>
            <li>
              <strong>Communication assistance:</strong> To provide text-to-speech, AI-powered
              suggestions, and transcription services
            </li>
            <li>
              <strong>Personalization:</strong> To improve AI responses based on your communication
              patterns and preferences
            </li>
            <li>
              <strong>Voice synthesis:</strong> To generate speech audio using your selected voice
              and settings
            </li>
            <li>
              <strong>Note processing:</strong> To extract text from images and files you upload
            </li>
            <li>
              <strong>Service improvement:</strong> To enhance our application&apos;s functionality
              and user experience
            </li>
          </ul>
        </section>

        <section>
          <h2>4. Data retention</h2>
          <ul>
            <li>
              <strong>Local data:</strong> Stored in your browser until you clear it or uninstall
              the application
            </li>
            <li>
              <strong>External services:</strong> Subject to each provider&apos;s retention policies
              (ElevenLabs, Google)
            </li>
            <li>
              <strong>API processing:</strong> Most external services process data temporarily and
              don&apos;t retain it long-term
            </li>
          </ul>
        </section>

        <section>
          <h2>5. Your privacy rights</h2>
          <h3>5.1 Data control</h3>
          <ul>
            <li>
              <strong>Local data:</strong> You have complete control — clear browser data to delete
              all local information
            </li>
            <li>
              <strong>API keys:</strong> You can revoke or change your API keys at any time through
              settings
            </li>
            <li>
              <strong>External services:</strong> Contact service providers directly to manage data
              they process
            </li>
          </ul>

          <h3>5.2 Data portability</h3>
          <p>
            Since most data is stored locally, you can export your information by backing up your
            browser data or using our export features (where available).
          </p>
        </section>

        <section>
          <h2>6. Security</h2>
          <ul>
            <li>
              <strong>Local storage:</strong> Protected by your device&apos;s security measures and
              browser isolation
            </li>
            <li>
              <strong>API communications:</strong> All external service communications use HTTPS
              encryption
            </li>
            <li>
              <strong>No server storage:</strong> We don&apos;t store your personal data on our
              servers for unauthenticated users
            </li>
            <li>
              <strong>API key security:</strong> Your API keys are stored locally and never sent to
              our servers
            </li>
          </ul>
        </section>

        <section>
          <h2>7. Third-party services</h2>
          <p>Our application integrates with:</p>
          <ul>
            <li>
              <strong>ElevenLabs:</strong> Voice synthesis and cloning services
            </li>
            <li>
              <strong>Google Gemini:</strong> AI-powered text generation and processing
            </li>
          </ul>
          <p>
            Each service has its own privacy policy. We recommend reviewing their policies to
            understand how they handle your data.
          </p>
        </section>

        <section>
          <h2>8. Medical disclaimer</h2>
          <p>
            September is an assistive communication tool, not a medical device. We do not collect,
            store, or process personal health information beyond basic diagnosis categories you
            choose to share for personalization purposes.
          </p>
        </section>

        <section>
          <h2>9. Children&apos;s privacy</h2>
          <p>
            Our service is not directed to children under 13. We do not knowingly collect personal
            information from children under 13. If you believe we have collected information from a
            child under 13, please contact us immediately.
          </p>
        </section>

        <section>
          <h2>10. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot;
            date.
          </p>
        </section>

        <section>
          <h2>11. Contact us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at:</p>
          <ul>
            <li>
              <strong>GitHub:</strong>{' '}
              <a
                href="https://github.com/sonnes/september/issues"
                className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
              >
                Create an issue
              </a>
            </li>
            <li>
              <strong>Email:</strong> Create an issue on GitHub for the fastest response
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}
