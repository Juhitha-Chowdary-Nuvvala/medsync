import React, { useState, useEffect } from 'react';
import {
  verifyAccess,
  getCurrentGrant,
  addAuditEvent,
  logExpiryIfNeeded,
  startEmergencyAccess,
  getTriageData
} from './accessControl.js';
import { saveConsultation } from './consultations.js';
import { checkMedicationAlerts, checkDuplicateTest } from './demoAlerts.js';
import DocumentPreview from './DocumentPreview.jsx';

/**
 * DoctorPortal Component (Stage 6)
 * Implements the Doctor Lookup Gate, PIN verification, 30s lockout on repeated failures,
 * active clinical chart view, live access countdown, continuous access verification,
 * emergency break-glass triage flow, Consultation Pad recording, and simulated clinical alerts.
 */
export default function DoctorPortal({ data, onDataChange, formatDateLabel }) {
  // Verified access state in React state only (refresh or portal switch returns to gate)
  const [verifiedAccess, setVerifiedAccess] = useState(null);

  // Locked screen state (when active grant expires or is revoked while open)
  const [lockedReason, setLockedReason] = useState(null);

  // Form input states
  const [patientIdInput, setPatientIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [gateError, setGateError] = useState('');

  // Lockout after 5 failed attempts in a row
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Emergency override state (Stage 4)
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyOtherText, setEmergencyOtherText] = useState('');
  const [isSubmittingEmergency, setIsSubmittingEmergency] = useState(false);
  const [emergencyAccessState, setEmergencyAccessState] = useState(null); // { patientId, timestamp }

  // Timeline expansion state inside clinical chart
  const [expandedTimelineId, setExpandedTimelineId] = useState(null);
  // Collapsible timeline view: show 3 recent by default
  const [showAllDoctorTimeline, setShowAllDoctorTimeline] = useState(false);

  // Consultation Pad Form state (Stage 5)
  const [consultDiagnosis, setConsultDiagnosis] = useState('');
  const [consultNotes, setConsultNotes] = useState('');
  const [consultMedName, setConsultMedName] = useState('');
  const [consultMedDose, setConsultMedDose] = useState('');
  const [consultMedFreq, setConsultMedFreq] = useState('');
  const [consultErrors, setConsultErrors] = useState({});
  const [consultTouched, setConsultTouched] = useState(false);
  const [isSavingConsult, setIsSavingConsult] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Stage 6 Clinical Alerts state
  const [alertsAcknowledged, setAlertsAcknowledged] = useState(false);
  const [selectedTest, setSelectedTest] = useState('HbA1c');
  const [duplicateTestAlert, setDuplicateTestAlert] = useState(null);
  const [highlightedRecordId, setHighlightedRecordId] = useState(null);

  // Toast notification auto-dismiss after 4 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);


  const doctor = data?.doctor || {

    name: 'Dr. Sarah Jenkins',
    specialty: 'Cardiology',
    id: 'MD-8821',
    hospital: 'City General Hospital'
  };

  const patient = data?.patient || {};

  // Lockout countdown timer (30 seconds demo lockout)
  // NOTE: Demo lockout in React state. Production systems must implement server-side rate limiting.
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  // Handle Gate Input Changes (clear error when doctor starts typing again)
  const handlePatientIdChange = (e) => {
    setPatientIdInput(e.target.value);
    if (gateError) setGateError('');
  };

  const handlePinChange = (e) => {
    // Only accept numbers up to 4 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPinInput(cleaned);
    if (gateError) setGateError('');
  };

  // Submit PIN Verification at the Gate
  const handleAccessSubmit = (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    const trimmedId = patientIdInput.trim().toUpperCase();
    if (!trimmedId || !pinInput) {
      setGateError('Please enter both Patient ID and 4-Digit PIN.');
      return;
    }

    const check = verifyAccess(trimmedId, pinInput);

    if (check.ok) {
      // Success: reset failed attempts, open chart, and log chart access
      setFailedAttempts(0);
      setGateError('');
      setLockedReason(null);
      setVerifiedAccess({ patientId: trimmedId, pin: pinInput });

      const updated = addAuditEvent(
        trimmedId,
        `${doctor.name} (${doctor.id})`,
        'Chart accessed',
        'standard',
        'Standard access with PIN'
      );
      onDataChange(updated);
    } else {
      // Failure
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);

      // Trigger 30s lockout on 5 consecutive failures
      if (newFails >= 5) {
        setLockoutSeconds(30);
      }

      // Audit for denied attempts only if Patient ID matches the real patient
      if (trimmedId === patient.id) {
        let reasonDetail = 'Wrong PIN';
        if (check.reason === 'expired') reasonDetail = 'Expired PIN';
        if (check.reason === 'revoked') reasonDetail = 'Revoked PIN';
        if (check.reason === 'no_grant') reasonDetail = 'No active PIN grant';

        const updated = addAuditEvent(
          trimmedId,
          `${doctor.name} (${doctor.id})`,
          'Access denied',
          'standard',
          reasonDetail
        );
        onDataChange(updated);
      }

      // Display failure message to doctor
      if (check.reason === 'expired') {
        setGateError('This PIN has expired. Ask the patient for a new one.');
      } else if (check.reason === 'revoked') {
        setGateError('The patient has revoked this access.');
      } else {
        // "wrong_id", "wrong_pin", or "no_grant": show generic message
        setGateError('Invalid Patient ID or PIN.');
      }
    }
  };

  // Emergency override button click handler (Stage 4)
  const handleEmergencyClick = () => {
    // 1. If the PIN field has any characters typed into it, do not open the override
    if (pinInput.trim().length > 0) {
      setGateError('Clear the PIN field to use emergency triage.');
      return;
    }

    const trimmedId = patientIdInput.trim().toUpperCase();
    // 2. If the Patient ID field is empty
    if (!trimmedId) {
      setGateError('Enter a Patient ID.');
      return;
    }

    // 3. If the Patient ID does not match the real patient
    if (!patient || trimmedId !== patient.id) {
      setGateError('Patient not found.');
      return;
    }

    // Passed checks: open confirmation modal (does not affect failedAttempts or lockout)
    setGateError('');
    setEmergencyReason('');
    setEmergencyOtherText('');
    setIsSubmittingEmergency(false);
    setEmergencyModalOpen(true);
  };

  // Close Emergency Modal without logging anything
  const handleCancelEmergency = () => {
    setEmergencyModalOpen(false);
    setEmergencyReason('');
    setEmergencyOtherText('');
    setIsSubmittingEmergency(false);
  };

  // Confirm Emergency Access and enter Restricted Triage View
  const isEmergencyReasonValid = Boolean(
    emergencyReason &&
    (emergencyReason !== 'Other' || emergencyOtherText.trim().length > 0)
  );
  const isConfirmDisabled = !isEmergencyReasonValid || isSubmittingEmergency;

  const handleConfirmEmergency = () => {
    if (isConfirmDisabled) return;
    setIsSubmittingEmergency(true);

    const trimmedId = patientIdInput.trim().toUpperCase();
    const finalReason = emergencyReason === 'Other' ? emergencyOtherText.trim() : emergencyReason;

    const result = startEmergencyAccess(trimmedId, doctor, finalReason);
    if (result.ok) {
      if (result.data) {
        onDataChange(result.data);
      }
      setEmergencyAccessState({
        patientId: trimmedId,
        timestamp: new Date().toISOString()
      });
      setEmergencyModalOpen(false);
    } else {
      setGateError('Emergency access could not be authorized.');
      setEmergencyModalOpen(false);
    }
  };

  // Exit Restricted Triage View
  const handleCloseTriage = () => {
    setEmergencyAccessState(null);
  };

  // --- CONTINUOUS ACCESS RE-CHECK WHILE CHART IS OPEN ---
  // Re-checks every second and whenever stored data updates via storage sync.
  useEffect(() => {
    if (!verifiedAccess) return;

    const checkCurrentAccess = () => {
      const check = verifyAccess(verifiedAccess.patientId, verifiedAccess.pin);
      if (!check.ok) {
        // Grant is no longer active: unmount chart immediately and show locked screen
        if (check.reason === 'revoked') {
          setLockedReason('The patient revoked access.');
        } else if (check.reason === 'expired') {
          setLockedReason('The access period has expired.');
          logExpiryIfNeeded(verifiedAccess.patientId);
        } else {
          setLockedReason('Access is no longer available.');
        }
        setVerifiedAccess(null);
      }
    };

    // Immediate check on data change
    checkCurrentAccess();

    // 1-second interval ticker for expiry check and countdown
    const interval = setInterval(checkCurrentAccess, 1000);
    return () => clearInterval(interval);
  }, [verifiedAccess, data]);

  // Reset Consultation Form fields
  const resetConsultationForm = () => {
    setConsultDiagnosis('');
    setConsultNotes('');
    setConsultMedName('');
    setConsultMedDose('');
    setConsultMedFreq('');
    setConsultErrors({});
    setConsultTouched(false);
    setAlertsAcknowledged(false);
  };

  // Validate Consultation Pad Form
  const validateConsultForm = (diagnosis, medName, medDose, medFreq) => {
    const errors = {};
    const trimmedDiag = (diagnosis || '').trim();
    if (!trimmedDiag) {
      errors.diagnosis = 'Diagnosis is required.';
    } else if (trimmedDiag.length > 100) {
      errors.diagnosis = 'Diagnosis must be 100 characters or less.';
    }

    const trimmedName = (medName || '').trim();
    const trimmedDose = (medDose || '').trim();
    const trimmedFreq = (medFreq || '').trim();
    const hasAny = Boolean(trimmedName || trimmedDose || trimmedFreq);
    const hasAll = Boolean(trimmedName && trimmedDose && trimmedFreq);

    if (hasAny && !hasAll) {
      errors.prescription = 'Fill medication, dose, and frequency together.';
    } else if (hasAll) {
      if (trimmedName.length > 50 || trimmedDose.length > 50 || trimmedFreq.length > 50) {
        errors.prescription = 'Medication fields must be 50 characters or less.';
      }
    }
    return errors;
  };

  // Submit Consultation and Prescription
  const handleSaveConsultation = (e) => {
    e.preventDefault();
    if (isSavingConsult) return;

    setConsultTouched(true);
    const errors = validateConsultForm(
      consultDiagnosis,
      consultMedName,
      consultMedDose,
      consultMedFreq
    );
    setConsultErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSavingConsult(true);

    const formData = {
      diagnosis: consultDiagnosis,
      notes: consultNotes,
      medication: consultMedName,
      dose: consultMedDose,
      frequency: consultMedFreq,
      acknowledged: alertsAcknowledged
    };

    const result = saveConsultation(
      verifiedAccess.patientId,
      verifiedAccess.pin,
      doctor,
      formData,
      alertsAcknowledged
    );

    setIsSavingConsult(false);

    if (result.ok) {
      // Clear form
      resetConsultationForm();
      // Show Fresh Mint toast
      setToastMessage('Added to Patient Timeline');
      // Update parent data state immediately
      if (result.data) {
        onDataChange(result.data);
      }
    } else {
      // Access was ended/revoked/expired
      if (result.reason === 'revoked') {
        resetConsultationForm();
        setLockedReason('The patient revoked access.');
        setVerifiedAccess(null);
      } else if (result.reason === 'expired') {
        resetConsultationForm();
        setLockedReason('The access period has expired.');
        logExpiryIfNeeded(verifiedAccess.patientId);
        setVerifiedAccess(null);
      } else if (result.reason === 'incomplete_medication') {
        setConsultErrors({ prescription: 'Fill medication, dose, and frequency together.' });
      } else if (result.reason === 'alerts_not_acknowledged') {
        setConsultErrors({ form: 'Please review and acknowledge clinical alerts before saving.' });
      } else {
        setConsultErrors({ form: 'Could not save consultation. Please check the fields.' });
      }
    }
  };

  // Order Test Handler (Stage 6)
  const handleOrderTestClick = () => {
    // Re-check access
    const check = verifyAccess(verifiedAccess.patientId, verifiedAccess.pin);
    if (!check.ok) {
      setLockedReason(
        check.reason === 'revoked'
          ? 'The patient revoked access.'
          : 'The access period has expired.'
      );
      setVerifiedAccess(null);
      return;
    }

    const dupAlert = checkDuplicateTest(selectedTest, data?.records || []);
    if (dupAlert) {
      setDuplicateTestAlert(dupAlert);
      return;
    }

    // No duplicate: order test immediately
    const updated = addAuditEvent(
      verifiedAccess.patientId,
      `${doctor.name} (${doctor.id})`,
      'Test ordered',
      'standard',
      selectedTest
    );
    onDataChange(updated);
    setToastMessage(`Test ordered: ${selectedTest}`);
    setDuplicateTestAlert(null);
  };

  // Review timeline: scrolls to timeline, expands list if needed, and highlights matching record
  const handleReviewTimeline = () => {
    if (duplicateTestAlert?.matchedRecord?.id) {
      const matchedId = duplicateTestAlert.matchedRecord.id;
      setHighlightedRecordId(matchedId);
      // Automatically switch to "View all" so the highlighted record is visible
      setShowAllDoctorTimeline(true);
      setTimeout(() => {
        const targetCard = document.getElementById(`timeline-card-${matchedId}`);
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          const el = document.getElementById('doctor-timeline-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 60);
    } else {
      const el = document.getElementById('doctor-timeline-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Order anyway: orders despite recent test warning
  const handleOrderAnyway = () => {
    // Re-check access
    const check = verifyAccess(verifiedAccess.patientId, verifiedAccess.pin);
    if (!check.ok) {
      setLockedReason(
        check.reason === 'revoked'
          ? 'The patient revoked access.'
          : 'The access period has expired.'
      );
      setVerifiedAccess(null);
      return;
    }

    const updated = addAuditEvent(
      verifiedAccess.patientId,
      `${doctor.name} (${doctor.id})`,
      'Test ordered',
      'standard',
      `${selectedTest} after reviewing recent result`
    );
    onDataChange(updated);
    setToastMessage(`Test ordered: ${selectedTest}`);
    setDuplicateTestAlert(null);
  };


  // Close Chart Button Handler (returns to gate, does not revoke patient grant)
  const handleCloseChart = () => {
    setVerifiedAccess(null);
    setPatientIdInput('');
    setPinInput('');
    setGateError('');
    resetConsultationForm();
  };

  // Return to lookup from locked screen
  const handleBackToLookup = () => {
    setLockedReason(null);
    setVerifiedAccess(null);
    setPatientIdInput('');
    setPinInput('');
    setGateError('');
    resetConsultationForm();
  };

  // --- SCREEN 1: LOCKED SCREEN (Access ended / revoked / expired) ---
  if (lockedReason) {
    return (
      <div className="white-card doctor-locked-card" role="alert">
        <div className="locked-icon" aria-hidden="true">🔒</div>
        <h2>Access ended</h2>
        <p className="locked-reason-text">{lockedReason}</p>
        <button
          type="button"
          className="back-lookup-btn"
          onClick={handleBackToLookup}
        >
          Back to lookup
        </button>
      </div>
    );
  }

  // --- SCREEN 2: RESTRICTED TRIAGE VIEW (Stage 4 Emergency Break-Glass) ---
  if (emergencyAccessState) {
    const triageData = getTriageData(data, emergencyAccessState.patientId);

    // Format emergency timestamp
    const accessTime = new Date(emergencyAccessState.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return (
      <div className="triage-view-container" role="region" aria-label="Emergency Triage Mode">
        {/* Full-width Persistent Crimson Banner */}
        <div className="triage-top-banner">
          <div className="triage-banner-inner">
            <div className="triage-banner-main">
              <span className="triage-banner-headline">
                🚨 EMERGENCY TRIAGE MODE: RESTRICTED VIEW
              </span>
              <p className="triage-banner-subtext">
                Emergency access recorded for {doctor.name} ({doctor.id}) at {accessTime}. All access is logged for patient review.
              </p>
              <span className="triage-banner-demo-note">
                Simulated break-glass access for hackathon demonstration.
              </span>
            </div>
            <button
              type="button"
              className="triage-close-btn"
              onClick={handleCloseTriage}
            >
              Close triage
            </button>
          </div>
        </div>

        {/* Triage Cards (Restricted Data Only) */}
        <div className="triage-content-grid">
          {/* 1. Allergies (large, at top, clear alert border if allergies exist) */}
          <section
            className={`white-card triage-card triage-allergies-card ${
              triageData?.allergies && triageData.allergies.length > 0 ? 'triage-alert-border' : ''
            }`}
            aria-labelledby="triage-allergies-heading"
          >
            <h3 id="triage-allergies-heading" className="triage-card-title">
              ⚠️ Allergies
            </h3>
            {triageData?.allergies && triageData.allergies.length > 0 ? (
              <ul className="triage-allergy-list">
                {triageData.allergies.map((allergy, idx) => (
                  <li key={idx} className="triage-allergy-item">
                    {allergy}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="triage-empty-text">No known allergies recorded.</p>
            )}
          </section>

          {/* 2. Blood Group (large text) */}
          <section className="white-card triage-card triage-blood-card" aria-labelledby="triage-blood-heading">
            <h3 id="triage-blood-heading" className="triage-card-title">
              🩸 Blood Group
            </h3>
            <div className="triage-blood-value">
              {triageData?.bloodGroup || 'Unknown'}
            </div>
          </section>

          {/* 3. Chronic Conditions (simple list) */}
          <section className="white-card triage-card triage-conditions-card" aria-labelledby="triage-conditions-heading">
            <h3 id="triage-conditions-heading" className="triage-card-title">
              📋 Chronic Conditions
            </h3>
            {triageData?.conditions && triageData.conditions.length > 0 ? (
              <ul className="triage-conditions-list">
                {triageData.conditions.map((condition, idx) => (
                  <li key={idx} className="triage-condition-item">
                    {condition}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="triage-empty-text">No chronic conditions recorded.</p>
            )}
          </section>

          {/* 4. Active Medications (table or list showing name, dose, frequency) */}
          <section className="white-card triage-card triage-medications-card" aria-labelledby="triage-meds-heading">
            <h3 id="triage-meds-heading" className="triage-card-title">
              💊 Active Medications
            </h3>
            {triageData?.activeMedications && triageData.activeMedications.length > 0 ? (
              <div className="triage-table-wrapper">
                <table className="triage-table">
                  <thead>
                    <tr>
                      <th>Medication</th>
                      <th>Dose</th>
                      <th>Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {triageData.activeMedications.map((med, idx) => (
                      <tr key={idx}>
                        <td><strong>{med.name}</strong></td>
                        <td>{med.dose}</td>
                        <td>{med.frequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="triage-empty-text">No active medications recorded.</p>
            )}
          </section>

          {/* Locked section: Full Medical History */}
          <section className="white-card triage-card triage-locked-card" aria-labelledby="triage-locked-heading">
            <div className="triage-locked-header">
              <span className="triage-locked-icon" aria-hidden="true">🔒</span>
              <h3 id="triage-locked-heading" className="triage-card-title">
                Full medical history
              </h3>
            </div>
            <p className="triage-locked-text">
              🔒 Not available in emergency mode. Standard patient authorization is required.
            </p>
            <button
              type="button"
              className="triage-pin-instead-btn"
              onClick={handleCloseTriage}
            >
              Use patient PIN instead
            </button>
          </section>
        </div>
      </div>
    );
  }


  // --- SCREEN 2: ACTIVE CLINICAL CHART (Read-Only) ---
  if (verifiedAccess) {
    const currentGrant = getCurrentGrant(data, verifiedAccess.patientId);
    const expiresAt = currentGrant?.expiresAt;

    // Calculate countdown
    const diffMs = expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0;
    const totalSec = Math.max(0, Math.floor(diffMs / 1000));
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    const countdownString = hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;

    const formattedExpiryTime = expiresAt
      ? new Date(expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';

    // Diagnostic history records: "Lab Report" and "Imaging"
    const diagnosticRecords = (data?.records || []).filter(
      (rec) => rec.type === 'Lab Report' || rec.type === 'Imaging'
    );

    // Full Health Timeline: sorted newest first
    const sortedTimeline = [...(data?.records || [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const activeMeds = (data?.medications || []).filter((m) => m.active);
    const medicationAlerts = checkMedicationAlerts(consultMedName, patient, activeMeds);
    const hasCriticalAlerts = medicationAlerts.some((a) => a.severity === 'critical');

    return (
      <div className="doctor-chart-container">
        {/* Sticky Clinical Header */}
        <header className="doctor-sticky-header">
          <div className="header-clinician-info">
            <strong>{doctor.name}</strong> · {doctor.specialty} · {doctor.id}
          </div>

          <div className="header-countdown-group">
            <div className="header-countdown-badge">
              <span>Access expires in: </span>
              <strong>{countdownString}</strong>
              {formattedExpiryTime && (
                <span className="header-expiry-time">({formattedExpiryTime})</span>
              )}
            </div>

            <button
              type="button"
              className="close-chart-btn"
              onClick={handleCloseChart}
            >
              Close chart
            </button>
          </div>
        </header>

        {/* 1. Allergy Banner: Very top of chart content */}
        <div className="doctor-allergy-banner" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>
            {patient.allergies?.[0] ? `Severe ${patient.allergies[0]}` : 'Severe Penicillin Allergy'}
          </span>
        </div>

        {/* 2. Patient Summary Card */}
        <section className="white-card doctor-section-card" aria-label="Patient Summary">
          <div className="profile-header">
            <div className="profile-avatar" aria-label="Avatar initials">
              RK
            </div>
            <div className="profile-identity">
              <h2>{patient.name}</h2>
              <div className="profile-meta-row">
                <span className="meta-item">
                  Age: <strong>{patient.age}</strong>
                </span>
                <span className="meta-item">
                  Blood Group: <strong>{patient.bloodGroup}</strong>
                </span>
                <span className="meta-item">
                  Patient ID: <span className="id-badge">{patient.id}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="detail-block">
              <label>Emergency Contact</label>
              <div>{patient.emergencyContact}</div>
            </div>
            <div className="detail-block">
              <label>Chronic Conditions</label>
              <div className="conditions-tags">
                {(patient.conditions || []).map((cond, idx) => (
                  <span key={idx} className="condition-pill">
                    {cond}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Active Medications Card */}
        <section className="white-card doctor-section-card" aria-label="Active Medications">
          <h3 className="card-title">Active Medications</h3>
          <div className="medication-list">
            {activeMeds.map((med) => (
              <div key={med.id} className="medication-item">
                <div className="med-info-left">
                  <h4>{med.name}</h4>
                  <div className="med-condition">For {med.condition}</div>
                  {med.prescribedBy && (
                    <div className="med-prescriber">
                      Prescribed by {med.prescribedBy.split(' (')[0] || med.prescribedBy}
                    </div>
                  )}
                </div>
                <div className="med-info-right">
                  <span className="med-dose">{med.dose}</span>
                  <span className="med-frequency">{med.frequency}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Diagnostic History Table */}
        <section className="white-card doctor-section-card" aria-label="Diagnostic History">
          <h3 className="card-title">Diagnostic History</h3>
          <div className="diagnostic-table-wrapper">
            <table className="diagnostic-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Date</th>
                  <th>Facility</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td>
                      <strong>{rec.testName || rec.title}</strong>
                      {rec.testName && rec.title !== rec.testName && (
                        <div className="diagnostic-subtext">{rec.title}</div>
                      )}
                    </td>
                    <td>{formatDateLabel(rec.date)}</td>
                    <td>{rec.facility}</td>
                    <td className="diagnostic-result-cell">
                      {rec.resultValue || 'See report'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4b. Order Test Control (Stage 6) */}
        <section className="white-card doctor-section-card order-test-card" aria-label="Order Test">
          <h3 className="card-title">Order Test</h3>
          <div className="order-test-controls-row">
            <div className="order-test-select-group">
              <label htmlFor="order-test-select" className="order-test-label">Diagnostic Test:</label>
              <select
                id="order-test-select"
                className="order-test-select"
                value={selectedTest}
                onChange={(e) => {
                  setSelectedTest(e.target.value);
                  setDuplicateTestAlert(null);
                }}
              >
                <option value="HbA1c">HbA1c</option>
                <option value="Lipid Profile">Lipid Profile</option>
                <option value="Chest X-Ray">Chest X-Ray</option>
                <option value="Complete Blood Count">Complete Blood Count</option>
              </select>
            </div>

            <button
              type="button"
              className="order-test-btn"
              onClick={handleOrderTestClick}
            >
              Order test
            </button>
          </div>

          {/* Duplicate Test Warning Box */}
          {duplicateTestAlert && (
            <div className="duplicate-test-warning-box" role="alert" title={duplicateTestAlert.message}>
              <div className="alert-header-row">
                <span className="alert-warning-icon" aria-hidden="true">⚠️</span>
                <strong>{duplicateTestAlert.title}</strong>
              </div>
              <p className="alert-message-text">{duplicateTestAlert.message}</p>
              <div className="alert-simulated-label">
                Simulated decision support. Not a complete clinical check.
              </div>

              <div className="duplicate-alert-actions">
                <button
                  type="button"
                  className="review-timeline-btn"
                  onClick={handleReviewTimeline}
                >
                  Review timeline
                </button>
                <button
                  type="button"
                  className="order-anyway-btn"
                  onClick={handleOrderAnyway}
                >
                  Order anyway
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 5. Full Health Timeline */}
        <section id="doctor-timeline-section" className="white-card doctor-section-card" aria-label="Full Health Timeline">
          <h3 className="card-title">Full Health Timeline</h3>
          <div id="doctor-timeline-list" className="timeline-list">
            {(showAllDoctorTimeline ? sortedTimeline : sortedTimeline.slice(0, 3)).map((rec) => {
              const isExpanded = expandedTimelineId === rec.id;
              const isHighlighted = highlightedRecordId === rec.id;
              return (
                <article
                  key={rec.id}
                  id={`timeline-card-${rec.id}`}
                  className={`timeline-card ${isHighlighted ? 'timeline-card-highlighted' : ''}`}
                >
                  <button
                    type="button"
                    className="timeline-header-btn"
                    onClick={() =>
                      setExpandedTimelineId((prev) => (prev === rec.id ? null : rec.id))
                    }
                    aria-expanded={isExpanded}
                  >
                    <div className="timeline-meta-row">
                      <div className="timeline-badge-group">
                        <span className="type-pill">{rec.type}</span>
                        <span>{rec.facility}</span>
                      </div>
                      <span className="timeline-date-label">
                        {formatDateLabel(rec.date)}
                      </span>
                    </div>

                    <div className="timeline-title-row">
                      <h4>{rec.title}</h4>
                      <span className="expand-chevron" aria-hidden="true">
                        {isExpanded ? '▲ Hide' : '▼ Expand'}
                      </span>
                    </div>

                    {rec.source === 'doctor' && (
                      <div className="timeline-doctor-stamp">
                        Added by {rec.clinician || 'Dr. Sarah Jenkins (MD-8821)'} at{' '}
                        {new Date(rec.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}

                    {rec.source === 'patient' && (
                      <div className="timeline-patient-stamp">
                        Added by patient (simulated upload)
                      </div>
                    )}

                    <p className="timeline-summary">{rec.summary}</p>
                  </button>

                  {isExpanded && (
                    <div className="timeline-preview-drawer">
                      <DocumentPreview
                        record={rec}
                        patient={patient}
                        doctor={doctor}
                        formatDateLabel={formatDateLabel}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {sortedTimeline.length > 3 && (
            <div className="timeline-toggle-wrapper">
              <button
                type="button"
                className="view-all-records-btn"
                onClick={() => {
                  if (showAllDoctorTimeline) {
                    setShowAllDoctorTimeline(false);
                    const el = document.getElementById('doctor-timeline-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setShowAllDoctorTimeline(true);
                  }
                }}
                aria-expanded={showAllDoctorTimeline}
                aria-controls="doctor-timeline-list"
                aria-label={showAllDoctorTimeline ? 'Show less records' : `View all records (${sortedTimeline.length})`}
              >
                {showAllDoctorTimeline ? 'Show less' : `View all records (${sortedTimeline.length})`}
              </button>
            </div>
          )}
        </section>

        {/* 6. Consultation Pad (Stage 5 Functional Form) */}
        <section className="white-card doctor-section-card consultation-pad-card" aria-labelledby="consultation-heading">
          <div className="consultation-header">
            <h3 id="consultation-heading" className="card-title">
              Consultation Pad
            </h3>
            <div className="doctor-stamp-line">
              Recording as <strong>{doctor.name} ({doctor.id})</strong>
            </div>
          </div>

          <form onSubmit={handleSaveConsultation} className="consultation-form" noValidate>
            {/* Diagnosis Field */}
            <div className="consult-field-group">
              <label htmlFor="consult-diagnosis-input" className="consult-label">
                Diagnosis <span className="required-star">*</span>
              </label>
              <input
                id="consult-diagnosis-input"
                type="text"
                maxLength={100}
                className={`consult-input ${consultTouched && consultErrors.diagnosis ? 'input-error' : ''}`}
                placeholder="e.g. Essential Hypertension"
                value={consultDiagnosis}
                onChange={(e) => {
                  setConsultDiagnosis(e.target.value);
                  if (consultErrors.diagnosis) {
                    setConsultErrors((prev) => ({ ...prev, diagnosis: undefined }));
                  }
                }}
                aria-invalid={Boolean(consultTouched && consultErrors.diagnosis)}
                aria-describedby={consultTouched && consultErrors.diagnosis ? 'diagnosis-error' : undefined}
              />
              {consultTouched && consultErrors.diagnosis && (
                <div id="diagnosis-error" className="consult-error-msg" role="alert">
                  {consultErrors.diagnosis}
                </div>
              )}
            </div>

            {/* Notes Field */}
            <div className="consult-field-group">
              <div className="label-with-counter">
                <label htmlFor="consult-notes-input" className="consult-label">
                  Clinical Notes (optional)
                </label>
                <span className="char-counter">{consultNotes.length}/500</span>
              </div>
              <textarea
                id="consult-notes-input"
                rows={3}
                maxLength={500}
                className="consult-textarea"
                placeholder="Enter consultation notes, symptoms, treatment plan..."
                value={consultNotes}
                onChange={(e) => setConsultNotes(e.target.value)}
              />
            </div>

            {/* Prescription (optional) Subsection */}
            <div className="prescription-subsection">
              <div className="rx-section-header">
                <span className="rx-section-title">Prescription (optional)</span>
                <span className="rx-helper-line">Fill all three or leave all three empty.</span>
              </div>

              <div className="prescription-inputs-grid">
                <div className="rx-field">
                  <label htmlFor="consult-med-input" className="consult-sublabel">
                    Medication
                  </label>
                  <input
                    id="consult-med-input"
                    type="text"
                    maxLength={50}
                    className={`consult-input ${
                      hasCriticalAlerts
                        ? 'input-alert'
                        : consultTouched && consultErrors.prescription
                        ? 'input-error'
                        : ''
                    }`}
                    placeholder="e.g. Amlodipine"
                    value={consultMedName}
                    onChange={(e) => {
                      setConsultMedName(e.target.value);
                      setAlertsAcknowledged(false);
                      if (consultErrors.prescription) {
                        setConsultErrors((prev) => ({ ...prev, prescription: undefined }));
                      }
                    }}
                  />

                  {/* Stage 6: Medication Clinical Alerts (Live) */}
                  {medicationAlerts.length > 0 && (
                    <div className="medication-alerts-container">
                      {medicationAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="clinical-alert-box"
                          role="alert"
                          title={alert.message}
                        >
                          <div className="alert-header-row">
                            <span className="alert-warning-icon" aria-hidden="true">⚠️</span>
                            <strong>{alert.title}</strong>
                          </div>
                          <p className="alert-message-text">{alert.message}</p>
                          <div className="alert-simulated-label">
                            Simulated decision support. Not a complete clinical check.
                          </div>
                        </div>
                      ))}

                      {hasCriticalAlerts && (
                        <label className="alert-ack-checkbox-label">
                          <input
                            type="checkbox"
                            checked={alertsAcknowledged}
                            onChange={(e) => setAlertsAcknowledged(e.target.checked)}
                          />
                          <span>I have reviewed this warning and want to continue.</span>
                        </label>
                      )}
                    </div>
                  )}
                </div>

                <div className="rx-field">
                  <label htmlFor="consult-dose-input" className="consult-sublabel">
                    Dose
                  </label>
                  <input
                    id="consult-dose-input"
                    type="text"
                    maxLength={50}
                    className={`consult-input ${consultTouched && consultErrors.prescription ? 'input-error' : ''}`}
                    placeholder="500mg"
                    value={consultMedDose}
                    onChange={(e) => {
                      setConsultMedDose(e.target.value);
                      if (consultErrors.prescription) {
                        setConsultErrors((prev) => ({ ...prev, prescription: undefined }));
                      }
                    }}
                  />
                </div>

                <div className="rx-field">
                  <label htmlFor="consult-freq-input" className="consult-sublabel">
                    Frequency
                  </label>
                  <input
                    id="consult-freq-input"
                    type="text"
                    maxLength={50}
                    className={`consult-input ${consultTouched && consultErrors.prescription ? 'input-error' : ''}`}
                    placeholder="Twice daily"
                    value={consultMedFreq}
                    onChange={(e) => {
                      setConsultMedFreq(e.target.value);
                      if (consultErrors.prescription) {
                        setConsultErrors((prev) => ({ ...prev, prescription: undefined }));
                      }
                    }}
                  />
                </div>
              </div>

              {consultTouched && consultErrors.prescription && (
                <div className="consult-error-msg" role="alert">
                  {consultErrors.prescription}
                </div>
              )}
            </div>

            {consultErrors.form && (
              <div className="consult-error-msg" role="alert">
                {consultErrors.form}
              </div>
            )}

            {/* Save Button */}
            <button
              type="submit"
              className="consult-save-btn"
              disabled={
                isSavingConsult ||
                (consultTouched && Object.keys(consultErrors).some((k) => consultErrors[k])) ||
                (hasCriticalAlerts && !alertsAcknowledged)
              }
            >
              {isSavingConsult ? 'Saving to Timeline...' : 'Save to Patient Timeline'}
            </button>
          </form>
        </section>

        {/* Fresh Mint Toast Notification */}
        {toastMessage && (
          <div className="mint-toast" role="status" aria-live="polite">
            <span className="toast-icon" aria-hidden="true">✓</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // --- SCREEN 3: DOCTOR LOOKUP GATE (Default Initial Screen) ---
  return (
    <div className="doctor-gate-wrapper">
      <div className="white-card doctor-gate-card">
        {/* Doctor Clinician Profile Badge */}
        <div className="doctor-profile-badge">
          <div className="doctor-avatar" aria-hidden="true">🩺</div>
          <div className="doctor-profile-text">
            <h3>{doctor.name}</h3>
            <p>
              {doctor.specialty} · ID: <strong>{doctor.id}</strong>
            </p>
            <span className="doctor-hospital-name">{doctor.hospital}</span>
          </div>
        </div>

        <h2 className="gate-heading">Clinical Chart Lookup</h2>
        <p className="gate-subtext">
          Enter patient credentials to request time-limited clinical chart examination.
        </p>

        {/* Lookup Form */}
        <form onSubmit={handleAccessSubmit} className="gate-form">
          <div className="gate-field-group">
            <label htmlFor="patient-id-input">Patient ID</label>
            <input
              id="patient-id-input"
              type="text"
              className="gate-input"
              placeholder="e.g. PID-12345"
              value={patientIdInput}
              onChange={handlePatientIdChange}
              autoComplete="off"
            />
          </div>

          <div className="gate-field-group">
            <label htmlFor="patient-pin-input">4-Digit PIN</label>
            <input
              id="patient-pin-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="gate-input"
              placeholder="••••"
              value={pinInput}
              onChange={handlePinChange}
              autoComplete="off"
            />
          </div>

          {/* Gate Error Message */}
          {gateError && (
            <div className="gate-error-message" role="alert">
              <span aria-hidden="true">⚠️</span>
              <span>{gateError}</span>
            </div>
          )}

          {/* Lockout Warning */}
          {lockoutSeconds > 0 && (
            <div className="gate-lockout-message" role="alert">
              Too many attempts. Try again in {lockoutSeconds} seconds.
            </div>
          )}

          {/* Access Button */}
          <button
            type="submit"
            className="gate-access-btn"
            disabled={lockoutSeconds > 0}
          >
            Access Patient Chart
          </button>
        </form>

        <div className="gate-divider" />

        {/* Emergency Triage Override Button */}
        <button
          type="button"
          className="gate-emergency-btn"
          onClick={handleEmergencyClick}
        >
          🚨 Emergency Triage Override (Bypass PIN)
        </button>

        {/* Emergency Confirmation Modal */}
        {emergencyModalOpen && (
          <div
            className="emergency-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-modal-title"
          >
            <div className="emergency-modal-card">
              <div className="emergency-modal-header">
                <span className="emergency-modal-icon" aria-hidden="true">🚨</span>
                <h3 id="emergency-modal-title">Emergency Triage Override</h3>
              </div>

              <p className="emergency-modal-desc">
                This grants immediate read-only access to vital emergency data only (allergies, blood group, conditions, medications).
              </p>

              <div className="emergency-modal-notice">
                Every emergency access is permanently recorded in the patient&apos;s audit log with your name, clinician ID, time, and stated reason.
              </div>

              <div className="emergency-form-field">
                <label htmlFor="emergency-reason-select" className="emergency-field-label">
                  Reason for emergency override:
                </label>
                <select
                  id="emergency-reason-select"
                  className="emergency-select"
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                >
                  <option value="">-- Select a reason --</option>
                  <option value="Patient unconscious or unable to speak">
                    Patient unconscious or unable to speak
                  </option>
                  <option value="Life-threatening emergency">
                    Life-threatening emergency
                  </option>
                  <option value="Unknown medical history">
                    Unknown medical history
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {emergencyReason === 'Other' && (
                <div className="emergency-form-field">
                  <label htmlFor="emergency-other-input" className="emergency-field-label">
                    Specify reason (required, max 100 characters):
                  </label>
                  <input
                    id="emergency-other-input"
                    type="text"
                    maxLength={100}
                    className="emergency-other-input"
                    placeholder="Enter reason..."
                    value={emergencyOtherText}
                    onChange={(e) => setEmergencyOtherText(e.target.value)}
                  />
                  <div className="emergency-char-limit">
                    {emergencyOtherText.length}/100 characters
                  </div>
                </div>
              )}

              <div className="emergency-modal-actions">
                <button
                  type="button"
                  className="emergency-cancel-btn"
                  onClick={handleCancelEmergency}
                  disabled={isSubmittingEmergency}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="emergency-confirm-btn"
                  onClick={handleConfirmEmergency}
                  disabled={isConfirmDisabled}
                >
                  {isSubmittingEmergency ? 'Accessing...' : 'Confirm Emergency Access'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Future Scope Label */}
        <div className="gate-future-scope">
          <span>Biometric Lookup (Future Scope)</span>
        </div>

        <div className="gate-footer-note">
          Simulated demo. Fictional data only.
        </div>
      </div>
    </div>
  );
}
