import type { ReactNode } from 'react';

import { BrandMark, BrandWordmark } from '@/components/brand';
import { Footer } from '@/components/home/footer';

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <title>{`${title} · September`}</title>
      <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a
          href="/"
          aria-label="September home"
          className="inline-flex min-h-11 items-center gap-2 rounded-control focus-visible:outline-2 focus-visible:outline-ring"
        >
          <BrandMark size={40} />
          <BrandWordmark aria-hidden="true" className="text-xl" />
        </a>
        <nav aria-label="Legal" className="flex flex-wrap gap-4">
          <a
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
            href="/privacy-policy"
          >
            Privacy Policy
          </a>
          <a
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
            href="/terms-of-service"
          >
            Terms of Service
          </a>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated 5 September 2026 · India</p>
        </div>
        <article className="space-y-8 text-base leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:pl-1 [&_section]:space-y-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
          {children}
        </article>
      </main>
      <Footer />
    </div>
  );
}

function Contact() {
  return (
    <section id="contact">
      <h2>Contact the maintainer</h2>
      <p>
        For questions or concerns,{' '}
        <a href="https://github.com/sonnes/september/issues">open a GitHub issue</a>. Issues are
        public. For a privacy concern, ask how to contact the maintainer privately without including
        personal information. Do not post API keys, medical details, recordings, or backups.
      </p>
      <p>
        This is a volunteer project, with no guaranteed support or response time. Any duties and
        deadlines required by applicable law still apply.
      </p>
    </section>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <h2>1. Scope and responsibility</h2>
        <p>
          September is a personal open-source project, maintained in India, not a company or a paid
          service. This notice covers its website, browser app, Mac app, and Mac keyboard. “We”
          refers to the maintainer operating this website, not everyone who contributes code.
          Independently hosted copies have their own privacy arrangements.
        </p>
        <p>
          September stores your communication data on your device. There is no September login or
          automatic cloud sync. Optional cloud features send information to the services you
          connect. Website delivery and configured analytics also involve network requests. We do
          not receive a central copy of your spaces, notes, or conversations merely because you use
          September.
        </p>
      </section>
      <section>
        <h2>2. Information used on your device</h2>
        <ul>
          <li>
            <strong>Profile and settings:</strong> your chosen name, speaking style, personal words,
            setup choices, and voice and model preferences personalize the app.
          </li>
          <li>
            <strong>Communication:</strong> spaces, Talk history, Agent conversations, notes,
            phrases, and learned word patterns support writing and speaking.
          </li>
          <li>
            <strong>Service credentials:</strong> your OpenRouter and ElevenLabs API keys
            authenticate requests to those services.
          </li>
          <li>
            <strong>Audio:</strong> generated speech and timing information are cached to replay
            speech and export notes. Voice-cloning recordings remain in memory during preparation
            and are uploaded when you submit them.
          </li>
          <li>
            <strong>Local usage:</strong> typing counts, request counts, providers, models, timing,
            estimated costs, and error information support the usage reports.
          </li>
        </ul>
        <p>
          Your words and recordings can reveal health information and other sensitive details about
          you or someone else. September does not require a diagnosis, Aadhaar number, or medical
          record to use the app. Include other people’s information only when you have an
          appropriate basis to do so.
        </p>
        <p>
          The browser stores data in IndexedDB. The Mac app stores application data in SQLite and
          files, and service keys in the macOS Keychain. Local data is not given a separate
          application-level encryption layer. Device security and access to your browser profile
          matter. Scripts running on the browser app’s origin can access browser-stored keys.
        </p>
      </section>
      <section>
        <h2>3. Optional features and their recipients</h2>
        <ul>
          <li>
            <strong>AI assistance:</strong> OpenRouter and the selected model provider receive your
            request and relevant context, such as personal instructions, conversation history,
            notes, and Agent tool results. With cloud suggestions enabled, requests can occur as you
            compose or change context, without a separate Send action.
          </li>
          <li>
            <strong>Cloud speech:</strong> ElevenLabs receives the words to speak, voice identifier,
            sound settings, and your API credential. Audio or video export can request cloud speech
            too.
          </li>
          <li>
            <strong>Voice cloning:</strong> ElevenLabs receives the recordings, name, and
            description you submit and creates a voice in your provider account. Only submit your
            own voice or a voice you have explicit permission and the necessary rights to clone.
          </li>
          <li>
            <strong>System voices:</strong> your operating system or browser provides speech. Some
            voices use network services. September does not guarantee that every system voice works
            offline.
          </li>
          <li>
            <strong>Apple Intelligence:</strong> the supported Mac feature processes writing
            requests through the local model service. September does not silently switch this
            selection to a cloud provider of AI assistance.
          </li>
          <li>
            <strong>Exports and calls:</strong> export files stay where you save them until you
            share them. September Microphone sends generated speech to the calling app you select.
            That app and call participants control any further recording or sharing.
          </li>
        </ul>
        <p>
          Cloud providers have their own terms, retention, training, and international processing
          arrangements, which can vary by model and account settings. We do not promise zero
          retention or no training by those providers. Disconnecting a service does not delete
          information it already received. See{' '}
          <a href="https://openrouter.ai/privacy">OpenRouter’s privacy policy</a>,{' '}
          <a href="https://elevenlabs.io/privacy-policy">ElevenLabs’ privacy policy</a>, and{' '}
          <a href="https://www.apple.com/legal/privacy/">Apple’s privacy information</a>.
        </p>
      </section>
      <section>
        <h2>4. Camera, microphone, and keyboard access</h2>
        <p>
          Voice recording uses your microphone after permission. The Mac eye-tracker test bed uses
          camera frames and eye landmarks in memory. September does not save or upload that camera
          feed or calibration data. Stopping the test bed or leaving its page stops capture.
        </p>
        <p>
          The Mac keyboard uses Accessibility permission to send keystrokes and read the focused
          text field, caret, and selection in other apps. When a field exposes no text, it can
          display an echo of keys it sent. Recognized password fields are excluded from mirroring.
          Other apps determine what their accessibility interface exposes. The keyboard does not
          send mirrored text to the maintainer. You can revoke camera, microphone, or Accessibility
          permission in system settings.
        </p>
      </section>
      <section>
        <h2>5. Website delivery, analytics, and support</h2>
        <p>
          Vercel delivers the website and can process IP addresses, request paths, timestamps,
          browser details, and security logs. A direct request to a named space or note URL can
          disclose that path to the host. Browser video export downloads processing code from
          jsDelivr, which receives network request information, not the note or video being
          processed.
        </p>
        <p>
          When configured, the web app uses Umami to measure page visits. September replaces
          user-named route parameters and page titles in its page-view reports. It does not
          deliberately include message bodies, note contents, or API keys in those reports.
          Analytics infrastructure still receives network metadata and may process browser, device,
          and referrer information. Route masking is not a guarantee that all hosting or analytics
          information is anonymous. The Mac app does not load this web tracker. Local usage reports
          are separate and stay on your device.
        </p>
        <p>
          Browser storage is used for application functions. September does not implement
          advertising cookies or targeted advertising. Reading this policy does not give consent to
          optional personal-data processing. Where consent is required, the relevant processing
          needs a separate choice before it starts.
        </p>
        <p>
          If you contact us, we receive your contact details, correspondence, and any information
          you choose to include. We use this information to answer you, investigate problems, and
          handle requests or legal obligations. We do not sell your personal information or use your
          private communication content to train our own shared AI model.
        </p>
      </section>
      <section>
        <h2>6. Choices, withdrawal, and deletion</h2>
        <ul>
          <li>
            You can use basic writing, saved phrases, and available system speech without connecting
            a cloud provider.
          </li>
          <li>
            To stop future requests for AI assistance through cloud providers, select no writing service and remove any separate
            cloud Suggestions override. To stop cloud speech, select a system voice. Disconnect
            provider keys in Settings and revoke them with the provider if needed.
          </li>
          <li>
            You can review and edit local content in the app. Settings → Data exports a portable
            backup. It excludes service keys and cached audio.
          </li>
          <li>
            Clearing September’s site data in your browser removes local browser data and settings.
            Export anything you want to keep first.
          </li>
          <li>
            On Mac, uninstalling the app alone may leave its data files and Keychain entries.
            Disconnect services first and remove September’s application data separately. Ask for
            help if needed.
          </li>
          <li>
            Delete exported files, shared copies, and provider-hosted voices separately. September
            cannot remotely erase another recipient’s copies.
          </li>
        </ul>
        <p>
          You can also withdraw consent or request access, correction, or erasure of information we
          hold by contacting the maintainer. Withdrawal does not undo lawful processing already
          completed. A feature that needs the withdrawn information may stop working. We cannot
          retrieve, correct, or restore device-only information remotely.
        </p>
      </section>
      <section>
        <h2>7. Retention</h2>
        <p>
          Local content remains until you delete it or your browser or device removes it. Browser
          eviction, device loss, and storage failure can remove it sooner. Local usage events older
          than 90 days are removed when the app performs its retention cleanup. The browser speech
          cache is limited to 100 MiB and evicts older, less-used files. Mac audio files can remain
          in application storage until removed. Exported backups remain wherever you save them and
          are not automatically encrypted by September.
        </p>
        <p>
          We retain support correspondence only while needed to resolve the request and meet
          applicable legal or dispute requirements. Hosting and analytics retention depends on the
          configured service and necessary security or legal requirements. Optional cloud providers
          apply their own retention schedules. We do not describe those records as temporary or
          automatically erased.
        </p>
      </section>
      <section>
        <h2>8. Sharing, transfers, and security</h2>
        <p>
          Infrastructure and support providers may process information for the purposes described
          here. We may disclose information we hold when legally required, or as permitted by law to
          investigate abuse or protect people and the service. We limit disclosure to what the
          purpose requires. A change of maintainer does not authorize an unrelated use of your
          information.
        </p>
        <p>
          Hosting, support, and connected providers can process data outside India. There is no
          promise that all data stays in India. Applicable transfer restrictions and safeguards
          still apply. Selecting a cloud feature does not waive your legal rights.
        </p>
        <p>
          Cloud API requests use HTTPS. Local access is protected by browser isolation and your
          device’s security controls, including Keychain for Mac credentials. No software or storage
          system guarantees complete security. If a breach affects information under our control, we
          will investigate and take corrective action. We will notify affected people and
          authorities as required by applicable law.
        </p>
      </section>
      <section>
        <h2>9. Children and assistance</h2>
        <p>
          A parent or lawful guardian should help a child choose suitable tools and connected
          services. September does not provide a verified parental-consent process. Do not send a
          child’s personal information through cloud features unless the required permissions and
          provider safeguards are in place. If you believe the maintainer has received a child’s
          information, request private contact so it can be addressed.
        </p>
        <p>
          Speech or motor disability does not remove your ability to make decisions. A caregiver can
          help at your direction. Acting as a lawful guardian requires authority under applicable
          law.
        </p>
      </section>
      <section>
        <h2>10. Your rights in India</h2>
        <p>
          You can request access, correction, or deletion of personal information the maintainer
          actually holds. Device-only information must be managed on your device. Applicable Indian
          privacy rights and remedies are not waived by the MIT License.
        </p>
        <p>
          The Information Technology Act and SPDI Rules apply where their legal conditions are met.
          The DPDP Act, 2023 and Rules, 2025 have phased commencement. Statutory rights and
          complaint procedures apply when the relevant provisions are in force and cover the
          processing concerned. Personal or open-source status is not a blanket exemption from
          applicable law.
        </p>
        <p>
          See the official{' '}
          <a href="https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf">
            DPDP commencement notification
          </a>
          .
        </p>
      </section>
      <section>
        <h2>11. Changes to this notice</h2>
        <p>
          We will update the date and explain material changes before new practices take effect,
          except where urgent legal or security action is necessary. A revised policy does not
          authorize a new purpose that needs fresh consent. We will seek that consent separately
          where required.
        </p>
      </section>
      <Contact />
    </LegalPage>
  );
}

