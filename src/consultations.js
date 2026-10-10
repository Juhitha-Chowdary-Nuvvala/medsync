/**
 * MedSync Consultations Layer (Stage 5)
 * Handles clinical consultation records, prescription management,
 * access re-verification, active medication updates, and audit trails.
 */

import { loadData, saveData } from './store.js';
import { verifyAccess } from './accessControl.js';
import { checkMedicationAlerts } from './demoAlerts.js';

/**
 * Saves a clinical consultation and optional prescription.
 * Follows strict sequence:
 * 1. Access re-check (via verifyAccess)
 * 2. Form validation
 * 3. Alert re-verification and acknowledgement check
 * 4. Consultation object creation in data.consultations
 * 5. Timeline record creation in data.records
 * 6. Active medication list update in data.medications
 * 7. Audit event logging in data.auditEvents
 * 8. Single atomic saveData call
 *
 * @param {string} patientId - Patient ID (e.g. "PID-12345")
 * @param {string} pin - 4-digit access PIN
 * @param {Object} doctor - Clinician object { name, id, specialty, hospital }
 * @param {Object} form - Form data { diagnosis, notes, medication, dose, frequency, acknowledged }
 * @param {boolean} [acknowledged=false] - Acknowledgement flag for critical alerts
 * @returns {Object} { ok: boolean, reason?: string, data?: Object }
 */
