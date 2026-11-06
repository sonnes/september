/** The names of the services, as every screen shows them. */
export const SERVICE_NAMES = {
  apple: "Apple Intelligence",
  openrouter: "OpenRouter",
  elevenlabs: "ElevenLabs",
  system: "System voice",
  none: "No AI Assistance",
} as const;

export type ServiceId = keyof typeof SERVICE_NAMES;

/** The name of a stored service id. An id the app does not know shows as it is. */
export function serviceName(id: string): string {
  if (id === "unknown") return "Unknown";
  return id in SERVICE_NAMES ? SERVICE_NAMES[id as ServiceId] : id;
}
