/**
 * MedSync Access Control Layer (accessControl.js)
 * 
 * MAIN RULES EXPLAINED:
 * 1. Time-Limited PINs: The patient generates a 4-digit PIN with a custom duration (1 min to 30 days).
 * 2. Dynamic Expiry: Status (active/expired/revoked) is calculated dynamically from the clock
 *    (Date.now() >= expiresAt), never blindly trusting a stored status string.
 * 3. One Active PIN at a Time: Generating a new PIN immediately revokes any previous active PIN.
 * 4. Instant Revocation: When the patient clicks "Revoke Access", the active PIN is killed immediately
 *    and any open doctor chart locks right away via cross-tab storage sync.
 * 5. Emergency Override (Break-Glass): Allows emergency access without a PIN, but strictly logs
 *    an immutable EMERGENCY OVERRIDE audit event and restricts data to vital triage only.
 * 6. Audit Trail: Every PIN generation, verification, denied attempt, revocation, expiry, consultation,
 *    and emergency override is permanently appended to the audit history.
 */

import { loadData, saveData } from './store.js';

/**
 * Returns the dynamic status of a grant: "active", "expired", or "revoked".
 * Rule: Expiry is calculated dynamically from timestamps, not trusted as a stored string.
 */
export function getGrantStatus(grant) {
  if (!grant) return 'none';
  if (grant.status === 'revoked') {
    return 'revoked';
  }
  const now = Date.now();
  const expiresAtMs = new Date(grant.expiresAt).getTime();
  if (now >= expiresAtMs) {
    return 'expired';
  }
  return 'active';
}

/**
 * Returns the most recent grant for the patient by createdAt, or null.
 */
export function getCurrentGrant(data, patientId) {
  if (!data || !Array.isArray(data.accessGrants)) return null;
  const patientGrants = data.accessGrants.filter((g) => g.patientId === patientId);
  if (patientGrants.length === 0) return null;

  // Sort descending by creation timestamp
  const sorted = [...patientGrants].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sorted[0];
}

/**
 * Appends an audit event to medsync_data.auditEvents without erasing history.
 */
export function addAuditEvent(patientId, actor, action, mode = 'standard', details = '') {
  const data = loadData();
  if (!Array.isArray(data.auditEvents)) {
    data.auditEvents = [];
  }

  const event = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    patientId,
    actor,
    action,
    mode,
    timestamp: new Date().toISOString(),
    details: details || ''
  };

  data.auditEvents.push(event);
  saveData(data);
  return data;
}

/**
 * Generates a fresh 4-digit PIN for the specified duration (in minutes).
 * If an active unexpired grant exists, it is marked revoked and logged.
 */
