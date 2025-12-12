'use client';

import { useEffect, useState } from 'react';

import { MessageSquareIcon } from 'lucide-react';
import { nanoid } from 'nanoid';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import SidebarLayout from '@/components-v4/sidebar/layout';

type ChatMessage = {
  key: string;
  value: string;
  from: 'user' | 'assistant';
};

const messages: ChatMessage[] = [
  {
    key: nanoid(),
    value: 'Hello, how are you?',
    from: 'user',
  },
  {
    key: nanoid(),
    value: "I'm good, thank you! How can I assist you today?",
    from: 'assistant',
  },
  {
    key: nanoid(),
    value: "I'm looking for information about your services.",
    from: 'user',
  },
  {
    key: nanoid(),
    value: 'Sure! We offer a variety of AI solutions. What are you interested in?',
    from: 'assistant',
  },
  {
    key: nanoid(),
    value: "I'm interested in natural language processing tools.",
    from: 'user',
  },
  {
    key: nanoid(),
    value: 'Great choice! We have several NLP APIs. Would you like a demo?',
    from: 'assistant',
  },
  {
    key: nanoid(),
    value: 'Yes, a demo would be helpful.',
    from: 'user',
  },
  {
    key: nanoid(),
    value: 'Alright, I can show you a sentiment analysis example. Ready?',
    from: 'assistant',
  },
  {
    key: nanoid(),
    value: 'Yes, please proceed.',
    from: 'user',
  },
  {
    key: nanoid(),
    value: "Here is a sample: 'I love this product!' → Positive sentiment.",
    from: 'assistant',
  },
  {
    key: nanoid(),
    value: 'Impressive! Can it handle multiple languages?',
    from: 'user',
  },
  {
    key: nanoid(),
    value: 'Absolutely, our models support over 20 languages.',
    from: 'assistant',
  },
  {
    key: nanoid(),
    value: 'How do I get started with the API?',
    from: 'user',
  },
  {
    key: nanoid(),
    value: 'You can sign up on our website and get an API key instantly.',
    from: 'assistant',
  },
  {
    key: nanoid(),
    value: 'Is there a free trial available?',
    from: 'user',
  },
  {
    key: nanoid(),
    value: 'Yes, we offer a 14-day free trial with full access.',
    from: 'assistant',
  },
  {
    key: nanoid(),
    value: 'What kind of support do you provide?',
    from: 'user',
  },
  {
    key: nanoid(),
    value: 'We provide 24/7 chat and email support for all users.',
    from: 'assistant',
  },
  {
    key: nanoid(),
    value: 'Thank you for the information!',
    from: 'user',
  },
  {
    key: nanoid(),
    value: "You're welcome! Let me know if you have any more questions.",
    from: 'assistant',
  },
];

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default function ChatPage({ params }: ChatPageProps) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    params.then(resolvedParams => {
      setChatId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (!chatId) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < messages.length && messages[currentIndex]) {
        const currentMessage = messages[currentIndex];
        setVisibleMessages(prev => [
          ...prev,
          {
            key: currentMessage.key,
            value: currentMessage.value,
            from: currentMessage.from,
          },
        ]);
        currentIndex += 1;
      } else {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [chatId]);

  return (
    <SidebarLayout>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Chats</BreadcrumbPage>
            </BreadcrumbItem>
            {chatId && (
              <BreadcrumbItem>
                <BreadcrumbPage>{chatId}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="flex flex-1 flex-col gap-6">
          <Conversation className="relative flex-1">
            <ConversationContent>
              {visibleMessages.length === 0 ? (
                <ConversationEmptyState
                  description="Messages will appear here as the conversation progresses."
                  icon={<MessageSquareIcon className="size-6" />}
                  title="Start a conversation"
                />
              ) : (
                visibleMessages.map(({ key, value, from }) => (
                  <Message from={from} key={key}>
                    <MessageContent>{value}</MessageContent>
                  </Message>
                ))
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>
      </SidebarLayout.Content>
    </SidebarLayout>
  );
}
