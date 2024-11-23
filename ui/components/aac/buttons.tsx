import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface CommunicationButtonsProps {
  onMessageAdd: (text: string) => void;
}

export function CommunicationButtons({
  onMessageAdd,
}: CommunicationButtonsProps) {
  const basicPhrases = [
    "Yes",
    "No",
    "Help",
    "More",
    "I want",
    "I need",
    "Please",
    "Thank you",
  ];

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="mb-4 flex overflow-auto">
        <TabsTrigger value="basic">Basic</TabsTrigger>
        <TabsTrigger value="food">Food</TabsTrigger>
        <TabsTrigger value="feelings">Feelings</TabsTrigger>
        <TabsTrigger value="activities">Activities</TabsTrigger>
      </TabsList>
      <TabsContent value="basic" className="mt-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-4">
          {basicPhrases.map((text) => (
            <Button
              key={text}
              variant="outline"
              className="h-24 lg:h-32 text-base lg:text-lg"
              onClick={() => onMessageAdd(text)}
            >
              {text}
            </Button>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
