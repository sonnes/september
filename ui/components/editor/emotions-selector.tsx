import { useEditor } from './context';

type Emotion = {
  emoji: string;
  name: string;
};

type EmotionsSelectorProps = {
  emotions: Emotion[];
};

export default function EmotionsSelector({ emotions }: EmotionsSelectorProps) {
  const { tone, setTone } = useEditor();
  return (
    <div className="flex gap-1">
      {emotions.map(emotion => (
        <div key={emotion.name} className="relative group">
          <button
            onClick={() => setTone(emotion.name)}
            className={`p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
              tone === emotion.name ? 'bg-zinc-200 dark:bg-zinc-600' : ''
            }`}
          >
            {emotion.emoji}
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {emotion.name.charAt(0).toUpperCase() + emotion.name.slice(1)}
          </div>
        </div>
      ))}
    </div>
  );
}
