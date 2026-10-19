import * as React from "react"
import { Check } from "lucide-react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "../lib/utils";

/**
 * A switch of 32 by 56px. The thumb sits 2px from each edge in both states,
 * and it shows a check when the switch is on, so the state is not a color or
 * a position alone. Pair it with a `Label` whose `htmlFor` names the switch,
 * so the whole row turns it on and off.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-attention dark:data-[state=unchecked]:bg-input/80 group/switch inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-transparent shadow-xs transition-all outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none grid size-6 place-items-center rounded-full shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-[26px] data-[state=unchecked]:translate-x-0.5"
      >
        <Check
          aria-hidden
          strokeWidth={3}
          className="text-primary hidden size-3.5 group-data-[state=checked]/switch:block"
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { Switch }