export function generatePin(patientId, minutes) {
  const data = loadData();

  // Validate range: whole numbers only, 1 minute to 30 days (43200 minutes)
  const parsedMinutes = Number(minutes);
  if (!Number.isInteger(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 43200) {
    return data;
  }
  const validMinutes = parsedMinutes;

  if (!Array.isArray(data.accessGrants)) {
    data.accessGrants = [];
  }
  if (!Array.isArray(data.auditEvents)) {
    data.auditEvents = [];
  }

  const nowIso = new Date().toISOString();

  // If an active grant already exists, revoke it first and log
  const existingGrant = getCurrentGrant(data, patientId);
  if (existingGrant && getGrantStatus(existingGrant) === 'active') {
    existingGrant.status = 'revoked';
    existingGrant.revokedAt = nowIso;

    data.auditEvents.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patientId,
      actor: 'Ramesh Kumar (Patient)',
      action: 'Previous PIN replaced',
      mode: 'standard',
      timestamp: nowIso,
      details: 'Old PIN invalidated upon new PIN generation'
    });
  }

  // Create a 4-digit PIN string (0000 - 9999, keeping leading zeros)
  const pinNumber = Math.floor(Math.random() * 10000);
  const pin = String(pinNumber).padStart(4, '0');

  const expiresAtMs = Date.now() + validMinutes * 60 * 1000;
  const expiresAtIso = new Date(expiresAtMs).toISOString();

  const newGrant = {
    id: `grant-${Date.now()}`,
    patientId,
    pin,
    createdAt: nowIso,
    expiresAt: expiresAtIso,
    status: 'active',
    revokedAt: null,
    expiryLogged: false
  };

  data.accessGrants.push(newGrant);

  // Format audit details text for any duration (including days, hours, minutes)
  const days = Math.floor(validMinutes / 1440);
  const remMinutesAfterDays = validMinutes % 1440;
  const hours = Math.floor(remMinutesAfterDays / 60);
  const remainingMins = remMinutesAfterDays % 60;

  let durationText = '';
  if (days > 0 && hours === 0 && remainingMins === 0) {
    durationText = `Valid for ${days === 1 ? '1 day' : `${days} days`}`;
  } else if (days > 0) {
    const parts = [days === 1 ? '1 day' : `${days} days`];
    if (hours > 0) parts.push(hours === 1 ? '1 hour' : `${hours} hours`);
    if (remainingMins > 0) parts.push(remainingMins === 1 ? '1 minute' : `${remainingMins} minutes`);
    durationText = `Valid for ${parts.join(' ')}`;
  } else if (hours > 0 && remainingMins > 0) {
    durationText = `Valid for ${hours === 1 ? '1 hour' : `${hours} hours`} ${remainingMins === 1 ? '1 minute' : `${remainingMins} minutes`}`;
  } else if (hours > 0) {
    durationText = `Valid for ${hours === 1 ? '1 hour' : `${hours} hours`}`;
  } else {
    durationText = `Valid for ${validMinutes === 1 ? '1 minute' : `${validMinutes} minutes`}`;
  }

  data.auditEvents.push({
    id: `audit-${Date.now() + 1}-${Math.random().toString(36).substring(2, 7)}`,
    patientId,
    actor: 'Ramesh Kumar (Patient)',
    action: 'PIN generated',
    mode: 'standard',
    timestamp: nowIso,
    details: durationText
  });

  saveData(data);
  return data;
}

/**
 * Revokes the currently active grant for the patient.
 * Only acts if the latest grant is currently "active".
 */
export function revokeGrant(patientId) {
  const data = loadData();
  const currentGrant = getCurrentGrant(data, patientId);

  if (currentGrant && getGrantStatus(currentGrant) === 'active') {
    const nowIso = new Date().toISOString();
    currentGrant.status = 'revoked';
    currentGrant.revokedAt = nowIso;

    if (!Array.isArray(data.auditEvents)) {
      data.auditEvents = [];
    }

    data.auditEvents.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patientId,
      actor: 'Ramesh Kumar (Patient)',
      action: 'Access revoked',
      mode: 'standard',
      timestamp: nowIso,
      details: 'Access revoked by patient'
    });

    saveData(data);
  }

  return data;
}

/**
 * If the latest grant has reached its expiration time and expiryLogged is false,
 * marks expiryLogged = true and logs "PIN expired" exactly once.
 */
export function logExpiryIfNeeded(patientId) {
  const data = loadData();
  const currentGrant = getCurrentGrant(data, patientId);

  if (currentGrant && getGrantStatus(currentGrant) === 'expired' && !currentGrant.expiryLogged) {
    currentGrant.expiryLogged = true;

    if (!Array.isArray(data.auditEvents)) {
      data.auditEvents = [];
    }

    data.auditEvents.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patientId,
      actor: 'Ramesh Kumar (Patient)',
      action: 'PIN expired',
      mode: 'standard',
      timestamp: new Date().toISOString(),
      details: 'PIN validity period ended'
    });

    saveData(data);
  }

  return data;
}

/**
 * Verifies if a given patient ID and PIN constitute an active, authorized grant.
 * For Stage 3 consumption (not connected to UI yet).
 */
