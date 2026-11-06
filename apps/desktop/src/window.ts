/**
 * The panel window of the Mac, which only the desktop app has.
 */

import { getCurrentWindow } from "@tauri-apps/api/window";

import { SETTINGS } from "@september/core/rules/settings";

import { call } from "./commands";
import { platform } from "./platform";

export const showPanel = () => call("panel_show");

export const hidePanel = () => call("panel_hide");

/**
 * Makes the panel a normal window with a Dock icon while setup runs. Off
 * applies the saved float choice again.
 */
export const panelSetup = (on: boolean) => call("panel_setup", { on });

/** Whether the panel stays above other apps. Rust keeps the choice. */
export const panelFloat = () => call("panel_float");

export const setPanelFloat = (on: boolean) => call("panel_set_float", { on });

/** Keeps the document and the window of the Mac on the same title. */
export async function setWindowTitle(title: string): Promise<void> {
  document.title = title;
  await getCurrentWindow().setTitle(title);
}

/** The screen the user left last, or nothing. */
export const readLastPath = () => platform.store.getSetting<string>(SETTINGS.lastPath);

export const saveLastPath = (path: string) => platform.store.putSetting(SETTINGS.lastPath, path);
