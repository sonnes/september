'use client';

import { Headphones } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/packages/ui/components/select';

import { useAudioPlayer } from './audio-player';

export function AudioOutputDeviceSelector() {
  const {
    outputDevices,
    isDeviceSelectionSupported,
    selectedOutputDeviceId,
    setSelectedOutputDeviceId,
  } = useAudioPlayer();

  if (!isDeviceSelectionSupported || outputDevices.length === 0) {
    return null;
  }

  return (
    <Select
      value={selectedOutputDeviceId || '__default__'}
      onValueChange={(id: string) =>
        setSelectedOutputDeviceId(id === '__default__' ? '' : id)
      }
    >
      <SelectTrigger className="!h-auto w-auto gap-2 rounded-full border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 shadow-none hover:bg-zinc-100 focus-visible:ring-0 focus-visible:border-zinc-200">
        <Headphones className="size-4 shrink-0" />
        <SelectValue placeholder="Speaker" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__default__">System Default</SelectItem>
        {outputDevices.map((device: { deviceId: string; label: string }) => (
          <SelectItem key={device.deviceId} value={device.deviceId}>
            {device.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
