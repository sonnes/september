import { getMessages } from '@/app/actions/messages';
import { Heading } from '@/components/catalyst/heading';
import Layout from '@/components/layout';

export const metadata = {
  title: 'Talk - September',
};

export default async function TalkPage() {
  const messages = await getMessages();

  return (
    <Layout>
      <Layout.Header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Hello 👋</h1>
      </Layout.Header>
      <Layout.Content>
        <div className="p-6 mb-4 bg-white rounded-lg shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <Heading level={2} className="text-zinc-900 dark:text-white truncate"></Heading>
            </div>
            <div className="flex items-center gap-4 shrink-0"></div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map(message => (
            <div key={message.id}>{message.text}</div>
          ))}
        </div>

        {/* Input area */}
        <div className="border-t bg-white dark:bg-zinc-900 p-4"></div>
      </Layout.Content>
    </Layout>
  );
}