export function verifyAccess(patientId, pin) {
  const data = loadData();

  if (!data?.patient || data.patient.id !== patientId) {
    return { ok: false, reason: 'wrong_id' };
  }

  const currentGrant = getCurrentGrant(data, patientId);
  if (!currentGrant) {
    return { ok: false, reason: 'no_grant' };
  }

  if (currentGrant.pin !== pin) {
    return { ok: false, reason: 'wrong_pin' };
  }

  const status = getGrantStatus(currentGrant);
  if (status === 'revoked') {
    return { ok: false, reason: 'revoked' };
  }
  if (status === 'expired') {
    return { ok: false, reason: 'expired' };
  }
  if (status === 'active') {
    return { ok: true };
  }

  return { ok: false, reason: 'no_grant' };
}

/**
 * Re-check helper right before protected actions.
 * Returns true only if the grant is currently active and non-revoked.
 */
export function canStillAccess(patientId, pin) {
  const check = verifyAccess(patientId, pin);
  return Boolean(check && check.ok);
}

/**
 * Starts an emergency break-glass triage access.
 * Rules:
 * 1. If patientId does not match real patient in data, returns { ok: false, reason: "wrong_id" } and logs NOTHING.
 * 2. If valid, adds ONE audit event with:
 *    - actor: "<doctor name> (<doctor id>)"
 *    - action: "EMERGENCY OVERRIDE"
 *    - mode: "emergency"
 *    - details: "Reason: <reason>. Restricted triage view only."
 * 3. Does NOT touch, create, use, or revoke PINs or grants. Active grants continue ticking down.
 * 4. Deduplicates immediate double-clicks.
 * 5. Returns { ok: true, data }.
 */
export function startEmergencyAccess(patientId, doctor, reason) {
  const data = loadData();

  if (!data?.patient || data.patient.id !== patientId) {
    return { ok: false, reason: 'wrong_id' };
  }

  if (!Array.isArray(data.auditEvents)) {
    data.auditEvents = [];
  }

  // Deduplication guard against rapid double-clicks (within 2 seconds)
  const lastEvent = data.auditEvents[data.auditEvents.length - 1];
  if (
    lastEvent &&
    lastEvent.patientId === patientId &&
    lastEvent.action === 'EMERGENCY OVERRIDE' &&
    Date.now() - new Date(lastEvent.timestamp).getTime() < 2000
  ) {
    return { ok: true, data };
  }

  const doctorName = doctor?.name || data.doctor?.name || 'Dr. Sarah Jenkins';
  const doctorId = doctor?.id || data.doctor?.id || 'MD-8821';

  const newEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    patientId,
    actor: `${doctorName} (${doctorId})`,
    action: 'EMERGENCY OVERRIDE',
    mode: 'emergency',
    timestamp: new Date().toISOString(),
    details: `Reason: ${reason || 'Unspecified emergency'}. Restricted triage view only.`
  };

  data.auditEvents.push(newEvent);
  saveData(data);
  return { ok: true, data };
}

/**
 * Returns strictly the restricted emergency triage dataset for a patient:
 * ONLY: bloodGroup, allergies, conditions, and activeMedications (name, dose, frequency).
 * Returns a new object so the caller cannot see or mutate other fields.
 */
export function getTriageData(data, patientId) {
  if (!data?.patient || data.patient.id !== patientId) {
    return null;
  }

  const activeMedications = (data.medications || [])
    .filter((m) => m.patientId === patientId && m.active)
    .map((m) => ({
      name: m.name,
      dose: m.dose,
      frequency: m.frequency
    }));

  return {
    bloodGroup: data.patient.bloodGroup || '',
    allergies: Array.isArray(data.patient.allergies) ? [...data.patient.allergies] : [],
    conditions: Array.isArray(data.patient.conditions) ? [...data.patient.conditions] : [],
    activeMedications
  };
}

// Stage 5 Consultation Save Logic
export { saveConsultation } from './consultations.js';



