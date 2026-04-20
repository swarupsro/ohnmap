const STORAGE_KEY = "nmap-insight-dashboard-scans-v1";

export function loadStoredScans() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to load stored Nmap scans", error);
    return [];
  }
}

export function saveStoredScans(scans) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
  } catch (error) {
    console.warn("Failed to save Nmap scans", error);
  }
}

export function clearStoredScans() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
