import React from "react";
import {
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  MicrophoneIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import navigationData from "@/data/navigation.json";
import { NavigationData } from "@/types/types";
import { usePathname } from "next/navigation";
import Link from "next/link";

const iconMap = {
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  MicrophoneIcon,
};

export function MobileSidebar() {
  const typedNavigationData = navigationData as NavigationData;
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">September</h1>
      </div>
      <nav className="space-y-2">
        {typedNavigationData.items.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const isActive = pathname.startsWith(item.href);
          return (
            <Button
              key={item.name}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-primary"
              }`}
              asChild
            >
              <Link href={item.href}>
                <Icon className="h-5 w-5 mr-2" />
                {item.name}
              </Link>
            </Button>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        <div className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="text-sm font-medium">User Name</p>
            <p className="text-xs text-muted-foreground">user@example.com</p>
          </div>
          <ChevronDownIcon className="ml-auto h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
