export const UNTITLED_NOTE_NAME = 'Untitled note';

export function noteNameIsUnset(name?: string | null): boolean {
  const trimmed = name?.trim();
  return !trimmed || trimmed.toLowerCase() === UNTITLED_NOTE_NAME.toLowerCase();
}

export function noteNameFromContent(content: string): string | undefined {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return undefined;

  const title = text.split(/\s+/).slice(0, 6).join(' ');
  return title.length > 64 ? `${title.slice(0, 61).trimEnd()}...` : title;
}

export function noteContentUpdates(
  currentName: string | undefined,
  content: string
): { content: string; name?: string } {
  const generatedName = noteNameIsUnset(currentName) ? noteNameFromContent(content) : undefined;
  return generatedName ? { content, name: generatedName } : { content };
}
