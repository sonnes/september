import { Button } from '@september/ui/components/button';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Check, Download } from 'lucide-react';

import { SectionHeader } from '@/components/home/section-header';
import { KEYBOARD_DOWNLOAD, KEYBOARD_VERSION } from '@/rules/keyboard-release';

import { Shot } from './media';

const STORY_URL = 'https://raviatluri.in/articles/redesigning-macos-on-screen-keyboard';

export function StorySection() {
  return (
    <section
      id="story"
      className="scroll-mt-4 border-y border-amber-100 bg-amber-50 px-4 py-14 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold text-amber-800">Why it exists</p>
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Built by someone who types with a head mouse.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-zinc-700">
            I’m Ravi. I have ALS, and I can’t type with my hands. I use a head-mounted mouse, and
            every click takes 0.8 seconds. Since 2022, I have typed with the Accessibility Keyboard
            that comes with macOS.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-zinc-700">
            Last year I built September to talk with my wife and my son. But by the time I switched
            to a browser, opened the app, and typed the message, my 8-year-old had left the room. He
            also learned to use the long pauses: “Mom, dad said okay! I can have 6 chocolates now.”
          </p>
          <p className="mt-4 text-lg leading-relaxed text-zinc-700">
            So I redesigned the on-screen keyboard and put everything into it: typing, my voice,
            notes, and stories. The keyboard I type with now also speaks, writes, and presses
            shortcuts, with no app to switch to.
          </p>
          <a
            href={STORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-attention mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-zinc-700 underline-offset-4 hover:underline"
          >
            Read how I redesigned it <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

/** What each keyboard does, row by row. */
const COMPARISON: { feature: string; apple: string; september: string }[] = [
  { feature: 'Type into any app', apple: 'Yes', september: 'Yes' },
  { feature: 'Dwell and Switch Control', apple: 'Yes', september: 'Yes' },
  { feature: 'Word suggestions', apple: 'Yes', september: 'Yes' },
  {
    feature: 'Sentence predictions',
    apple: 'No',
    september: 'Three, from Apple Intelligence on your Mac',
  },
  {
    feature: 'Shortcuts for the app in front',
    apple: 'Panels that you build in Panel Editor',
    september:
      'Ready for Safari, Mail, Messages, Finder, and more. They learn the shortcuts you use.',
  },
  {
    feature: 'Your own buttons',
    apple: 'Panel Editor',
    september: 'My Panel. It imports the panels that you made in Panel Editor.',
  },
  {
    feature: 'Speak aloud',
    apple: 'Not built in',
    september: 'Talk mode, with a macOS voice, your Personal Voice, or ElevenLabs',
  },
  { feature: 'Write and read back documents', apple: 'No', september: 'The Write paper' },
  {
    feature: 'Clipboard history',
    apple: 'No',
    september: 'The text you copied in the last 7 days',
  },
];

export function ComparisonSection() {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 pt-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Reimagined"
        title="What changed from the Accessibility Keyboard."
        lede="September Keyboard keeps what works. It floats above your apps, types into the one in front, and never takes the focus. Then it adds the parts that I needed every day."
      />
      <div className="rounded-surface overflow-x-auto border border-zinc-200 shadow-lg">
        <table className="w-full min-w-[36rem] text-left text-base">
          <thead className="bg-zinc-50 text-sm text-zinc-600">
            <tr>
              <th scope="col" className="px-5 py-4 font-semibold">
                <span className="sr-only">Feature</span>
              </th>
              <th scope="col" className="px-5 py-4 font-semibold">
                Accessibility Keyboard
              </th>
              <th scope="col" className="px-5 py-4 font-semibold text-indigo-700">
                September Keyboard
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {COMPARISON.map(row => (
              <tr key={row.feature}>
                <th scope="row" className="px-5 py-4 font-medium text-zinc-950">
                  {row.feature}
                </th>
                <td className="px-5 py-4 text-zinc-600">{row.apple}</td>
                <td className="px-5 py-4 text-zinc-950">
                  <span className="flex gap-2">
                    <Check className="mt-1 size-4 shrink-0 text-indigo-600" aria-hidden />
                    <span>{row.september}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function FeatureSections() {
  return (
    <div
      id="features"
      className="mx-auto grid max-w-7xl scroll-mt-4 gap-20 px-4 py-16 sm:px-6 lg:px-8"
    >
      <section className="grid gap-8">
        <SectionHeader
          eyebrow="Talk"
          title="Speak without leaving the keyboard."
          lede="In Talk mode, the keys type into the input bar and no other app. Speak reads the bar aloud with a macOS voice, your Personal Voice, or an ElevenLabs voice, and marks each word as it plays. Phrases at the left give quick replies. The Said list at the right keeps what you said for 30 days, and a press on a line says it again."
        />
        <Shot
          src="speaking.webp"
          still="talk.webp"
          alt="Talk mode. The keyboard speaks 'Which Lego set are we building this weekend?' and marks each word as it plays. Phrases such as Yes, No, and Thanks are at the left. The Said list at the right shows the earlier lines of the conversation."
          width={2800}
          height={1035}
        />
      </section>

      <section className="grid gap-8">
        <SectionHeader
          eyebrow="Write"
          title="Notes and stories on a sheet of paper."
          lede="Write opens a page above the keyboard. Type Markdown marks and they turn into headings, lists, and bold text. The page grows one line at a time as you type. Each document saves itself to the September folder in Documents, and Speak reads it aloud."
        />
        <Shot
          src="writing.webp"
          still="paper.webp"
          alt="The Write paper rises out of the input bar of the keyboard and grows one line at a time as a bedtime story about a dragon gets longer. The input bar shows the line at the caret."
          width={3200}
          height={1899}
        />
      </section>

      <section className="grid gap-8">
        <SectionHeader
          eyebrow="Shortcut panels"
          title="Press shortcuts without holding keys."
          lede="The Text and System keypads float beside the keys. If you use Rectangle, its keypad moves the window in front to a half, a third, or a corner. The app panel shows the shortcuts of the app in front and puts the ones you use first. On its Mine tab, you make your own buttons: a shortcut, a row of shortcuts, or a phrase. The panels that you built for the Accessibility Keyboard import in one step."
          hint="Drag a panel by its grip to move it. Arrange puts each panel back beside the keys."
        />
        <Shot
          src="mine.webp"
          alt="The keyboard with its panels. At the left, the Mine tab holds buttons such as Paste as Text, Save, and Be right back. The System keypad sits next to it. At the right, the Text keypad has arrow keys in the layout of a Mac keyboard."
          width={2000}
          height={628}
        />
      </section>

      <section className="grid gap-8">
        <SectionHeader
          eyebrow="Clipboard history"
          title="Paste what you copied earlier."
          lede="History shows the texts you copied, in the place of the sentence predictions. A press pastes one into the app in front. The history keeps each text for 7 days. It keeps nothing from a password field or a password manager, and you can turn it off in Settings."
        />
        <Shot
          src="clipboard.webp"
          alt="The clipboard history, open above the input bar. It shows copied texts such as a link, a dinner booking, a Terminal command, and the start of a note to a team."
          width={2000}
          height={628}
        />
      </section>
    </div>
  );
}

const ACCESS = [
  'A mouse, a trackpad, or a head pointer.',
  'Dwell Control, Switch Control, and Voice Control.',
  'The key repeat, Slow Keys, and Sticky Keys settings of macOS.',
  'Hold a letter to get its accents.',
  'Keys act when you press. Predictions and Speak act when you let go, so a slide off the button cancels the press.',
];

export function AccessSection() {
  return (
    <section id="access" className="scroll-mt-4 bg-zinc-100 px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:gap-12">
        <SectionHeader
          eyebrow="Access"
          title="Works with the way you reach the screen."
          lede="The keyboard never takes the focus from the app that you type into, so each key goes to the field where your cursor is."
        />
        <CheckList items={ACCESS} />
      </div>
    </section>
  );
}

const PRIVACY = [
  'Sentence predictions run on your Mac with Apple Intelligence.',
  'The predictions read the text near a field, such as the last messages of a chat, only after you turn that on in Settings.',
  'A password field shows nothing in the input bar and leaves no copy.',
  'The Said list, the clipboard history, and your documents are files on your Mac.',
  'An ElevenLabs voice sends the text it speaks to ElevenLabs. A macOS voice and Personal Voice send nothing.',
];

export function PrivacySection() {
  return (
    <section id="privacy" className="scroll-mt-4 px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:gap-12">
        <SectionHeader
          eyebrow="Privacy"
          title="Private by default."
          lede="The keyboard has no account and sends no analytics."
        />
        <CheckList items={PRIVACY} />
      </div>
    </section>
  );
}

const REQUIREMENTS = [
  'A Mac with Apple Silicon and macOS 14 or later. Sentence predictions need macOS 26 or later, with Apple Intelligence on.',
  'Accessibility access, so that the keys can type into other apps. The keyboard shows a banner until you allow it.',
  'Input Monitoring is optional. With it, the app panel also learns the shortcuts that you press on a hardware keyboard.',
];

export function DownloadSection() {
  return (
    <section
      id="download"
      className="scroll-mt-4 border-y border-amber-100 bg-amber-50 px-4 py-14 sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col items-start gap-5">
          <p className="text-sm font-semibold text-amber-800">Download</p>
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Get September Keyboard.
          </h2>
          <p className="text-lg leading-relaxed text-zinc-700">
            Free and open source. Version {KEYBOARD_VERSION} is a pre-release. Apple signs and
            checks the app, so it opens with no warning.
          </p>
          <Button asChild className="h-12 rounded-full px-8 text-base font-semibold">
            <a href={KEYBOARD_DOWNLOAD}>
              <Download className="size-5" aria-hidden />
              Download for Mac
            </a>
          </Button>
          <p className="text-sm text-zinc-600">
            Want the full September app, with spaces, saved phrases, and notes?{' '}
            <Link
              to="/"
              className="focus-attention inline-flex min-h-11 items-center font-medium text-indigo-700 underline-offset-4 hover:underline"
            >
              See September
            </Link>
          </p>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-zinc-950">What you need</h3>
          <CheckList items={REQUIREMENTS} className="mt-5" />
        </div>
      </div>
    </section>
  );
}

function CheckList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={`grid gap-4 ${className ?? ''}`}>
      {items.map(item => (
        <li key={item} className="flex gap-3 text-base leading-relaxed text-zinc-700">
          <Check className="mt-1 size-5 shrink-0 text-indigo-600" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
