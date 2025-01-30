import { Menu } from "@headlessui/react";
import { User } from "next-auth";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

export function Profile({ user }: { user: User }) {
  return (
    <Menu as="div" className="relative ml-3 shrink-0">
      <Menu.Button className="relative flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600">
        <span className="absolute -inset-1.5" />
        <span className="sr-only">Open user menu</span>
        <Image
          className="size-8 rounded-full"
          src={user.image ?? "/images/default-avatar.png"}
          alt=""
          width={32}
          height={32}
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
            <button
              onClick={() => signOut()}
              className={`block w-full px-4 py-2 text-left text-sm text-gray-700 ${
                active ? "bg-gray-100" : ""
              }`}
            >
              Sign out
            </button>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}
