import { useState } from "react";
import { Tab } from "@headlessui/react";
import { Button } from "./catalyst/button";
import { Input } from "./catalyst/input";
import { Text } from "./catalyst/text";

interface Word {
  text: string;
  image: string;
}

interface Category {
  title: string;
  words: Word[];
}

// Example categories - you can replace these with your actual categories
const categories: Category[] = [
  {
    title: "Common",
    words: [
      { text: "Hello", image: "/images/hello.png" },
      { text: "Yes", image: "/images/yes.png" },
      { text: "No", image: "/images/no.png" },
    ],
  },
  {
    title: "Feelings",
    words: [
      { text: "Happy", image: "/images/happy.png" },
      { text: "Sad", image: "/images/sad.png" },
      { text: "Tired", image: "/images/tired.png" },
    ],
  },
  {
    title: "Actions",
    words: [
      { text: "Go", image: "/images/go.png" },
      { text: "Stop", image: "/images/stop.png" },
      { text: "Help", image: "/images/help.png" },
    ],
  },
];

interface AACProps {
  onSubmit: (text: string) => void;
}

export default function AAC({ onSubmit }: AACProps) {
  const [text, setText] = useState("");

  const handleWordClick = (word: Word) => {
    setText((prev) => {
      const space = prev.length > 0 ? " " : "";
      return prev + space + word.text;
    });
  };

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1"
          placeholder="Click words or type..."
        />
        <Button onClick={handleSubmit}>Submit</Button>
      </div>

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          {categories.map((category) => (
            <Tab
              key={category.title}
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                 ${
                   selected
                     ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                     : "text-zinc-700 hover:bg-white/[0.12] hover:text-zinc-900 dark:text-zinc-300"
                 }`
              }
            >
              {category.title}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-2">
          {categories.map((category) => (
            <Tab.Panel
              key={category.title}
              className="grid grid-cols-3 gap-4 rounded-xl bg-white p-3 dark:bg-zinc-900 sm:grid-cols-4 md:grid-cols-6"
            >
              {category.words.map((word) => (
                <button
                  key={word.text}
                  onClick={() => handleWordClick(word)}
                  className="flex flex-col items-center gap-2 rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={word.image}
                      alt={word.text}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Fallback for missing images
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23ccc"/></svg>';
                      }}
                    />
                  </div>
                  <Text className="text-center">{word.text}</Text>
                </button>
              ))}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
