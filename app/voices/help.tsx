'use client';

import { useState } from 'react';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/outline';

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
        className="flex items-center gap-2 px-3 py-1 text-zinc-600 rounded-full transition-colors cursor-pointer hover:bg-zinc-100 border border-zinc-200"
        aria-label="Help"
        onClick={() => setIsOpen(true)}
      >
        <QuestionMarkCircleIcon className="w-4 h-4" />
        <span className="text-sm hidden md:block">Help</span>
      </button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        {/* Mobile: Full screen, Desktop: Centered modal */}
        <div className="fixed inset-0 flex w-screen items-center justify-center p-0 sm:p-4">
          <DialogPanel className="mx-auto w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] bg-white sm:rounded-lg shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-200 flex-shrink-0">
              <DialogTitle className="text-lg font-semibold text-zinc-900">Help & FAQ</DialogTitle>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="space-y-6">
                  {FAQ_ITEMS.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <h3 className="text-md font-medium text-zinc-900">{item.question}</h3>
                      <p className="text-sm text-zinc-500">{item.answer}</p>
                      {index < FAQ_ITEMS.length - 1 && (
                        <div className="pt-4 border-b border-zinc-200" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
