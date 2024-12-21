import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownHeader,
} from "./catalyst/dropdown";

interface SettingsMenuProps {
  value: "editor" | "autocomplete";
  onChange: (value: "editor" | "autocomplete") => void;
}

export default function SettingsMenu({ value, onChange }: SettingsMenuProps) {
  return (
    <Dropdown>
      <DropdownButton className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700">
        <Cog6ToothIcon className="w-5 h-5 text-zinc-500" />
      </DropdownButton>

      <DropdownMenu>
        <DropdownHeader className="px-2 py-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Editor Type
        </DropdownHeader>

        <DropdownItem
          onClick={() => onChange("editor")}
          className={cn(
            value === "editor" && "text-blue-600 dark:text-blue-400"
          )}
        >
          Inline Suggestions
        </DropdownItem>

        <DropdownItem
          onClick={() => onChange("autocomplete")}
          className={cn(
            value === "autocomplete" && "text-blue-600 dark:text-blue-400"
          )}
        >
          Quick Suggestions
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
