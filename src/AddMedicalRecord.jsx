import React, { useState, useRef, useEffect } from 'react';
import { addPatientRecord } from './patientRecords.js';

/**
 * AddMedicalRecord Component (Stage 7)
 * Simulated medical record upload form in Patient Portal.
 * Features validation, live character counter, phone-friendly layout,
 * and double-click deduplication.
 */
export default function AddMedicalRecord({ patient, onRecordAdded }) {
  // Collapsible toggle state (collapsed by default)
  const [isExpanded, setIsExpanded] = useState(false);
  const firstFieldRef = useRef(null);

  // Form fields state
  const [type, setType] = useState('Lab Report');
  const [dateStr, setDateStr] = useState('');
  const [facility, setFacility] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [resultValue, setResultValue] = useState('');

  // UI state
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Today and 10-years-ago date bounds for date picker and validation
  const now = new Date();
  const formatYmd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayYmd = formatYmd(now);
  const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
  const tenYearsAgoYmd = formatYmd(tenYearsAgo);

  // Field validation helpers
  const getFacilityError = () => {
    const trimmed = facility.trim();
    if (!trimmed) return 'Provider or facility is required.';
    if (trimmed.length > 60) return 'Maximum 60 characters allowed.';
    return null;
  };

  const getTitleError = () => {
    const trimmed = title.trim();
    if (!trimmed) return 'Title is required.';
    if (trimmed.length > 80) return 'Maximum 80 characters allowed.';
    return null;
  };

  const getSummaryError = () => {
    const trimmed = summary.trim();
    if (!trimmed) return 'Summary is required.';
    if (trimmed.length > 300) return 'Maximum 300 characters allowed.';
    return null;
  };

  const getResultError = () => {
    if (type !== 'Lab Report') return null;
    const trimmed = resultValue.trim();
    if (trimmed.length > 60) return 'Maximum 60 characters allowed.';
    return null;
  };

  const getDateError = () => {
    if (!dateStr || !dateStr.trim()) {
      return 'Date is required.';
    }
    const parts = dateStr.trim().split('-');
    if (parts.length !== 3) {
      return 'Please enter a valid date.';
    }
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (isNaN(y) || isNaN(m) || isNaN(d)) {
      return 'Please enter a valid date.';
    }

    const picked = new Date(y, m - 1, d, 12, 0, 0, 0);
    if (isNaN(picked.getTime())) {
      return 'Please enter a valid date.';
    }

    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (picked.getTime() > todayEnd.getTime()) {
      return 'Date cannot be in the future.';
    }

    const tenYearsAgoStart = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    if (picked.getTime() < tenYearsAgoStart.getTime()) {
      return 'Date cannot be older than 10 years.';
    }

    return null;
  };

  // Move focus to first field when expanded
  useEffect(() => {
    if (isExpanded && firstFieldRef.current) {
      firstFieldRef.current.focus();
    }
  }, [isExpanded]);

  const facilityError = getFacilityError();
  const titleError = getTitleError();
  const summaryError = getSummaryError();
  const resultError = getResultError();
  const dateError = getDateError();

  const isFormValid = !facilityError && !titleError && !summaryError && !resultError && !dateError;

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const resetForm = () => {
    setType('Lab Report');
    setDateStr('');
    setFacility('');
    setTitle('');
    setSummary('');
    setResultValue('');
    setTouched({});
    setIsSubmitting(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Mark all as touched to display errors if any
    setTouched({
      facility: true,
      title: true,
      summary: true,
      resultValue: true,
      date: true
    });

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = addPatientRecord({
        patientId: patient?.id || 'PID-12345',
        type,
        dateStr,
        facility,
        title,
        summary,
        resultValue
      });

      if (result.ok) {
        resetForm();
        setIsExpanded(false); // Collapses automatically after save
        if (onRecordAdded) {
          onRecordAdded(result.data, 'Record added to your timeline');
        }
      } else {
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Failed to add record:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <section className={`white-card add-record-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`} aria-labelledby="add-record-heading">
      {/* Collapsible Bar Header */}
      <div
        className="add-record-bar"
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        aria-expanded={isExpanded}
        aria-controls="add-record-form-panel"
      >
        <div className="add-record-bar-left">
          <h2 id="add-record-heading" className="card-title add-record-bar-title">
            Add Medical Record
          </h2>
          {!isExpanded && (
            <span className="add-record-collapsed-hint">Simulated upload</span>
          )}
        </div>

        <button
          type="button"
          className="add-record-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          aria-expanded={isExpanded}
          aria-controls="add-record-form-panel"
          aria-label={isExpanded ? 'Close add record form' : 'Open add record form'}
        >
          <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
        </button>
      </div>

      {isExpanded && (
        <div id="add-record-form-panel" className="add-record-expanded-content">
          <div className="add-record-header">
            {/* Always visible simulated upload label inside expanded form */}
            <span className="simulated-upload-badge" aria-label="Disclaimer">
              Simulated upload. No real file is stored.
            </span>
          </div>

          <form className="add-record-form" onSubmit={handleSubmit} noValidate>
            {/* 1. Record Type */}
            <div className="form-group">
              <label htmlFor="record-type" className="form-label">
                Record Type <span className="required-mark">*</span>
              </label>
              <select
                id="record-type"
                ref={firstFieldRef}
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
            <option value="Lab Report">Lab Report</option>
            <option value="Prescription">Prescription</option>
            <option value="Visit Note">Visit Note</option>
            <option value="Imaging">Imaging</option>
            <option value="Discharge Summary">Discharge Summary</option>
          </select>
        </div>

        {/* 2. Date */}
        <div className="form-group">
          <label htmlFor="record-date" className="form-label">
            Date <span className="required-mark">*</span>
          </label>
          <input
            id="record-date"
            type="date"
            className={`form-input ${touched.date && dateError ? 'input-error' : ''}`}
            value={dateStr}
            max={todayYmd}
            min={tenYearsAgoYmd}
            onChange={(e) => setDateStr(e.target.value)}
            onBlur={() => handleBlur('date')}
            aria-invalid={Boolean(touched.date && dateError)}
            aria-describedby={touched.date && dateError ? 'date-error-msg' : undefined}
          />
          {touched.date && dateError && (
            <p id="date-error-msg" className="field-error-msg" role="alert">
              <span aria-hidden="true">⚠️</span> {dateError}
            </p>
          )}
        </div>

        {/* 3. Provider or Facility */}
        <div className="form-group">
          <label htmlFor="record-facility" className="form-label">
            Provider or Facility <span className="required-mark">*</span>
          </label>
          <input
            id="record-facility"
            type="text"
            maxLength={60}
            placeholder="e.g. Apollo Labs or City General Hospital"
            className={`form-input ${touched.facility && facilityError ? 'input-error' : ''}`}
            value={facility}
            onChange={(e) => setFacility(e.target.value)}
            onBlur={() => handleBlur('facility')}
            aria-invalid={Boolean(touched.facility && facilityError)}
            aria-describedby={touched.facility && facilityError ? 'facility-error-msg' : undefined}
          />
          {touched.facility && facilityError && (
            <p id="facility-error-msg" className="field-error-msg" role="alert">
              <span aria-hidden="true">⚠️</span> {facilityError}
            </p>
          )}
        </div>

        {/* 4. Title */}
        <div className="form-group">
          <label htmlFor="record-title" className="form-label">
            Title <span className="required-mark">*</span>
          </label>
          <input
            id="record-title"
            type="text"
            maxLength={80}
            placeholder="e.g. HbA1c (Blood Sugar) or Chest X-Ray"
            className={`form-input ${touched.title && titleError ? 'input-error' : ''}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleBlur('title')}
            aria-invalid={Boolean(touched.title && titleError)}
            aria-describedby={touched.title && titleError ? 'title-error-msg' : undefined}
          />
          {touched.title && titleError && (
            <p id="title-error-msg" className="field-error-msg" role="alert">
              <span aria-hidden="true">⚠️</span> {titleError}
            </p>
          )}
        </div>

        {/* 5. Summary with live character counter */}
        <div className="form-group">
          <div className="form-label-row">
            <label htmlFor="record-summary" className="form-label">
              Summary <span className="required-mark">*</span>
            </label>
            <span
              className={`char-counter ${summary.length > 280 ? 'char-counter-near' : ''}`}
              aria-live="polite"
            >
              {summary.length} / 300
            </span>
          </div>
          <textarea
            id="record-summary"
            rows={3}
            maxLength={300}
            placeholder="Key findings, clinical interpretation, or instructions..."
            className={`form-textarea ${touched.summary && summaryError ? 'input-error' : ''}`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onBlur={() => handleBlur('summary')}
            aria-invalid={Boolean(touched.summary && summaryError)}
            aria-describedby={touched.summary && summaryError ? 'summary-error-msg' : undefined}
          />
          {touched.summary && summaryError && (
            <p id="summary-error-msg" className="field-error-msg" role="alert">
              <span aria-hidden="true">⚠️</span> {summaryError}
            </p>
          )}
        </div>

        {/* 6. Optional: Result Value (for Lab Report only) */}
        {type === 'Lab Report' && (
          <div className="form-group">
            <label htmlFor="record-result" className="form-label">
              Result Value <span className="optional-mark">(optional, Lab Report only)</span>
            </label>
            <input
              id="record-result"
              type="text"
              maxLength={60}
              placeholder="e.g. 7.0% or 180 mg/dL"
              className={`form-input ${touched.resultValue && resultError ? 'input-error' : ''}`}
              value={resultValue}
              onChange={(e) => setResultValue(e.target.value)}
              onBlur={() => handleBlur('resultValue')}
              aria-invalid={Boolean(touched.resultValue && resultError)}
              aria-describedby={touched.resultValue && resultError ? 'result-error-msg' : undefined}
            />
            {touched.resultValue && resultError && (
              <p id="result-error-msg" className="field-error-msg" role="alert">
                <span aria-hidden="true">⚠️</span> {resultError}
              </p>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="add-record-actions">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="save-record-btn"
          >
            {isSubmitting ? 'Saving Record...' : 'Save Medical Record'}
          </button>
        </div>
      </form>
    </div>
  )}
</section>
  );
}
