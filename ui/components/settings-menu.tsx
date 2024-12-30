import { cn } from "@/lib/utils";

interface SettingsMenuProps {
  value: "editor" | "autocomplete" | "markov";
  onChange: (value: "editor" | "autocomplete" | "markov") => void;
}

export default function SettingsMenu({ value, onChange }: SettingsMenuProps) {
  return (
    <div className="flex gap-4 justify-center w-full border-t dark:border-zinc-800 pt-3 mt-3">
      <button
        onClick={() => onChange("markov")}
        className={cn(
          "text-sm hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors",
          value === "markov"
            ? "text-zinc-900 dark:text-white font-medium"
            : "text-zinc-500 dark:text-zinc-400"
        )}
      >
        Markov
      </button>

      <button
        onClick={() => onChange("editor")}
        className={cn(
          "text-sm hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors",
          value === "editor"
            ? "text-zinc-900 dark:text-white font-medium"
            : "text-zinc-500 dark:text-zinc-400"
        )}
      >
        Inline
      </button>

      <button
        onClick={() => onChange("autocomplete")}
        className={cn(
          "text-sm hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors",
          value === "autocomplete"
            ? "text-zinc-900 dark:text-white font-medium"
            : "text-zinc-500 dark:text-zinc-400"
        )}
      >
        Quick
      </button>
    </div>
  );
}
