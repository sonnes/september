import DesktopNavComponent, { type DesktopNavProps } from './desktop';
import MobileNavComponent, { type MobileNavProps } from './mobile';

export { SettingsTabs } from './settings-tabs';

type NavigationItem = {
  name: string;
  href: string;
  description?: string;
};

type NavbarProps = {
  items?: NavigationItem[];
  current: string;
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  } | null;
  className?: string;
};

const defaultItems = [
  { name: 'Talk', href: '/talk' },
  // { name: 'Write', href: '/write' },
  { name: 'Settings', href: '/settings/ai' },
];

export const MobileNav = ({ items = defaultItems, ...props }: MobileNavProps) => {
  return <MobileNavComponent items={items} {...props} />;
};

export const DesktopNav = ({ items = defaultItems, ...props }: DesktopNavProps) => {
  return <DesktopNavComponent items={items} {...props} />;
};

export default function Navbar({ items = defaultItems, current, user }: NavbarProps) {
  return (
    <div>
      <DesktopNav items={items} current={current} user={user} />
      <MobileNav items={items} current={current} user={user} />
    </div>
  );
}
