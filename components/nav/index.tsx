import { type ThemeColor } from '@/lib/theme';

import DesktopNav from './desktop-nav';
import MobileNav from './mobile-nav';

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
  color?: ThemeColor;
};

const defaultItems = [
  { name: 'Talk', href: '/talk' },
  { name: 'Write', href: '/write' },
  { name: 'Stories', href: '/stories' },
  { name: 'Settings', href: '/settings' },
];

export default function Navbar({
  items = defaultItems,
  current,
  user,
  color = 'indigo',
}: NavbarProps) {
  return (
    <div>
      <DesktopNav items={items} current={current} user={user} color={color} />
      <MobileNav items={items} current={current} user={user} color={color} />
    </div>
  );
}
