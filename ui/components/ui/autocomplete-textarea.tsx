import React from "react";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";

interface AutocompleteTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit?: () => void;
}

export const AutocompleteTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutocompleteTextareaProps
>(({ className, onKeyDown, onSubmit, ...props }, ref) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <Textarea
      ref={ref}
      className={cn("resize-none", className)}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
});

AutocompleteTextarea.displayName = "AutocompleteTextarea";
