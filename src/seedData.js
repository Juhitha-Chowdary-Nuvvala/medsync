/**
 * MedSync Seed Data
 * Contains fictional demonstration data for Stage 1.
 * All dates are calculated relative to today and stored as ISO strings.
 */

// Helper to return an ISO timestamp for "today minus n days"
export function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

/**
 * Format a stored ISO date into "<relative label> · <calendar date>"
 * Examples: "3 days ago · 7 Oct 2026", "Today · 10 Oct 2026"
 */
export function formatDateLabel(isoDateString) {
  if (!isoDateString) return '';
  const date = new Date(isoDateString);
  const diffMs = Date.now() - date.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  let relative = '';
  if (days === 0) {
    relative = 'Today';
  } else if (days === 1) {
    relative = 'Yesterday';
  } else if (days < 30) {
    relative = `${days} days ago`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    relative = months === 1 ? '1 month ago' : `${months} months ago`;
  } else {
    const years = Math.floor(days / 365);
    relative = years === 1 ? '1 year ago' : `${years} years ago`;
  }

  // Format calendar date: "D MMM YYYY"
  const day = date.getDate();
  const monthsArr = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const month = monthsArr[date.getMonth()];
  const year = date.getFullYear();
  const calendarDate = `${day} ${month} ${year}`;

  return `${relative} · ${calendarDate}`;
}

/**
 * Builds fresh seed data each time it is called
 */
export function createSeedData() {
  return {
    patient: {
      id: "PID-12345",
      name: "Ramesh Kumar",
      age: 58,
      bloodGroup: "O+",
      emergencyContact: "+91 98765 43210 (Wife: Priya)",
      conditions: [
        "Type 2 Diabetes",
        "Hypertension",
        "Atrial Fibrillation"
      ],
      allergies: [
        "Severe Penicillin Allergy"
      ]
    },
    doctor: {
      id: "MD-8821",
      name: "Dr. Sarah Jenkins",
      specialty: "Cardiology",
      hospital: "City General Hospital"
    },
    medications: [
      {
        id: "med-1",
        patientId: "PID-12345",
        name: "Metformin",
        dose: "500mg",
        frequency: "Twice daily",
        condition: "Type 2 Diabetes",
        active: true
      },
      {
        id: "med-2",
        patientId: "PID-12345",
        name: "Apixaban",
        dose: "5mg",
        frequency: "Twice daily",
        condition: "Atrial Fibrillation",
        active: true
      },
      {
        id: "med-3",
        patientId: "PID-12345",
        name: "Amlodipine",
        dose: "5mg",
        frequency: "Once daily",
        condition: "Hypertension",
        active: true
      }
    ],
    records: [
      {
        id: "rec-1",
        patientId: "PID-12345",
        type: "Lab Report",
        title: "HbA1c (Blood Sugar)",
        testName: "HbA1c",
        resultValue: "7.2%",
        date: daysAgo(3),
        facility: "Apollo Labs",
        summary: "Result 7.2%. Slight elevation from previous quarter.",
        documentPreview: "Fasting plasma glucose: 142 mg/dL. Estimated Average Glucose (eAG): 160 mg/dL.\nGlycated Hemoglobin (HbA1c): 7.2% (Reference: < 5.7%).\nClinical note: Recommend dietary adjustment and lifestyle review."
      },
      {
        id: "rec-2",
        patientId: "PID-12345",
        type: "Prescription",
        title: "Hypertension Med Refill",
        date: daysAgo(45),
        facility: "City General Hospital",
        summary: "Prescribed 90-day supply of Amlodipine 5mg.",
        documentPreview: "Rx Refill: Amlodipine Besylate 5mg oral tablet, once daily in the morning with water.\nDispense: 90 tablets (3 refills remaining).\nPrescribed by Dr. S. Rao, Internal Medicine."
      },
      {
        id: "rec-3",
        patientId: "PID-12345",
        type: "Visit Note",
        title: "Cardiology Follow-up",
        date: daysAgo(120),
        facility: "City General Hospital",
        summary: "Patient reported mild fatigue; adjusted blood pressure meds.",
        documentPreview: "Chief Complaint: Routine quarterly cardiac checkup.\nVitals: BP 134/86 mmHg, HR 72 bpm irregular. ECG reveals controlled ventricular response.\nClinical plan: Patient reported mild fatigue; adjusted blood pressure meds. Reinforce hydration."
      },
      {
        id: "rec-4",
        patientId: "PID-12345",
        type: "Discharge Summary",
        title: "Overnight Observation",
        date: daysAgo(180),
        facility: "City General Hospital",
        summary: "Admitted for minor AFib episode. Stabilized on Apixaban. Discharged next morning.",
        documentPreview: "Admission Diagnosis: Paroxysmal Atrial Fibrillation with palpitations.\nHospital Course: Monitored on telemetry, stabilized on Apixaban 5mg twice daily.\nDischarge Status: In normal sinus rhythm, hemodynamically stable. Advised regular cardiology follow-up."
      },
      {
        id: "rec-5",
        patientId: "PID-12345",
        type: "Lab Report",
        title: "Lipid Profile",
        testName: "Lipid Profile",
        resultValue: "Total Cholesterol 180 mg/dL",
        date: daysAgo(240),
        facility: "Apollo Labs",
        summary: "Total Cholesterol 180 mg/dL. LDL within normal limits.",
        documentPreview: "Total Cholesterol: 180 mg/dL (Desirable: <200 mg/dL).\nTriglycerides: 145 mg/dL, HDL: 46 mg/dL, LDL: 98 mg/dL (Optimal: <100 mg/dL).\nAssessment: Lipid parameters within acceptable therapeutic targets."
      },
      {
        id: "rec-6",
        patientId: "PID-12345",
        type: "Imaging",
        title: "Chest X-Ray",
        date: daysAgo(730),
        facility: "City Diagnostic Center",
        summary: "Clear, no acute cardiopulmonary disease.",
        documentPreview: "Examination: Chest PA View Radiograph.\nFindings: Lungs are well expanded and clear. Cardiothoracic ratio is normal. No pleural effusion or acute infiltrates.\nImpression: Clear, no acute cardiopulmonary disease."
      }
    ],
    accessGrants: [],
    auditEvents: [],
    consultations: []
  };
}
