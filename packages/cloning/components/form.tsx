'use client';

import { useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@september/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@september/ui/components/card';
import { FormField, FormTextarea } from '@september/ui/components/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@september/ui/components/tabs';

import { useAccountContext } from '@september/account';
import {
  useRecordingContext,
  useUpload,
  useVoiceStorageContext,
} from '@september/cloning/components/cloning-provider';
import { RecordingSection } from '@september/cloning/components/record';
import { UploadSection } from '@september/cloning/components/upload';
import { collectSampleIds } from '@september/cloning/lib/collect-sample-ids';
import { ElevenLabsVoiceClone } from '@september/cloning/lib/elevenlabs-clone';

const CloneVoiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type CloneVoiceFormData = z.infer<typeof CloneVoiceSchema>;

export function VoiceCloneForm() {
  const [activeTab, setActiveTab] = useState('upload');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { account } = useAccountContext();
  const { recordings } = useRecordingContext();
  const { uploadedFiles } = useUpload();
  const { downloadVoiceSample, deleteVoiceSample } = useVoiceStorageContext();

  const form = useForm<CloneVoiceFormData>({
    resolver: zodResolver(CloneVoiceSchema),
    defaultValues: { name: '', description: '' },
  });

  const elevenlabsApiKey = useMemo(
    () => account?.ai_providers?.elevenlabs?.api_key,
    [account]
  );

  const handleSubmit = async (data: CloneVoiceFormData) => {
    if (!elevenlabsApiKey) {
      toast.error('ElevenLabs API key is required. Please configure it in settings.');
      return;
    }

    // Merge uploads AND recordings — ElevenLabs produces better clones with more data
    const fileIds = collectSampleIds(uploadedFiles, recordings);

    if (fileIds.length === 0) {
      toast.error('Please upload or record at least one audio sample.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Download all samples in parallel from IndexedDB
      const files = await Promise.all(
        fileIds.map(async id => {
          const blob = await downloadVoiceSample(id);
          const parts = id.split('/');
          const filename = parts[parts.length - 1] || `sample-${id}.webm`;
          return new File([blob], filename, { type: blob.type || 'audio/webm' });
        })
      );

      const cloneService = new ElevenLabsVoiceClone(elevenlabsApiKey);
      const result = await cloneService.cloneVoice({
        files,
        name: data.name,
        description: data.description,
      });

      toast.success('Voice Clone Created', {
        description: `Successfully created voice "${result.name}" (ID: ${result.voice_id})`,
      });

      // Clean up local samples — already sent to ElevenLabs, no longer needed
      await Promise.allSettled(fileIds.map(id => deleteVoiceSample(id)));

      form.reset();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create voice clone';
      toast.error(errorMessage);
      console.error('Voice cloning error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasApiKey = !!elevenlabsApiKey;
  const hasSamples = uploadedFiles.length > 0 || Object.keys(recordings).length > 0;

  return (
    <div className="space-y-6 pb-24 max-w-2xl">
      {!hasApiKey && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800">
              <strong>API Key Required:</strong> You need to configure your ElevenLabs API key in{' '}
              <a href="/settings/ai" className="underline hover:text-amber-900">
                AI Settings
              </a>{' '}
              to create voice clones.
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Voice Samples</CardTitle>
            <CardDescription>
              Upload audio files or record voice samples to create your voice clone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Audio</TabsTrigger>
                <TabsTrigger value="record">Record Audio</TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-6">
                <UploadSection />
              </TabsContent>
              <TabsContent value="record" className="mt-6">
                <RecordingSection />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voice Details</CardTitle>
            <CardDescription>
              Provide a name and optional description for your voice clone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              name="name"
              control={form.control}
              label="Name"
              placeholder="The name that identifies this voice."
              required
            />

            <FormTextarea
              name="description"
              control={form.control}
              label="Description"
              placeholder="How would you describe the voice?"
              rows={3}
            />

            <div className="pt-4 border-t">
              <Button
                type="submit"
                disabled={isSubmitting || !hasApiKey || !hasSamples}
                className="w-full"
              >
                {!hasApiKey
                  ? 'API Key Required'
                  : !hasSamples
                    ? 'Upload or Record Samples First'
                    : isSubmitting
                      ? 'Creating Voice Clone...'
                      : 'Create Voice Clone'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
