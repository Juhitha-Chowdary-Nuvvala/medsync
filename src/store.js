/**
 * MedSync Data Layer (store.js)
 * 
 * MAIN RULES EXPLAINED:
 * 1. Single Storage Key: All demo data lives in browser localStorage under "medsync_data".
 * 2. Crash-Proof Recovery: If data is corrupted, empty, or damaged, loadData() automatically
 *    restores fresh seed data so the user never sees a blank screen.
 * 3. Safe Reset: resetData() removes only the "medsync_data" key, re-initializes seed data,
 *    and leaves all other browser storage completely untouched.
 * 4. Cross-Tab Sync: Whenever saveData() updates localStorage, other open tabs receive the
 *    browser's native 'storage' event to stay in sync automatically.
 */

import { createSeedData } from './seedData.js';

const STORAGE_KEY = 'medsync_data';

/**
 * Loads data from localStorage.
 * Rule: If data is missing or corrupted, returns and saves fresh seed data.
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createSeedData();
      saveData(fresh);
      return fresh;
    }

    const parsed = JSON.parse(raw);
    // Validate essential structure: patient object, records array, medications array
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.patient ||
      !Array.isArray(parsed.records) ||
      !Array.isArray(parsed.medications)
    ) {
      const fresh = createSeedData();
      saveData(fresh);
      return fresh;
    }

    return parsed;
  } catch (err) {
    // Graceful recovery: re-seed instead of crashing
    const fresh = createSeedData();
    saveData(fresh);
    return fresh;
  }
}

/**
 * Saves given state under the medsync_data key in localStorage.
 * Rule: Serializes data as a JSON string to trigger browser storage events for sync.
 */
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // In rare cases like private browsing quota exceeded
  }
}

/**
 * Removes ONLY the "medsync_data" key, generates fresh seed data,
 * saves it, and returns it.
 * Rule: Restores original 6 clinical records, empty PINs, and cleared audit log.
 */
export function resetData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Graceful handling
  }

  const fresh = createSeedData();
  saveData(fresh);
  return fresh;
}
