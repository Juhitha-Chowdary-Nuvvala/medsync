/**
 * MedSync Simulated Clinical Alerts Layer (demoAlerts.js)
 * 
 * MAIN RULES EXPLAINED:
 * 1. Drug Interaction Check: If an NSAID (Ibuprofen, Naproxen, Diclofenac) is prescribed while
 *    the patient has an active blood thinner (Apixaban, Warfarin, Rivaroxaban), alert for severe bleeding risk.
 * 2. Allergy Check: If a Penicillin-class antibiotic (Amoxicillin, Ampicillin, Penicillin) is prescribed
 *    for a patient with a recorded Penicillin allergy, alert for severe allergic reaction.
 * 3. Duplicate Test Check: If a diagnostic test (Lab Report or Imaging, such as HbA1c or Chest X-Ray)
 *    was completed within the last 30 days, warn the clinician before ordering a repeat.
 * 4. Decision Support Only: These alerts remind clinicians but never block care permanently. The clinician
 *    can review and check an acknowledgement checkbox or click "Order anyway" to proceed.
 * 5. SEGREGATION RULE: Clinical alerts exist ONLY in the standard doctor chart. Emergency triage
 *    must NEVER show alerts or consultation forms.
 */

// Demo Drug Class Lists
export const NSAID_MEDICATIONS = ['ibuprofen', 'naproxen', 'diclofenac'];
export const BLOOD_THINNER_MEDICATIONS = ['apixaban', 'warfarin', 'rivaroxaban'];
export const PENICILLIN_MEDICATIONS = ['amoxicillin', 'ampicillin', 'penicillin'];

/**
 * Checks medication input for simulated critical alerts:
 * 1. NSAID + Blood Thinner interaction risk
 * 2. Penicillin class allergy risk
 *
 * @param {string} medicationName - Typed medication name
 * @param {Object} patient - Patient data object containing allergies
 * @param {Array} activeMedications - Current active medications array
 * @returns {Array} List of alerts: [{ id, severity: "critical", title, message }]
 */
export function checkMedicationAlerts(medicationName, patient, activeMedications) {
  if (!medicationName) return [];

  const trimmed = medicationName.trim().toLowerCase();
  if (!trimmed) return [];

  const alerts = [];

  // a) Drug-Drug Interaction: NSAIDs + Active Blood Thinners
  const isNsaid = NSAID_MEDICATIONS.some((m) => trimmed.includes(m) || m.includes(trimmed));
  if (isNsaid) {
    const activeThinner = (activeMedications || []).find((med) => {
      if (!med || !med.active || !med.name) return false;
      const lower = med.name.trim().toLowerCase();
      return BLOOD_THINNER_MEDICATIONS.some((bt) => lower.includes(bt) || bt.includes(lower));
    });

    if (activeThinner) {
      alerts.push({
        id: 'alert-interaction-nsaid-blood-thinner',
        severity: 'critical',
        title: 'Interaction Risk',
        message: `Severe bleeding risk when combining NSAIDs with Blood Thinners. Patient is currently on ${activeThinner.name}.`
      });
    }
  }

  // b) Allergy Alert: Penicillins + Known Penicillin Allergy
  const isPenicillin = PENICILLIN_MEDICATIONS.some((m) => trimmed.includes(m) || m.includes(trimmed));
  if (isPenicillin) {
    const patientAllergies = Array.isArray(patient?.allergies) ? patient.allergies : [];
    const hasPenicillinAllergy = patientAllergies.some((allergy) =>
      String(allergy).toLowerCase().includes('penicillin')
    );

    if (hasPenicillinAllergy) {
      alerts.push({
        id: 'alert-allergy-penicillin',
        severity: 'critical',
        title: 'Critical Allergy Alert',
        message: 'Patient has a severe Penicillin allergy.'
      });
    }
  }

  return alerts;
}

/**
 * Checks for duplicate lab or imaging tests ordered within the past 30 days.
 * Only inspects records of type "Lab Report" or "Imaging".
 * Prescriptions and Visit Notes never trigger duplicate test alerts.
 *
 * @param {string} testName - Name of the test being ordered (e.g. "HbA1c")
 * @param {Array} records - Patient medical records
 * @param {Date|string} today - Reference date (defaults to current date)
 * @returns {Object|null} Alert object or null if no duplicate within 30 days
 */
export function checkDuplicateTest(testName, records, today = new Date()) {
  if (!testName || !Array.isArray(records)) return null;

  const trimmedTest = testName.trim();
  const lowerQuery = trimmedTest.toLowerCase();
  const now = today instanceof Date ? today : new Date(today);

  // Filter relevant diagnostic records (Lab Report or Imaging only)
  const diagnosticMatches = records.filter((rec) => {
    if (!rec || (rec.type !== 'Lab Report' && rec.type !== 'Imaging')) {
      return false;
    }
    const recTestName = (rec.testName || '').trim().toLowerCase();
    const recTitle = (rec.title || '').trim().toLowerCase();
    const matchesTestName =
      recTestName === lowerQuery ||
      recTestName.startsWith(lowerQuery) ||
      recTestName.includes(lowerQuery) ||
      (recTestName && lowerQuery.includes(recTestName));
    const matchesTitle =
      recTitle === lowerQuery ||
      recTitle.startsWith(lowerQuery) ||
      recTitle.includes(lowerQuery) ||
      (recTitle && lowerQuery.includes(recTitle));

    return matchesTestName || matchesTitle;
  });

  if (diagnosticMatches.length === 0) return null;

  // Find matches completed within the last 30 days (0 <= daysAgo <= 30)
  let mostRecentMatch = null;
  let minDaysAgo = Infinity;

  diagnosticMatches.forEach((rec) => {
    const recDate = new Date(rec.date);
    const diffMs = now.getTime() - recDate.getTime();
    const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysAgo >= 0 && daysAgo <= 30 && daysAgo < minDaysAgo) {
      minDaysAgo = daysAgo;
      mostRecentMatch = rec;
    }
  });

  if (!mostRecentMatch || minDaysAgo > 30) {
    return null;
  }

  let timeString = `${minDaysAgo} days ago`;
  if (minDaysAgo === 0) {
    timeString = 'today';
  } else if (minDaysAgo === 1) {
    timeString = '1 day ago';
  }

  return {
    id: 'alert-duplicate-test',
    severity: 'warning',
    title: 'Recent Test Completed',
    message: `A recent ${trimmedTest} test was completed ${timeString}. Review timeline before ordering repeat.`,
    matchedRecord: mostRecentMatch,
    daysAgo: minDaysAgo
  };
}
