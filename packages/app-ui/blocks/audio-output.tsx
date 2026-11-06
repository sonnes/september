import { Headphones, Mic } from "lucide-react";

import { Button } from "@september/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@september/ui/components/dropdown-menu";

import { usePanel } from "@september/app-ui/blocks/chrome";
import { useSoundOutputs, useVirtualMicrophone } from "@september/app-ui/services/sound";

/**
 * Which speaker September plays through, and whether calls hear September.
 *
 * Both voices follow September's sound output. The microphone belongs beside
 * Speak because it carries what Speak makes.
 */
export function AudioOutput() {
  const panel = usePanel();
  const { outputs, chosen, choose: move } = useSoundOutputs();
  const { supported, status: microphone, change: changeMicrophone } = useVirtualMicrophone();

  const devices = outputs.data ?? [];
  const selected = devices.find((device) => device.uid === chosen.data);
  const microphoneOn = microphone.data?.active ?? false;
  const microphoneAvailable = Boolean(supported && microphone.data);

  return (
    <DropdownMenu
      // The More menu of the panel opens this menu too.
      open={panel?.outputOpen}
      onOpenChange={(open) => {
        panel?.setOutputOpen(open);
        if (!open) return;
        // A device plugged in while the app runs appears when the menu opens.
        void outputs.refetch();
        void chosen.refetch();
        if (supported) void microphone.refetch();
      }}
    >
      <DropdownMenuTrigger asChild>
        {/* One key, so the tools row keeps its room. The name of the
            output is in the menu, and in the name that a screen reader says.
            A green dot shows that calls hear September. */}
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={`Sound output: ${selected?.name ?? "not chosen"}. September Microphone ${microphoneOn ? "on" : "off"}`}
          title={selected?.name ?? "Sound output"}
          className="relative size-11"
        >
          <Headphones aria-hidden />
          {microphoneOn ? (
            <span
              aria-hidden
              className="ring-background absolute top-2 right-2 size-2.5 rounded-full bg-emerald-500 ring-2"
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          September audio
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={chosen.data ?? ""}
          onValueChange={(uid) => move.mutate(uid)}
        >
          {devices.map((device) => (
            <DropdownMenuRadioItem
              key={device.uid}
              value={device.uid}
              className="min-h-11"
            >
              {device.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Use voice in calls
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={microphoneOn}
          disabled={!microphoneAvailable || changeMicrophone.isPending}
          className="min-h-11"
          onSelect={(event) => event.preventDefault()}
          onCheckedChange={(checked) =>
            changeMicrophone.mutate(checked === true)
          }
        >
          <Mic aria-hidden />
          <span className="flex flex-col">
            <span>September Microphone</span>
            <span className="text-muted-foreground text-xs font-normal">
              {microphoneAvailable
                ? (microphone.data?.detail ??
                  "Send spoken messages to calling apps")
                : "Unavailable on this device"}
            </span>
          </span>
        </DropdownMenuCheckboxItem>
        {move.error || changeMicrophone.error ? (
          <p className="text-destructive px-2 py-1.5 text-sm" role="alert">
            {String(move.error ?? changeMicrophone.error)}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
