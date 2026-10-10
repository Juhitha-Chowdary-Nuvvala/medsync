import React, { useState } from 'react';

/**
 * DocumentPreview Component (Stage 7)
 * Renders realistic-looking paper-style simulated medical documents for timeline records.
 * HTML and CSS only. Reads details dynamically from record data.
 * Phone-friendly with zero horizontal page scrolling.
 * Supports: Prescription, Lab Report, Visit Note, Discharge Summary, Imaging,
 * and a simple clinical note layout for patient-added or any other record types.
 */
export default function DocumentPreview({ record, patient, doctor, formatDateLabel }) {
  const [imageError, setImageError] = useState(false);
  if (!record) return null;

  const patientName = patient?.name || 'Ramesh Kumar';
  const patientId = patient?.id || 'PID-12345';
  const facilityName = record.facility || 'City General Hospital';
  const formattedDate = formatDateLabel ? formatDateLabel(record.date) : record.date;
  const doctorName = doctor?.name || 'Dr. Sarah Jenkins';
  const doctorId = doctor?.id || 'MD-8821';

  // Clinician label
  const clinicianLabel =
    record.clinician ||
    (record.doctorName ? `${record.doctorName} (${record.doctorId || doctorId})` : `${doctorName} (${doctorId})`);

  // --- 1. Prescription Document ---
  if (record.type === 'Prescription') {
    // Resolve medicine lines:
    // (1) Saved from consultation (array of prescription items)
    // (2) Direct medication/dose/frequency fields on record
    // (3) Seeded record (extracted from summary/title)
    // (4) Patient-added prescription
    let medicineLines = [];

    if (Array.isArray(record.prescription) && record.prescription.length > 0) {
      medicineLines = record.prescription.map((item) => ({
        name: item.name || item.medication || record.title,
        dose: item.dose || 'As directed',
        frequency: item.frequency || 'Daily'
      }));
    } else if (record.medication) {
      medicineLines = [
        {
          name: record.medication,
          dose: record.dose || 'As directed',
          frequency: record.frequency || 'Daily'
        }
      ];
    } else if (record.summary?.toLowerCase().includes('amlodipine') || record.title?.toLowerCase().includes('hypertension')) {
      // Seeded prescription record (rec-2)
      medicineLines = [
        {
          name: 'Amlodipine Besylate',
          dose: '5mg',
          frequency: 'Once daily (morning)'
        }
      ];
    } else {
      // Generic or patient-added prescription
      medicineLines = [
        {
          name: record.title || 'Prescribed Medication',
          dose: record.dose || 'As specified in summary',
          frequency: record.frequency || 'As directed'
        }
      ];
    }

    return (
      <div className="simulated-doc prescription-doc">
        {/* Label: SIMULATED DOCUMENT - FICTIONAL DATA */}
        <div className="doc-simulated-tag">SIMULATED DOCUMENT - FICTIONAL DATA</div>

        {/* Hospital Header */}
        <div className="doc-header">
          <div className="doc-hospital-name">{facilityName}</div>
          <div className="doc-dept">Department of Internal Medicine & Outpatient Pharmacy</div>
        </div>

        {/* Doctor and Patient Details */}
        <div className="doc-meta-grid">
          <div>
            <span className="doc-meta-label">Patient:</span>
            <strong>{patientName}</strong> ({patientId})
          </div>
          <div>
            <span className="doc-meta-label">Date:</span>
            <span>{formattedDate}</span>
          </div>
          <div>
            <span className="doc-meta-label">Doctor:</span>
            <span>{clinicianLabel}</span>
          </div>
          <div>
            <span className="doc-meta-label">Rx Ref:</span>
            <span>RX-{record.id?.toUpperCase() || 'REF'}</span>
          </div>
        </div>

        {/* Rx Symbol and Medicine Lines */}
        <div className="rx-body">
          <div className="rx-symbol" aria-hidden="true">℞</div>
          <div className="rx-content">
            <h4 className="rx-title">{record.title}</h4>

            {/* Medicine Lines (name, dose, frequency) */}
            <div className="rx-medicine-box">
              <div className="rx-medicine-header">Prescribed Medication</div>
              {medicineLines.map((line, idx) => (
                <div key={idx} className="rx-medicine-row">
                  <span className="rx-med-name"><strong>{line.name}</strong></span>
                  <span className="rx-med-dose">{line.dose}</span>
                  <span className="rx-med-freq">{line.frequency}</span>
                </div>
              ))}
            </div>

            <p className="rx-summary">{record.summary}</p>
            {record.documentPreview && record.documentPreview !== record.summary && (
              <div className="rx-details">
                {record.documentPreview}
              </div>
            )}
          </div>
        </div>

        {/* Fake Signature Line */}
        <div className="doc-footer">
          <div className="doc-stamp">OFFICIAL PRESCRIPTION</div>
          <div className="doc-signature-block">
            <div className="signature-line" />
            <div className="signature-name">{clinicianLabel.split(' (')[0]}, MD</div>
            <div className="signature-title">Authorized Prescriber Signature</div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. Lab Report Document ---
  if (record.type === 'Lab Report') {
    const testTitle = record.testName || record.title || 'Laboratory Investigation';
    const lowerTest = (testTitle + ' ' + (record.title || '') + ' ' + (record.summary || '')).toLowerCase();

    // Reference range rules per Stage 7 spec:
    // HbA1c 4.0 to 5.6%, Total Cholesterol under 200 mg/dL. For other tests "See lab".
    // If a result value is missing, show "See summary".
    let refRange = 'See lab';
    if (lowerTest.includes('hba1c')) {
      refRange = '4.0 to 5.6%';
    } else if (lowerTest.includes('lipid') || lowerTest.includes('cholesterol')) {
      refRange = 'under 200 mg/dL';
    }

    const resultDisplay = record.resultValue ? record.resultValue : 'See summary';
    const isHbA1c = lowerTest.includes('hba1c');
    const isLipid = lowerTest.includes('lipid') || lowerTest.includes('cholesterol');

    return (
      <div className="simulated-doc lab-report-doc">
        {/* Label: SIMULATED DOCUMENT - FICTIONAL DATA */}
        <div className="doc-simulated-tag">SIMULATED DOCUMENT - FICTIONAL DATA</div>

        {/* Lab Header */}
        <div className="doc-header">
          <div className="doc-hospital-name">{facilityName}</div>
          <div className="doc-dept">Clinical Pathology & Diagnostic Biochemistry</div>
        </div>

        {/* Patient Details & Date */}
        <div className="doc-meta-grid">
          <div>
            <span className="doc-meta-label">Patient:</span>
            <strong>{patientName}</strong> ({patientId})
          </div>
          <div>
            <span className="doc-meta-label">Date:</span>
            <span>{formattedDate}</span>
          </div>
          <div>
            <span className="doc-meta-label">Test:</span>
            <span>{testTitle}</span>
          </div>
          <div>
            <span className="doc-meta-label">Status:</span>
            <span className="lab-status-badge">Final / Verified</span>
          </div>
        </div>

        {/* Small Table: Test | Result | Reference Range */}
        <div className="lab-table-wrapper">
          <table className="lab-table">
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col">Result</th>
                <th scope="col">Reference Range</th>
              </tr>
            </thead>
            <tbody>
              {/* Seeded HbA1c Record */}
              {isHbA1c && record.id === 'rec-1' ? (
                <>
                  <tr>
                    <td><strong>HbA1c (Glycated Hemoglobin)</strong></td>
                    <td className="lab-result-highlight">7.2%</td>
                    <td>4.0 to 5.6%</td>
                  </tr>
                  <tr>
                    <td>Estimated Average Glucose (eAG)</td>
                    <td>160 mg/dL</td>
                    <td>70 to 126 mg/dL</td>
                  </tr>
                  <tr>
                    <td>Fasting Plasma Glucose</td>
                    <td>142 mg/dL</td>
                    <td>70 to 99 mg/dL</td>
                  </tr>
                </>
              ) : isLipid && record.id === 'rec-5' ? (
                /* Seeded Lipid Record */
                <>
                  <tr>
                    <td><strong>Total Cholesterol</strong></td>
                    <td className="lab-result-highlight">180 mg/dL</td>
                    <td>under 200 mg/dL</td>
                  </tr>
                  <tr>
                    <td>Triglycerides</td>
                    <td>145 mg/dL</td>
                    <td>under 150 mg/dL</td>
                  </tr>
                  <tr>
                    <td>HDL Cholesterol</td>
                    <td>46 mg/dL</td>
                    <td>40 to 60 mg/dL</td>
                  </tr>
                  <tr>
                    <td>LDL Cholesterol (Calculated)</td>
                    <td>98 mg/dL</td>
                    <td>under 100 mg/dL</td>
                  </tr>
                </>
              ) : (
                /* Dynamic Table for patient-added or ordered Lab Reports */
                <tr>
                  <td><strong>{testTitle}</strong></td>
                  <td className="lab-result-highlight">{resultDisplay}</td>
                  <td>{refRange}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary text */}
        <div className="lab-clinical-note">
          <span className="doc-meta-label">Summary / Notes:</span>
          <p>{record.summary}</p>
        </div>

        {record.documentPreview && record.documentPreview !== record.summary && (
          <div className="lab-clinical-note">
            <span className="doc-meta-label">Laboratory Remarks:</span>
            <p>{record.documentPreview}</p>
          </div>
        )}

        {/* Lab Director Stamp */}
        <div className="doc-footer">
          <div className="doc-stamp">AUTOMATED CLINICAL LAB RESULT</div>
          <div className="doc-signature-block">
            <div className="signature-line" />
            <div className="signature-name">Dr. N. Mehta, Pathologist</div>
            <div className="signature-title">Verified Laboratory Director</div>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. Imaging (Chest X-Ray / Diagnostic Scans) ---
  if (record.type === 'Imaging') {
    return (
      <div className="simulated-doc imaging-doc">
        {/* Label: SIMULATED DOCUMENT - FICTIONAL DATA */}
        <div className="doc-simulated-tag">SIMULATED DOCUMENT - FICTIONAL DATA</div>

        {/* Imaging Facility Header */}
        <div className="doc-header">
          <div className="doc-hospital-name">{facilityName}</div>
          <div className="doc-dept">Diagnostic Radiology & Medical Imaging</div>
        </div>

        {/* Metadata */}
        <div className="doc-meta-grid">
          <div>
            <span className="doc-meta-label">Patient:</span>
            <strong>{patientName}</strong> ({patientId})
          </div>
          <div>
            <span className="doc-meta-label">Date:</span>
            <span>{formattedDate}</span>
          </div>
          <div>
            <span className="doc-meta-label">Study:</span>
            <span>{record.title}</span>
          </div>
          <div>
            <span className="doc-meta-label">Modality:</span>
            <span>Digital Plain Radiography</span>
          </div>
        </div>

        {/* Scan Viewer: real image for Chest X-Ray or fallback / placeholder for others */}
        {(() => {
          const isChest = (record.title || '').toLowerCase().includes('chest');

          if (isChest && !imageError) {
            return (
              <div className="xray-scan-viewer" role="img" aria-label="Sample chest X-ray image (simulated, fictional patient)">
                <div className="xray-header-markers">
                  <span>R (RIGHT)</span>
                  <span>PA CHEST RADIOGRAM</span>
                  <span>ID: {patientId}</span>
                </div>

                <div className="xray-image-container">
                  <img
                    src="/images/chest-xray.jpg"
                    alt="Sample chest X-ray image (simulated, fictional patient)"
                    loading="lazy"
                    onError={() => setImageError(true)}
                    className="xray-real-image"
                  />
                </div>

                <div className="xray-footer-markers">
                  <span>PA CHEST RADIOGRAM</span>
                  <span>ID: {patientId} · SIMULATED</span>
                </div>
              </div>
            );
          }

          if (isChest && imageError) {
            return (
              <div className="xray-scan-viewer" role="img" aria-label="Image unavailable">
                <div className="xray-header-markers">
                  <span>R (RIGHT)</span>
                  <span>PA CHEST RADIOGRAM</span>
                  <span>ID: {patientId}</span>
                </div>

                <div className="xray-fallback-box">
                  <span>Image unavailable</span>
                </div>

                <div className="xray-footer-markers">
                  <span>PA CHEST RADIOGRAM</span>
                  <span>ID: {patientId} · SIMULATED</span>
                </div>
              </div>
            );
          }

          // Other Imaging records keep the existing placeholder SVG
          return (
            <div className="xray-scan-viewer" role="img" aria-label="Simulated scan image">
              <div className="xray-header-markers">
                <span>R (RIGHT)</span>
                <span>DIAGNOSTIC RADIOGRAM</span>
                <span>ID: {patientId}</span>
              </div>

              <div className="xray-svg-container">
                <svg
                  viewBox="0 0 280 200"
                  className="xray-svg"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  {/* Spine outline */}
                  <line x1="140" y1="20" x2="140" y2="185" stroke="rgba(255,255,255,0.4)" strokeWidth="7" strokeDasharray="6 3" />

                  {/* Clavicles */}
                  <path d="M 60 42 Q 100 34 135 44" stroke="rgba(255,255,255,0.55)" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 220 42 Q 180 34 145 44" stroke="rgba(255,255,255,0.55)" strokeWidth="4" strokeLinecap="round" />

                  {/* Right lung field */}
                  <path
                    d="M 130 52 C 90 52 65 78 60 122 C 58 152 90 167 130 162 Z"
                    fill="rgba(56, 189, 248, 0.09)"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="2.5"
                  />

                  {/* Left lung field with cardiac notch */}
                  <path
                    d="M 150 52 C 190 52 215 78 220 122 C 222 152 190 167 165 162 C 150 142 148 102 150 52 Z"
                    fill="rgba(56, 189, 248, 0.09)"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="2.5"
                  />

                  {/* Cardiac silhouette */}
                  <path
                    d="M 135 96 C 130 126 125 156 160 156 C 175 156 180 136 170 116 C 160 96 145 92 135 96 Z"
                    fill="rgba(255,255,255,0.2)"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="1.5"
                  />

                  {/* Rib pairs */}
                  <path d="M 70 72 Q 105 82 135 77" stroke="rgba(255,255,255,0.32)" strokeWidth="2.5" />
                  <path d="M 210 72 Q 175 82 145 77" stroke="rgba(255,255,255,0.32)" strokeWidth="2.5" />

                  <path d="M 65 97 Q 105 107 135 102" stroke="rgba(255,255,255,0.32)" strokeWidth="2.5" />
                  <path d="M 215 97 Q 175 107 145 102" stroke="rgba(255,255,255,0.32)" strokeWidth="2.5" />

                  <path d="M 68 122 Q 105 132 135 127" stroke="rgba(255,255,255,0.32)" strokeWidth="2.5" />
                  <path d="M 212 122 Q 175 132 155 127" stroke="rgba(255,255,255,0.32)" strokeWidth="2.5" />
                </svg>
              </div>

              <div className="xray-footer-markers">
                <span>WINDOW: LUNG / MEDIASTINUM</span>
                <span>TECH: KV 120 / MAS 4</span>
              </div>
            </div>
          );
        })()}

        {/* Report Text Below the Scan */}
        <div className="xray-report-body">
          <div className="xray-section">
            <span className="doc-meta-label">Summary / Impression:</span>
            <p className="xray-text">{record.summary}</p>
          </div>
          {record.documentPreview && record.documentPreview !== record.summary && (
            <div className="xray-section">
              <span className="doc-meta-label">Radiologist Findings:</span>
              <p className="xray-text">{record.documentPreview}</p>
            </div>
          )}
        </div>

        <div className="doc-footer">
          <div className="doc-stamp">DIAGNOSTIC RADIOLOGY REPORT</div>
          <div className="doc-signature-block">
            <div className="signature-line" />
            <div className="signature-name">Dr. R. Kapoor, Radiologist</div>
            <div className="signature-title">Diagnostic Imaging Division</div>
          </div>
        </div>
      </div>
    );
  }

  // --- 4. Visit Note, Discharge Summary & Simple Clinical Note Fallback ---
  // (Handles Visit Note, Discharge Summary, and any other or patient-added types)
  const isDischarge = record.type === 'Discharge Summary';
  const bottomSigner = record.clinician || facilityName;

  return (
    <div className="simulated-doc clinical-note-doc">
      {/* Label: SIMULATED DOCUMENT - FICTIONAL DATA */}
      <div className="doc-simulated-tag">SIMULATED DOCUMENT - FICTIONAL DATA</div>

      {/* Header */}
      <div className="doc-header">
        <div className="doc-hospital-name">{facilityName}</div>
        <div className="doc-dept">
          {isDischarge ? 'Inpatient Discharge Documentation' : `${record.type} · Clinical Documentation`}
        </div>
      </div>

      {/* Patient Details */}
      <div className="doc-meta-grid">
        <div>
          <span className="doc-meta-label">Patient:</span>
          <strong>{patientName}</strong> ({patientId})
        </div>
        <div>
          <span className="doc-meta-label">Date:</span>
          <span>{formattedDate}</span>
        </div>
        <div>
          <span className="doc-meta-label">Document:</span>
          <span>{record.type}</span>
        </div>
        <div>
          <span className="doc-meta-label">Subject:</span>
          <span>{record.title}</span>
        </div>
      </div>

      {/* Summary Text and Narrative */}
      <div className="clinical-note-body">
        <div className="clinical-section">
          <span className="doc-meta-label">Summary:</span>
          <p className="clinical-summary">{record.summary}</p>
        </div>

        {record.documentPreview && record.documentPreview !== record.summary && (
          <div className="clinical-section">
            <span className="doc-meta-label">Clinical Narrative:</span>
            <div className="clinical-text">
              {record.documentPreview}
            </div>
          </div>
        )}
      </div>

      {/* Clinician Name or Facility at the bottom */}
      <div className="doc-footer">
        <div className="doc-stamp">{isDischarge ? 'DISCHARGE DOCUMENT' : 'CLINICAL RECORD'}</div>
        <div className="doc-signature-block">
          <div className="signature-line" />
          <div className="signature-name">{bottomSigner}</div>
          <div className="signature-title">{facilityName}</div>
        </div>
      </div>
    </div>
  );
}
