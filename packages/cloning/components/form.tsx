'use client';

import { useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormTextarea } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAccountContext } from '@/packages/account';
import { useRecordingContext, useUpload } from '@/packages/cloning/components/cloning-provider';
import { RecordingSection } from '@/packages/cloning/components/record';
import { UploadSection } from '@/packages/cloning/components/upload';
import { useVoiceStorage } from '@/packages/cloning/hooks/use-voice-storage';
import { ElevenLabsVoiceClone } from '@/packages/cloning/lib/elevenlabs-clone';

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
  const { downloadVoiceSample } = useVoiceStorage();

  const form = useForm<CloneVoiceFormData>({
    resolver: zodResolver(CloneVoiceSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Get ElevenLabs API key from account
  const elevenlabsApiKey = useMemo(() => {
    return account?.ai_providers?.elevenlabs?.api_key;
  }, [account]);

  const handleSubmit = async (data: CloneVoiceFormData) => {
    if (!elevenlabsApiKey) {
      toast.error('ElevenLabs API key is required. Please configure it in settings.');
      return;
    }

    // Get all audio files (uploads or recordings)
    const fileIds = uploadedFiles.length > 0 ? uploadedFiles : Object.values(recordings);

    if (fileIds.length === 0) {
      toast.error('Please upload or record at least one audio sample.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Download all files from Triplit and convert to File objects
      const files: File[] = [];
      for (const id of fileIds) {
        const blob = await downloadVoiceSample(id);
        // Extract filename from ID or use a default
        const parts = id.split('/');
        const filename = parts[parts.length - 1] || `sample-${id}.webm`;
        const file = new File([blob], filename, { type: blob.type || 'audio/webm' });
        files.push(file);
      }

      // Create voice clone
      const cloneService = new ElevenLabsVoiceClone(elevenlabsApiKey);
      const result = await cloneService.cloneVoice({
        files,
        name: data.name,
        description: data.description,
      });

      toast.success('Voice Clone Created', {
        description: `Successfully created voice "${result.name}" with ID: ${result.voice_id}`,
      });

      // Reset form
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
      {/* API Key Warning */}
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
        {/* Upload and Record Tabs */}
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

        {/* Voice Details */}
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

            {/* Submit Button */}
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

        {/* Find Similar Voices */}
        {hasSamples && (
          <Card>
            <CardHeader>
              <CardTitle>Find Similar Voices</CardTitle>
              <CardDescription>
                Not satisfied with the cloned voice? Try searching for similar voices using the
                samples you uploaded or recorded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" type="button" asChild>
                <a href="/app/voices?search=similar">
                  <Search className="mr-2 h-4 w-4" /> Search for Similar Voices
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
