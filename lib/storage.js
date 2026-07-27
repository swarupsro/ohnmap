const STORAGE_KEY = "nmap-insight-dashboard-scans-v1";
const FALSE_POSITIVES_KEY = "nmap-insight-dashboard-false-positives-v1";

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

export function loadFalsePositiveIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FALSE_POSITIVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to load stored false positive markers", error);
    return [];
  }
}

export function saveFalsePositiveIds(ids) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FALSE_POSITIVES_KEY, JSON.stringify(ids));
  } catch (error) {
    console.warn("Failed to save false positive markers", error);
  }
}
