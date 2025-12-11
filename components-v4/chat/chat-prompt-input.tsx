'use client';

import { useRef, useState } from 'react';

import type { ChatStatus } from 'ai';
import { CheckIcon, ImageIcon } from 'lucide-react';

import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '@/components/ai-elements/model-selector';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';

type Model = {
  id: string;
  name: string;
  chef: string;
  chefSlug: string;
  providers: string[];
};

type ChatPromptInputProps = {
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  status?: ChatStatus;
  models?: Model[];
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  placeholder?: string;
};

const defaultModels: Model[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    chef: 'OpenAI',
    chefSlug: 'openai',
    providers: ['openai', 'azure'],
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    chef: 'OpenAI',
    chefSlug: 'openai',
    providers: ['openai', 'azure'],
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude 4 Opus',
    chef: 'Anthropic',
    chefSlug: 'anthropic',
    providers: ['anthropic', 'azure', 'google', 'amazon-bedrock'],
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude 4 Sonnet',
    chef: 'Anthropic',
    chefSlug: 'anthropic',
    providers: ['anthropic', 'azure', 'google', 'amazon-bedrock'],
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    chef: 'Google',
    chefSlug: 'google',
    providers: ['google'],
  },
];

export function ChatPromptInput({
  onSubmit,
  disabled = false,
  className,
  status = 'ready',
  models = defaultModels,
  selectedModel,
  onModelChange,
  placeholder = 'Plan, search, build anything',
}: ChatPromptInputProps) {
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [internalModel, setInternalModel] = useState<string>(models[0]?.id || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentModel = selectedModel || internalModel;
  const selectedModelData = models.find(m => m.id === currentModel);

  const handleModelChange = (modelId: string) => {
    if (onModelChange) {
      onModelChange(modelId);
    } else {
      setInternalModel(modelId);
    }
    setModelSelectorOpen(false);
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    await onSubmit(message);
  };

  return (
    <div className="flex size-full flex-col justify-end">
      <PromptInputProvider>
        <PromptInput globalDrop multiple onSubmit={handleSubmit} className={className}>
          <PromptInputAttachments>
            {attachment => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputBody>
            <PromptInputTextarea placeholder={placeholder} ref={textareaRef} disabled={disabled} />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <ModelSelector onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
                <ModelSelectorTrigger asChild>
                  <PromptInputButton>
                    {selectedModelData?.chefSlug && (
                      <ModelSelectorLogo provider={selectedModelData.chefSlug} />
                    )}
                    {selectedModelData?.name && (
                      <ModelSelectorName>{selectedModelData.name}</ModelSelectorName>
                    )}
                  </PromptInputButton>
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput placeholder="Search models..." />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                    {['OpenAI', 'Anthropic', 'Google'].map(chef => (
                      <ModelSelectorGroup key={chef} heading={chef}>
                        {models
                          .filter(m => m.chef === chef)
                          .map(m => (
                            <ModelSelectorItem
                              key={m.id}
                              onSelect={() => handleModelChange(m.id)}
                              value={m.id}
                            >
                              <ModelSelectorLogo provider={m.chefSlug} />
                              <ModelSelectorName>{m.name}</ModelSelectorName>
                              <ModelSelectorLogoGroup>
                                {m.providers.map(provider => (
                                  <ModelSelectorLogo key={provider} provider={provider} />
                                ))}
                              </ModelSelectorLogoGroup>
                              {currentModel === m.id ? (
                                <CheckIcon className="ml-auto size-4" />
                              ) : (
                                <div className="ml-auto size-4" />
                              )}
                            </ModelSelectorItem>
                          ))}
                      </ModelSelectorGroup>
                    ))}
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>
            </PromptInputTools>
            <div className="flex items-center gap-2">
              <Button size="icon-sm" variant="ghost">
                <ImageIcon className="text-muted-foreground" size={16} />
              </Button>
              <PromptInputSubmit className="!h-8" status={status} disabled={disabled} />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    </div>
  );
}
