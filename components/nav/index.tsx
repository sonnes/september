import { type ThemeColor, themes } from '@/lib/theme';
import { cn } from '@/lib/utils';

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
  { name: 'Stories', href: '/stories' },
  { name: 'Settings', href: '/settings' },
];

export default function Navbar({
  items = defaultItems,
  current,
  user,
  color = 'indigo',
}: NavbarProps) {
  const theme = themes[color];

  return (
    <div>
      <DesktopNav items={items} current={current} user={user} color={color} />
      <MobileNav items={items} current={current} user={user} color={color} />
    </div>
  );
}
