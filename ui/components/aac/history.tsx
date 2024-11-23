import * as React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryEntry {
  type: "voice" | "text";
  text: string;
  time: string;
}

interface CommunicationHistoryProps {
  history: HistoryEntry[];
  onClearHistory: () => void;
}

export function CommunicationHistory({
  history,
  onClearHistory,
}: CommunicationHistoryProps) {
  return (
    <div className="border-t">
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg lg:text-xl font-semibold">
            Communication History
          </h2>
          <Button variant="outline" onClick={onClearHistory}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear History
          </Button>
        </div>
        <ScrollArea className="h-[200px] lg:h-[300px]">
          <div className="space-y-4">
            {history.map((entry, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-1 h-2 w-2 rounded-full",
                    entry.type === "voice" ? "bg-destructive" : "bg-primary"
                  )}
                />
                <div className="flex-1">
                  <p className="font-medium">{entry.text}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.time} - {entry.type === "voice" ? "Voice" : "Text"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
