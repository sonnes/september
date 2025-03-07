'use client';

import { useState } from 'react';

import { AdjustmentsHorizontalIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/catalyst/button';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '@/components/catalyst/dialog';
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from '@/components/catalyst/dropdown';

import { MODELS, TalkSettings, defaultSettings, useSettings } from './context';

export default function Settings() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting, resetSettings } = useSettings();

  const openDialog = () => {
    setIsOpen(true);
  };

  const handleSliderChange = (key: keyof TalkSettings, value: number) => {
    updateSetting(key, value);
  };

  // Find the current model name from the model_id
  const currentModel = MODELS.find(model => model.id === settings.model_id) || MODELS[0];

  return (
    <div>
      <button
        className="p-2 text-white rounded-full transition-colors cursor-pointer"
        aria-label="Settings"
        onClick={openDialog}
      >
        <AdjustmentsHorizontalIcon className="w-8 h-8" />
      </button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative backdrop-blur-xl">
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <DialogTitle className="text-xl font-semibold pr-8">Talk Settings</DialogTitle>
        <DialogDescription>
          Customize your talk experience. Changes will be saved to your device.
        </DialogDescription>

        <DialogBody className="space-y-6 py-4">
          <h3 className="text-lg font-medium border-b pb-2">Voice</h3>
          <div className="rounded-xl border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-500 text-sm">R</span>
                </div>
                <span className="font-medium">{settings.voice_id}</span>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          <h3 className="text-lg font-medium border-b pb-2">Model</h3>

          <Dropdown>
            <DropdownButton as="div">
              <div className="rounded-xl border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center">
                      <span className="text-xs font-medium">v2</span>
                    </div>
                    <span className="font-medium">{currentModel.name}</span>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </DropdownButton>
            <DropdownMenu>
              {MODELS.map(model => (
                <DropdownItem key={model.id} onClick={() => updateSetting('model_id', model.id)}>
                  {model.name}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>

          <h3 className="text-lg font-medium border-b pb-2">Speed</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Slower</span>
              <span>Faster</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.speed}
              onChange={e => handleSliderChange('speed', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <h3 className="text-lg font-medium border-b pb-2">Stability</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>More variable</span>
              <span>More stable</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.stability}
              onChange={e => handleSliderChange('stability', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <h3 className="text-lg font-medium border-b pb-2">Similarity</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Low</span>
              <span>High</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.similarity}
              onChange={e => handleSliderChange('similarity', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <h3 className="text-lg font-medium border-b pb-2">Style Exaggeration</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>None</span>
              <span>Exaggerated</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.style}
              onChange={e => handleSliderChange('style', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <label htmlFor="speakerBoost" className="text-sm font-medium">
              Speaker boost
            </label>
            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
              <input
                type="checkbox"
                id="speakerBoost"
                checked={settings.speaker_boost}
                onChange={e => updateSetting('speaker_boost', e.target.checked)}
                className="peer sr-only"
              />
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all ${settings.speaker_boost ? 'translate-x-5 bg-indigo-600' : ''}`}
              ></span>
            </div>
          </div>
        </DialogBody>

        <DialogActions>
          <button
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium"
            onClick={resetSettings}
          >
            Reset to Default
          </button>
          <button
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium"
            onClick={() => setIsOpen(false)}
          >
            Save Changes
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
