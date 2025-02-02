import { Menu } from "@headlessui/react";
import Link from "next/link";
import { Avatar } from "@/components/catalyst/avatar";
import { signOut } from "next-auth/react";

export function Profile({ user }: { user: { email: string } }) {
  return (
    <Menu as="div" className="relative ml-3 shrink-0">
      <Menu.Button className="relative flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600">
        <Avatar
          className="size-8 cursor-pointer font-medium"
          src={"https://github.com/shadcn.png"}
          initials={user.email?.slice(0, 2).toUpperCase()}
        />
      </Menu.Button>
      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <Menu.Item>
          {({ active }) => (
            <Link
              href="#"
              className={`block px-4 py-2 text-sm text-gray-700 ${
                active ? "bg-gray-100" : ""
              }`}
            >
              Your Profile
            </Link>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <Link
              href="#"
              className={`block px-4 py-2 text-sm text-gray-700 ${
                active ? "bg-gray-100" : ""
              }`}
            >
              Settings
            </Link>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <Link
              href="javascript:void(0)"
              onClick={() => signOut()}
              className={`block px-4 py-2 text-sm text-gray-700 ${
                active ? "bg-gray-100" : ""
              }`}
            >
              Sign out
            </Link>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}
