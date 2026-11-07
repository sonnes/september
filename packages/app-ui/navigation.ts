import {
  Accessibility,
  CircleHelp,
  DatabaseBackup,
  Eye,
  Gauge,
  House,
  Lightbulb,
  MessageSquare,
  Mic,
  PanelTop,
  Settings2,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import { platform } from "@platform/adapter";
import {
  appNav,
  settingsNav,
  type AppPage,
  type AppPath,
  type SettingsPath,
  type SettingsSection,
} from "@september/core/rules/navigation";

const ICONS: Record<AppPath, LucideIcon> = {
  "/dashboard": House,
  "/spaces": MessageSquare,
  "/voice": Mic,
  "/eyetracker": Eye,
  "/help": CircleHelp,
  "/settings": Settings2,
};

const SETTINGS_ICONS: Record<SettingsPath, LucideIcon> = {
  "/settings": SlidersHorizontal,
  "/settings/access": Accessibility,
  "/settings/writing": Lightbulb,
  "/settings/usage": Gauge,
  "/settings/panel": PanelTop,
  "/settings/data": DatabaseBackup,
};

/** The pages of this platform, in order, each with its icon. Setup ends at the first. */
export const APP_NAV: readonly (AppPage & { icon: LucideIcon })[] = appNav(
  platform.capabilities,
).map((page) => ({ ...page, icon: ICONS[page.path] }));

/** The sections of Settings on this platform. */
export const SETTINGS_NAV: readonly (SettingsSection & { icon: LucideIcon })[] = settingsNav(
  platform.capabilities,
).map((section) => ({ ...section, icon: SETTINGS_ICONS[section.path] }));

/** The page that a path belongs to, such as Settings for a section. */
export const pageOf = (path: string) =>
  APP_NAV.find((page) => path === page.path || path.startsWith(`${page.path}/`));
