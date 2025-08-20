'use client';

import { Dropdown, DropdownOption } from '@/components/ui/dropdown';

interface Tab {
  name: string;
  href: string;
}

const defaultTabs = [
  { name: 'Account', href: '/account' },
  { name: 'AI', href: '/settings/ai' },
  { name: 'Speech', href: '/settings/speech' },
];

interface SettingsTabsProps {
  tabs?: Tab[];
  current?: string;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function SettingsTabs({ tabs = defaultTabs, current }: SettingsTabsProps) {

  // Convert tabs to dropdown options
  const dropdownOptions: DropdownOption[] = tabs.map(tab => ({
    id: tab.href,
    name: tab.name,
  }));

  const handleTabSelect = (href: string) => {
    window.location.href = href;
  };

  return (
    <div className="mb-6">
      <div className="sm:hidden">
        <Dropdown
          options={dropdownOptions}
          selectedValue={current}
          onSelect={handleTabSelect}
          placeholder="Select a tab"
          className="w-full"
        />
      </div>
      <div className="hidden sm:block">
        <nav aria-label="Tabs" className="flex space-x-4">
          {tabs.map(tab => (
            <a
              key={tab.name}
              href={tab.href}
              aria-current={tab.href === current ? 'page' : undefined}
              className={classNames(
                tab.href === current
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-white hover:text-gray-50',
                'rounded-md px-3 py-2 text-sm font-medium'
              )}
            >
              {tab.name}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
