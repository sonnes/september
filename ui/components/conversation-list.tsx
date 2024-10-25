import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export function ConversationList() {
  return (
    <div className="w-full lg:w-1/3 bg-card rounded-lg shadow p-4 flex flex-col h-full">
      <div className="relative mb-4">
        <Input placeholder="Search conversations..." className="pl-10" />
        <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
      </div>
      <div className="space-y-4 overflow-y-auto flex-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center p-2 hover:bg-accent hover:text-accent-foreground rounded cursor-pointer"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={`/placeholder-avatar-${i}.jpg`}
                alt={`Contact ${i}`}
              />
              <AvatarFallback>C{i}</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="font-medium">Contact {i}</p>
              <p className="text-sm text-muted-foreground">
                Last message preview...
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
