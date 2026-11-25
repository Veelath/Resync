export type NotificationPrefs = { alerts: boolean; sound: boolean };

/** The two switches as stored on the account (flat keys, so changing one never drops the other). */
export const prefsToMetadata = (prefs: NotificationPrefs) => ({ alerts_enabled: prefs.alerts, alert_sound: prefs.sound });
export function prefsFromMetadata(meta?: Record<string, unknown> | null): NotificationPrefs | null {
  if (!meta || (typeof meta.alerts_enabled !== "boolean" && typeof meta.alert_sound !== "boolean")) return null;
  return { alerts: meta.alerts_enabled !== false, sound: meta.alert_sound !== false };
}
