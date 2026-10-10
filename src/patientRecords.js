/**
 * MedSync Patient Records Logic (Stage 7)
 * Handles simulated medical record additions by the patient,
 * validation, deduplication, chronological ISO formatting, and audit logging.
 */

import { loadData, saveData } from './store.js';

// Double-click guard tracker (persists across calls in memory)
let lastSubmissionTimestamp = 0;
let lastSubmissionSignature = '';

/**
 * Validates and adds a patient-uploaded medical record.
 * 
 * @param {Object} input - Record form fields
 * @param {string} input.patientId - Patient identifier (e.g. "PID-12345")
 * @param {string} input.type - Record type
 * @param {string} input.dateStr - Picked date in "YYYY-MM-DD"
 * @param {string} input.facility - Provider or facility name
 * @param {string} input.title - Record title
 * @param {string} input.summary - Clinical summary
 * @param {string} [input.resultValue] - Optional result value for Lab Reports
 * @returns {Object} { ok: boolean, data?: Object, record?: Object, reason?: string }
 */
export function addPatientRecord(input) {
  if (!input) {
    return { ok: false, reason: 'missing_input' };
  }

  const {
    patientId = 'PID-12345',
    type,
    dateStr,
    facility,
    title,
    summary,
    resultValue
  } = input;

  // 1. Validate Record Type
  const allowedTypes = ['Lab Report', 'Prescription', 'Visit Note', 'Imaging', 'Discharge Summary'];
  if (!allowedTypes.includes(type)) {
    return { ok: false, reason: 'invalid_type' };
  }

  // 2. Validate Facility (Required, max 60 chars, not whitespace only)
  const trimmedFacility = (facility || '').trim();
  if (!trimmedFacility) {
    return { ok: false, reason: 'facility_required' };
  }
  if (trimmedFacility.length > 60) {
    return { ok: false, reason: 'facility_too_long' };
  }

  // 3. Validate Title (Required, max 80 chars, not whitespace only)
  const trimmedTitle = (title || '').trim();
  if (!trimmedTitle) {
    return { ok: false, reason: 'title_required' };
  }
  if (trimmedTitle.length > 80) {
    return { ok: false, reason: 'title_too_long' };
  }

  // 4. Validate Summary (Required, max 300 chars, not whitespace only)
  const trimmedSummary = (summary || '').trim();
  if (!trimmedSummary) {
    return { ok: false, reason: 'summary_required' };
  }
  if (trimmedSummary.length > 300) {
    return { ok: false, reason: 'summary_too_long' };
  }

  // 5. Validate Optional Result Value (for Lab Report only, max 60 chars)
  const trimmedResult = (resultValue || '').trim();
  if (type === 'Lab Report' && trimmedResult.length > 60) {
    return { ok: false, reason: 'result_too_long' };
  }

  // 6. Validate Date (Required, cannot be future, cannot be older than 10 years)
  if (!dateStr || !dateStr.trim()) {
    return { ok: false, reason: 'date_required' };
  }

  const dateParts = dateStr.trim().split('-');
  if (dateParts.length !== 3) {
    return { ok: false, reason: 'invalid_date_format' };
  }

  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]);
  const day = Number(dateParts[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return { ok: false, reason: 'invalid_date_numbers' };
  }

  // Convert date picked to an ISO timestamp at 12:00 local time
  const pickedDate = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (isNaN(pickedDate.getTime())) {
    return { ok: false, reason: 'invalid_date' };
  }

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (pickedDate.getTime() > todayEnd.getTime()) {
    return { ok: false, reason: 'future_date' };
  }

  const tenYearsAgoStart = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (pickedDate.getTime() < tenYearsAgoStart.getTime()) {
    return { ok: false, reason: 'date_too_old' };
  }

  // 7. Ignore rapid repeated clicks (deduplication within 2000ms)
  const nowMs = Date.now();
  const submissionSig = `${patientId}|${type}|${trimmedTitle}|${dateStr}|${trimmedFacility}`;
  if (submissionSig === lastSubmissionSignature && nowMs - lastSubmissionTimestamp < 2000) {
    return { ok: true, data: loadData(), duplicateIgnored: true };
  }
  lastSubmissionTimestamp = nowMs;
  lastSubmissionSignature = submissionSig;

  // 8. Load fresh data from store
  const data = loadData();
  if (!Array.isArray(data.records)) {
    data.records = [];
  }
  if (!Array.isArray(data.auditEvents)) {
    data.auditEvents = [];
  }

  // ISO timestamp at 12:00 local time
  const dateIso = pickedDate.toISOString();

  // 9. Create ONE record
  const recordId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newRecord = {
    id: recordId,
    patientId,
    type,
    title: trimmedTitle,
    date: dateIso,
    facility: trimmedFacility,
    summary: trimmedSummary,
    documentPreview: trimmedSummary,
    source: 'patient'
  };

  // If Lab Report or Imaging, set testName for duplicate detection
  if (type === 'Lab Report' || type === 'Imaging') {
    newRecord.testName = trimmedTitle;
  }

  // If Lab Report with result value
  if (type === 'Lab Report' && trimmedResult) {
    newRecord.resultValue = trimmedResult;
  }

  data.records.push(newRecord);

  // 10. Add ONE audit event
  const patientName = data.patient?.name || 'Ramesh Kumar';
  const auditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    actor: `${patientName} (Patient)`,
    action: 'Record added (simulated upload)',
    mode: 'standard',
    details: `${type}: ${trimmedTitle}`
  };
  data.auditEvents.push(auditEvent);

  // 11. Save updated data to store
  saveData(data);

  return { ok: true, data, record: newRecord };
}
