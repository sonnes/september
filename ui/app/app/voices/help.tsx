'use client';

import { useState } from 'react';

import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { Dialog, DialogBody, DialogTitle } from '@/components/catalyst/dialog';

const FAQ_ITEMS = [
  {
    question: 'What is Voice Cloning?',
    answer:
      'Voice cloning is a technology that creates a digital copy of your voice. It allows you to generate speech that sounds like you by using AI and machine learning techniques.',
  },
  {
    question: 'How do I create a voice clone?',
    answer:
      'To create a voice clone, you can either upload audio files of your voice or record samples directly. The more high-quality samples you provide, the better your voice clone will sound.',
  },
  {
    question: 'What kind of audio samples work best?',
    answer:
      'The best samples are clear recordings of your natural speaking voice with minimal background noise. We recommend providing at least 3 minutes of clear speech for optimal results.',
  },
  {
    question: 'How long does cloning take?',
    answer:
      'The cloning process typically takes a few minutes, depending on the amount of audio provided. Once complete, you can start using your cloned voice immediately.',
  },
  {
    question: 'Can I update my voice clone?',
    answer:
      'Yes, you can update your voice clone by adding more audio samples at any time. Adding more high-quality samples can help improve the accuracy and naturalness of your clone.',
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
