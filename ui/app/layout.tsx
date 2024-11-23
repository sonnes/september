import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import navigationData from "@/data/navigation.json";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  MicrophoneIcon,
  CalculatorIcon,
} from "@heroicons/react/24/outline";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "September",
};

const iconMap = {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  MicrophoneIcon,
  CalculatorIcon,
};

function AppSidebar({
  className,
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      className={cn("border-r", className)}
      {...props}
    >
      <SidebarHeader>
        <h1 className="text-xl font-semibold p-4 group-data-[collapsible=icon]:text-center">
          S
        </h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navigationData.items.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  tooltip={{
                    children: item.name,
                    hidden: false,
                  }}
                  className="px-2.5 md:px-2 group-data-[collapsible=icon]:justify-center"
                  asChild
                >
                  <a href={item.href}>
                    {Icon && (
                      <div className="h-5 w-5 group-data-[collapsible=icon]:mr-0 mr-2">
                        <Icon aria-hidden="true" />
                      </div>
                    )}
                    <span className="group-data-[collapsible=icon]:hidden">
                      {item.name}
                    </span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-4">
        <NavUser
          user={{
            name: "User Name",
            email: "user@example.com",
            avatar: "/path/to/avatar.jpg",
          }}
        />
        <SidebarTrigger className="hidden lg:flex mx-4" />
      </SidebarFooter>
    </Sidebar>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider defaultOpen={false}>
          <div className="flex h-screen overflow-hidden">
            <AppSidebar className="hidden lg:flex" />
            <div className="flex flex-1 flex-col overflow-hidden">
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
