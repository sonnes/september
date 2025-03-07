'use client';

import { useState } from 'react';

import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { Dialog, DialogBody, DialogTitle } from '@/components/catalyst/dialog';

const FAQ_ITEMS = [
  {
    question: 'What is Talk?',
    answer:
      'Talk is a feature that allows you to have natural conversations using advanced text-to-speech technology. You can select different voices, adjust speech parameters, and have interactive discussions.',
  },
  {
    question: 'How do I change the voice?',
    answer:
      'Click the Settings icon and select "Voice" to browse and choose from our collection of available voices. Each voice has unique characteristics and can be customized further using the speech parameters.',
  },
  {
    question: 'What do the speech parameters do?',
    answer:
      'Speed controls how fast the voice speaks. Stability affects voice consistency. Similarity influences how close the output is to the original voice. Style controls the emotional expressiveness of the voice.',
  },
  {
    question: 'What is Speaker Boost?',
    answer:
      'Speaker Boost enhances the clarity and presence of the voice, making it sound more prominent and clearer, especially in challenging acoustic environments.',
  },
  {
    question: 'Which model should I choose?',
    answer:
      'The multilingual v2 model is recommended for most use cases as it provides the best balance of quality and performance. Other models may be optimized for specific languages or use cases.',
  },
];

export default function Help() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        className="p-2 text-white rounded-full transition-colors cursor-pointer"
        aria-label="Help"
        onClick={() => setIsOpen(true)}
      >
        <QuestionMarkCircleIcon className="w-8 h-8" />
      </button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative backdrop-blur-xl z-5"
      >
        <div className="flex items-center justify-between py-4 border-b">
          <DialogTitle className="text-xl font-semibold pr-8">Help & FAQ</DialogTitle>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <DialogBody className="space-y-6 py-4">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="space-y-2">
              <h3 className="text-md font-medium text-gray-900">{item.question}</h3>
              <p className="text-sm text-gray-500">{item.answer}</p>
              {index < FAQ_ITEMS.length - 1 && <div className="pt-4 border-b border-gray-200" />}
            </div>
          ))}
        </DialogBody>
      </Dialog>
    </div>
  );
}
