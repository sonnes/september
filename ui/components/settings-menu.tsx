import { cn } from "@/lib/utils";

export type EditorType = "autocomplete" | "aac";

interface SettingsMenuProps {
  value: EditorType;
  onChange: (value: EditorType) => void;
}

export default function SettingsMenu({ value, onChange }: SettingsMenuProps) {
  return (
    <div className="flex gap-4 justify-center w-full border-t dark:border-zinc-800 pt-3 mt-3">
      <button
        onClick={() => onChange("autocomplete")}
        className={cn(
          "text-sm hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors",
          value === "autocomplete"
            ? "text-zinc-900 dark:text-white font-medium"
            : "text-zinc-500 dark:text-zinc-400"
        )}
      >
        Autocomplete
      </button>

      <button
        onClick={() => onChange("aac")}
        className={cn(
          "text-sm hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors",
          value === "aac"
            ? "text-zinc-900 dark:text-white font-medium"
            : "text-zinc-500 dark:text-zinc-400"
        )}
      >
        AAC
      </button>
    </div>
  );
}
