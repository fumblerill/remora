const AUTO_SAVE_PREF_KEY = "remora_auto_save_enabled";
const AUTO_SAVE_SNAPSHOT_KEY = "remora_auto_save_snapshot_v1";
const AUTO_SAVE_PREF_EVENT = "remora:auto-save-pref";

export type AutoSaveSnapshot = {
  dashboardName: string;
  widgets: any[];
  data: any[] | null;
  updatedAt: number;
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getAutoSavePreference(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(AUTO_SAVE_PREF_KEY) === "true";
}

export function setAutoSavePreference(enabled: boolean): void {
  const storage = getStorage();
  if (!storage) return;
  if (enabled) {
    storage.setItem(AUTO_SAVE_PREF_KEY, "true");
  } else {
    storage.setItem(AUTO_SAVE_PREF_KEY, "false");
    storage.removeItem(AUTO_SAVE_SNAPSHOT_KEY);
  }

  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<boolean>(AUTO_SAVE_PREF_EVENT, { detail: enabled }),
    );
  }
}

export function subscribeToAutoSavePreference(
  callback: (value: boolean) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<boolean>;
    if (typeof customEvent.detail === "boolean") {
      callback(customEvent.detail);
    } else {
      callback(getAutoSavePreference());
    }
  };

  window.addEventListener(AUTO_SAVE_PREF_EVENT, handler);
  return () => window.removeEventListener(AUTO_SAVE_PREF_EVENT, handler);
}

export function saveAutoSaveSnapshot(snapshot: AutoSaveSnapshot): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(AUTO_SAVE_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn("Unable to persist autosave snapshot", err);
  }
}

export function loadAutoSaveSnapshot(): AutoSaveSnapshot | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(AUTO_SAVE_SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AutoSaveSnapshot;
  } catch (err) {
    console.warn("Unable to parse autosave snapshot", err);
    return null;
  }
}

export function clearAutoSaveSnapshot(): void {
  const storage = getStorage();
  storage?.removeItem(AUTO_SAVE_SNAPSHOT_KEY);
}