export function saveConsultation(patientId, pin, doctor, form, acknowledged = false) {
  const isAcknowledged = Boolean(acknowledged || form?.acknowledged);

  // --- 1. Re-check access first ---
  const check = verifyAccess(patientId, pin);

  if (!check.ok) {
    let reasonText = 'Unauthorized access';
    if (check.reason === 'expired') reasonText = 'Access expired';
    if (check.reason === 'revoked') reasonText = 'Access revoked by patient';
    if (check.reason === 'wrong_pin') reasonText = 'Invalid PIN';
    if (check.reason === 'wrong_id') reasonText = 'Patient not found';

    const doctorName = doctor?.name || 'Dr. Sarah Jenkins';
    const doctorId = doctor?.id || 'MD-8821';

    // Append Access Denied audit event
    const data = loadData();
    if (!Array.isArray(data.auditEvents)) {
      data.auditEvents = [];
    }
    data.auditEvents.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patientId,
      actor: `${doctorName} (${doctorId})`,
      action: 'Access denied',
      mode: 'standard',
      timestamp: new Date().toISOString(),
      details: `Save blocked: ${reasonText}`
    });
    saveData(data);

    return { ok: false, reason: check.reason };
  }

  // --- 2. Validate the form ---
  const diagnosis = (form?.diagnosis || '').trim();
  const notes = (form?.notes || '').trim();
  const medName = (form?.medication || '').trim();
  const medDose = (form?.dose || '').trim();
  const medFreq = (form?.frequency || '').trim();

  // Diagnosis is required, maximum 100 characters
  if (!diagnosis) {
    return { ok: false, reason: 'missing_diagnosis' };
  }
  if (diagnosis.length > 100) {
    return { ok: false, reason: 'diagnosis_too_long' };
  }

  // Notes are optional, maximum 500 characters
  if (notes.length > 500) {
    return { ok: false, reason: 'notes_too_long' };
  }

  // Medication, Dose, and Frequency are a group: either all 3 empty or all 3 filled
  const hasMedName = Boolean(medName);
  const hasMedDose = Boolean(medDose);
  const hasMedFreq = Boolean(medFreq);
  const hasAnyMed = hasMedName || hasMedDose || hasMedFreq;
  const hasAllMed = hasMedName && hasMedDose && hasMedFreq;

  if (hasAnyMed && !hasAllMed) {
    return { ok: false, reason: 'incomplete_medication' };
  }

  if (hasAllMed) {
    if (medName.length > 50 || medDose.length > 50 || medFreq.length > 50) {
      return { ok: false, reason: 'medication_too_long' };
    }
  }

  // Load fresh data
  const data = loadData();

  // --- 3. Recompute alerts from final medication name & verify acknowledgement ---
  let finalAlerts = [];
  if (hasAllMed) {
    const activeMeds = (data.medications || []).filter(
      (m) => m.patientId === patientId && m.active
    );
    finalAlerts = checkMedicationAlerts(medName, data.patient, activeMeds);
    const hasCritical = finalAlerts.some((a) => a.severity === 'critical');
    if (hasCritical && !isAcknowledged) {
      return { ok: false, reason: 'alerts_not_acknowledged' };
    }
  }

  const nowIso = new Date().toISOString();
  const doctorName = doctor?.name || 'Dr. Sarah Jenkins';
  const doctorId = doctor?.id || 'MD-8821';
  const doctorLabel = `${doctorName} (${doctorId})`;

  // Guard against rapid duplicate double-click submissions (within 2 seconds)
  if (Array.isArray(data.consultations) && data.consultations.length > 0) {
    const lastConsult = data.consultations[data.consultations.length - 1];
    if (
      lastConsult &&
      lastConsult.patientId === patientId &&
      lastConsult.doctorId === doctorId &&
      lastConsult.diagnosis === diagnosis &&
      Date.now() - new Date(lastConsult.createdAt).getTime() < 2000
    ) {
      return { ok: true, data };
    }
  }

  // --- 4. Create ONE consultation object in data.consultations ---
  if (!Array.isArray(data.consultations)) {
    data.consultations = [];
  }

  const consultationId = `consult-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const prescriptionList = hasAllMed
    ? [{ name: medName, dose: medDose, frequency: medFreq }]
    : [];


  const consultation = {
    id: consultationId,
    patientId,
    doctorId,
    doctorName,
    diagnosis,
    notes,
    prescription: prescriptionList,
    createdAt: nowIso
  };
  data.consultations.push(consultation);

  // --- 4. Create ONE timeline record in data.records ---
  if (!Array.isArray(data.records)) {
    data.records = [];
  }

  let summaryText = '';
  if (hasAllMed) {
    const rxLine = `Prescribed: ${medName} ${medDose}, ${medFreq}`;
    summaryText = notes ? `${notes}\n${rxLine}` : rxLine;
  } else {
    summaryText = notes || 'Consultation recorded.';
  }

  let documentPreviewText = `Diagnosis: ${diagnosis}`;
  if (notes) {
    documentPreviewText += `\nClinical Notes: ${notes}`;
  }
  if (hasAllMed) {
    documentPreviewText += `\nPrescription: ${medName} ${medDose}, ${medFreq}`;
  }

  const timelineRecord = {
    id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    patientId,
    type: hasAllMed ? 'Prescription' : 'Visit Note',
    title: diagnosis,
    date: nowIso,
    facility: doctor?.hospital || 'City General Hospital',
    summary: summaryText,
    documentPreview: documentPreviewText,
    clinician: doctorLabel,
    createdByDoctorId: doctorId,
    source: 'doctor',
    consultationId,
    // Direct medicine fields for rich prescription document previews
    ...(hasAllMed ? { medication: medName, dose: medDose, frequency: medFreq } : {})
  };
  data.records.push(timelineRecord);

  // --- 5. Update active medications list if prescription provided ---
  if (!Array.isArray(data.medications)) {
    data.medications = [];
  }

  if (hasAllMed) {
    const lowerMedName = medName.toLowerCase();

    // If an ACTIVE medication with same name already exists, deactivate it
    data.medications.forEach((m) => {
      if (
        m.patientId === patientId &&
        m.active &&
        m.name &&
        m.name.toLowerCase() === lowerMedName
      ) {
        m.active = false;
        m.endDate = nowIso;
      }
    });

    // Add new active medication
    const newMedication = {
      id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patientId,
      name: medName,
      dose: medDose,
      frequency: medFreq,
      condition: diagnosis,
      active: true,
      startDate: nowIso,
      prescribedBy: doctorLabel
    };
    data.medications.push(newMedication);
  }

  // --- 6. Add ONE audit event ---
  if (!Array.isArray(data.auditEvents)) {
    data.auditEvents = [];
  }

  let auditDetails = hasAllMed
    ? `${diagnosis} + prescription: ${medName}`
    : diagnosis;

  if (finalAlerts.length > 0) {
    const alertTitles = finalAlerts.map((a) => a.title).join(', ');
    auditDetails += ` (Saved after reviewing: ${alertTitles})`;
  }

  const auditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    patientId,
    actor: doctorLabel,
    action: 'Consultation saved',
    mode: 'standard',
    timestamp: nowIso,
    details: auditDetails
  };
  data.auditEvents.push(auditEvent);

  // --- 7. Save everything once and return ---
  saveData(data);
  return { ok: true, data };
}