export function TermsOfService() {
  return (
    <LegalPage title="Terms of Service">
      <section>
        <h2>1. A personal open-source project</h2>
        <p>
          September is a personal open-source project maintained in India. It is offered free of
          charge, as a communication aid, without a service contract, subscription, or guaranteed
          support. These terms explain the hosted website and apps. The source code is governed by
          the MIT License.
        </p>
      </section>
      <section>
        <h2>2. MIT permissions</h2>
        <p>
          You can use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the
          software under the{' '}
          <a href="https://github.com/sonnes/september/blob/main/LICENSE">MIT License</a>. Include
          its copyright and permission notice in copies or substantial portions of the software.
          Third-party components retain their own licences. These terms do not add restrictions to
          your MIT permissions.
        </p>
      </section>
      <section>
        <h2>3. No warranty or guaranteed availability</h2>
        <p>
          The software is provided “as is”, without warranty of any kind, express or implied,
          including merchantability, fitness for a particular purpose, and non-infringement. There
          is no promise of uninterrupted operation, accurate AI output, continued hosting, updates,
          support, or compatibility with your device.
        </p>
        <p>
          To the fullest extent permitted by law, the authors and copyright holders are not liable
          for claims, damages, or other liability arising from the software or its use, whether in
          contract, tort, or otherwise. Nothing in these terms excludes rights, remedies, or
          liability that cannot be excluded under applicable law.
        </p>
      </section>
      <section>
        <h2>4. Your words and your choices</h2>
        <p>
          Your content remains yours. The project claims no ownership of your conversations, notes,
          or recordings, and no permission to sell them or train a shared model on them. The{' '}
          <a href="/privacy-policy">Privacy Policy</a> explains local storage and optional external
          processing.
        </p>
        <p>
          Keep backups of important content. Review generated suggestions before speaking or sharing
          them. Only clone voices with explicit permission and the necessary rights. Do not use the
          hosted service for unlawful impersonation, unauthorized access, or disruption. These
          responsibilities do not narrow the licence granted for the source code.
        </p>
      </section>
      <section>
        <h2>5. Communication and connected services</h2>
        <p>
          September does not provide medical advice or a monitored emergency service. It can fail,
          so keep another way to communicate urgent needs. Experimental features are offered for
          testing.
        </p>
        <p>
          Optional providers, including OpenRouter and ElevenLabs, have their own terms, privacy
          policies, age requirements, and charges. You choose whether to connect them and are
          responsible for their charges. Estimates shown in September are not bills or spending
          limits. The maintainer does not control these providers.
        </p>
      </section>
      <section>
        <h2>6. Changes and applicable law</h2>
        <p>
          The maintainer may change or stop hosting the website or maintaining the apps. Existing
          MIT permissions remain in effect. Changes to these notices will be dated on this page. A
          new privacy notice does not replace consent where consent is legally required.
        </p>
        <p>
          Indian law governs use of the hosted service, subject to mandatory protections that apply
          where you live. Courts and tribunals with lawful jurisdiction remain available. These
          terms require no private arbitration or waiver of statutory remedies. If a provision
          cannot be enforced, the others continue to apply as permitted by law.
        </p>
      </section>
      <Contact />
    </LegalPage>
  );
}
