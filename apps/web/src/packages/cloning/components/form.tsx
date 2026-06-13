'use client';

import { useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAccount } from '@/packages/account';
import { Button } from '@/packages/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/packages/ui/components/card';
import { FormField, FormTextarea } from '@/packages/ui/components/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/packages/ui/components/tabs';

import { cloneVoice } from '../elevenlabs';
import { useRecording } from '../hooks/use-recording';
import { useUpload } from '../hooks/use-upload';
import { collectSampleIds } from '../lib/collect-sample-ids';
import { deleteVoiceSample, downloadVoiceSample } from '../voice-samples';
import { RecordingSection } from './record';
import { UploadSection } from './upload';

const CloneVoiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type CloneVoiceFormData = z.infer<typeof CloneVoiceSchema>;

export function VoiceCloneForm() {
  const [activeTab, setActiveTab] = useState('upload');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { account } = useAccount();
  const upload = useUpload();
  const recording = useRecording();

  const form = useForm<CloneVoiceFormData>({
    resolver: zodResolver(CloneVoiceSchema),
    defaultValues: { name: '', description: '' },
  });

  const elevenlabsApiKey = useMemo(() => account?.ai_providers?.elevenlabs?.api_key, [account]);

  const handleSubmit = async (data: CloneVoiceFormData) => {
    if (!elevenlabsApiKey) {
      toast.error('ElevenLabs API key is required. Please configure it in settings.');
      return;
    }

    const fileIds = collectSampleIds(upload.uploadedFiles, recording.recordings);

    if (fileIds.length === 0) {
      toast.error('Please upload or record at least one audio sample.');
      return;
    }

    setIsSubmitting(true);

    try {
      const files = await Promise.all(
        fileIds.map(async id => {
          const blob = await downloadVoiceSample(id);
          const parts = id.split('/');
          const filename = parts[parts.length - 1] || `sample-${id}.webm`;
          return new File([blob], filename, { type: blob.type || 'audio/webm' });
        })
      );

      const result = await cloneVoice(elevenlabsApiKey, {
        files,
        name: data.name,
        description: data.description,
      });

      toast.success('Voice Clone Created', {
        description: `Successfully created voice "${result.name}" (ID: ${result.voice_id})`,
      });

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
  const hasSamples = upload.uploadedFiles.length > 0 || Object.keys(recording.recordings).length > 0;

  return (
    <div className="space-y-6 pb-24 max-w-2xl">
      {!hasApiKey && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800">
              <strong>API Key Required:</strong> You need to configure your ElevenLabs API key in{' '}
              <a href="/settings/providers" className="underline hover:text-amber-900">
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
                <UploadSection
                  uploadedFiles={upload.uploadedFiles}
                  status={upload.status}
                  error={upload.error}
                  uploadFile={upload.uploadFile}
                  deleteFile={upload.deleteFile}
                />
              </TabsContent>
              <TabsContent value="record" className="mt-6">
                <RecordingSection
                  recordings={recording.recordings}
                  startRecording={recording.startRecording}
                  stopRecording={recording.stopRecording}
                  deleteRecording={recording.deleteRecording}
                  playRecording={recording.playRecording}
                  stopPlaying={recording.stopPlaying}
                  status={recording.status}
                  errors={recording.errors}
                />
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
