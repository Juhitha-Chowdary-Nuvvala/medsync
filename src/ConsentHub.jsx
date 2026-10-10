import React, { useState, useEffect } from 'react';
import {
  generatePin,
  getGrantStatus,
  getCurrentGrant,
  revokeGrant,
  logExpiryIfNeeded
} from './accessControl.js';

/**
 * Helper to compute validation, total minutes, dynamic button label,
 * and live preview text for custom duration inputs.
 */
function getDurationInfo(inputValue, inputUnit) {
  const trimmed = String(inputValue).trim();

  // Validate whole numbers only: digits only, no decimal points, no negative signs, not empty
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return {
      isValid: false,
      totalMinutes: 0,
      errorMessage: 'Enter a whole number from 1 minute to 30 days',
      buttonLabel: 'Generate Access PIN',
      previewText: ''
    };
  }

  const num = parseInt(trimmed, 10);
  let totalMinutes = num;
  if (inputUnit === 'days') {
    totalMinutes = num * 1440;
  } else if (inputUnit === 'hours') {
    totalMinutes = num * 60;
  }

  // Allowed range: 1 minute to 30 days (43200 minutes)
  if (num === 0 || totalMinutes < 1 || totalMinutes > 43200) {
    return {
      isValid: false,
      totalMinutes: 0,
      errorMessage: 'Enter a whole number from 1 minute to 30 days',
      buttonLabel: 'Generate Access PIN',
      previewText: ''
    };
  }

  // Format readable duration and dynamic button text
  const days = Math.floor(totalMinutes / 1440);
  const remMinutesAfterDays = totalMinutes % 1440;
  const hours = Math.floor(remMinutesAfterDays / 60);
  const mins = remMinutesAfterDays % 60;

  let readable = '';
  let buttonLabel = '';

  if (days > 0 && hours === 0 && mins === 0) {
    readable = days === 1 ? '1 day' : `${days} days`;
    buttonLabel = days === 1 ? 'Generate 1-Day Access PIN' : `Generate ${days}-Day Access PIN`;
  } else if (days > 0) {
    const parts = [days === 1 ? '1 day' : `${days} days`];
    if (hours > 0) parts.push(hours === 1 ? '1 hour' : `${hours} hours`);
    if (mins > 0) parts.push(mins === 1 ? '1 minute' : `${mins} minutes`);
    readable = parts.join(' ');
    buttonLabel = `Generate ${readable} Access PIN`;
  } else if (hours > 0 && mins > 0) {
    const hourPart = hours === 1 ? '1 hour' : `${hours} hours`;
    const minPart = mins === 1 ? '1 minute' : `${mins} minutes`;
    readable = `${hourPart} ${minPart}`;
    buttonLabel = `Generate ${hours} h ${mins} min Access PIN`;
  } else if (hours > 0) {
    readable = hours === 1 ? '1 hour' : `${hours} hours`;
    buttonLabel = hours === 1 ? 'Generate 1-Hour Access PIN' : `Generate ${hours}-Hour Access PIN`;
  } else {
    readable = mins === 1 ? '1 minute' : `${mins} minutes`;
    buttonLabel = `Generate ${mins}-Min Access PIN`;
  }

  return {
    isValid: true,
    totalMinutes,
    errorMessage: '',
    buttonLabel,
    previewText: `Access will last ${readable}.`
  };
}

/**
 * ConsentHub Component
 * Manages patient-controlled access grants: custom duration input, quick-picks,
 * PIN generation, live countdown timers, revocation, and immutable access history log.
 */
export default function ConsentHub({ data, patient, onDataChange }) {
  // Custom duration input states (Default: 30 minutes)
  const [inputValue, setInputValue] = useState('30');
  const [inputUnit, setInputUnit] = useState('minutes');

  const patientId = patient?.id || 'PID-12345';
  const currentGrant = getCurrentGrant(data, patientId);
  const status = currentGrant ? getGrantStatus(currentGrant) : 'none';

  // Compute duration validation and labels
  const durationInfo = getDurationInfo(inputValue, inputUnit);

  // Quick-pick shortcut handlers
  const handleQuickPick = (val, unit) => {
    setInputValue(String(val));
    setInputUnit(unit);
  };

  // Calculate remaining seconds from grant expiration timestamp
  const calculateRemainingSeconds = (expiresAt) => {
    if (!expiresAt) return 0;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diffMs / 1000));
  };

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    currentGrant ? calculateRemainingSeconds(currentGrant.expiresAt) : 0
  );

  // If opened or refreshed after grant expired, log expiry on mount
  useEffect(() => {
    if (patientId) {
      const updated = logExpiryIfNeeded(patientId);
      if (updated !== data) {
        onDataChange(updated);
      }
    }
  }, [patientId]);

  // Live countdown timer for active grant
  useEffect(() => {
    if (!currentGrant || status !== 'active') {
      return;
    }

    // Set initial remaining time immediately
    const initialSeconds = calculateRemainingSeconds(currentGrant.expiresAt);
    setRemainingSeconds(initialSeconds);

    if (initialSeconds <= 0) {
      const updated = logExpiryIfNeeded(patientId);
      onDataChange(updated);
      return;
    }

    // Tick every second
    const timerId = setInterval(() => {
      const secondsLeft = calculateRemainingSeconds(currentGrant.expiresAt);
      setRemainingSeconds(secondsLeft);

      if (secondsLeft <= 0) {
        clearInterval(timerId);
        const updated = logExpiryIfNeeded(patientId);
        onDataChange(updated);
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [currentGrant?.id, currentGrant?.expiresAt, status, patientId]);

  // Handle generating a new PIN with custom duration in minutes
  const handleGeneratePin = () => {
    if (!durationInfo.isValid) return;
    const updated = generatePin(patientId, durationInfo.totalMinutes);
    onDataChange(updated);
  };

  // Handle revoking access
  const handleRevokeAccess = () => {
    const confirmed = window.confirm('Revoke access now?');
    if (confirmed) {
      const updated = revokeGrant(patientId);
      onDataChange(updated);
    }
  };

  // Format countdown mm:ss under 1 hour, or h:mm:ss for 1 hour or more
  const formatCountdown = (totalSec) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  // Format exact expiry time (e.g. "2:45 PM")
  const formatExpiryTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // Format audit event timestamp
  const formatAuditTime = (isoTimestamp) => {
    if (!isoTimestamp) return '';
    const date = new Date(isoTimestamp);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    return `${time} · ${day} ${month}`;
  };

  // Audit events sorted newest first
  const auditEvents = [...(data?.auditEvents || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Check if any emergency override event exists in history (Stage 4)
  const hasEmergencyEvent = (data?.auditEvents || []).some(
    (e) => e.mode === 'emergency'
  );

  return (
    <section className="white-card consent-hub-card" aria-labelledby="consent-heading">
      {/* Persistent Emergency Override Alert (Stage 4) */}
      {hasEmergencyEvent && (
        <div className="emergency-patient-banner" role="alert">
          🚨 Emergency access was used on your record. See Access History.
        </div>
      )}

      <h2 id="consent-heading" className="card-title">
        Consent Hub
      </h2>
      <p className="consent-description">
        Grant time-limited access to clinicians. You remain in control and can revoke access anytime.
      </p>


      {/* --- 1. Custom Duration Input Section --- */}
      <div className="custom-duration-container">
        <label className="duration-input-label" htmlFor="duration-number-input">
          Access Duration:
        </label>

        {/* Input + Unit Dropdown */}
        <div className="duration-inputs-row">
          <input
            id="duration-number-input"
            type="number"
            min="1"
            max={inputUnit === 'days' ? '30' : inputUnit === 'hours' ? '720' : '43200'}
            step="1"
            className={`duration-number-input ${!durationInfo.isValid ? 'input-invalid' : ''}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g. 30"
          />

          <select
            className="duration-unit-select"
            value={inputUnit}
            onChange={(e) => setInputUnit(e.target.value)}
            aria-label="Duration unit"
          >
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </select>
        </div>

        {/* Quick-Pick Shortcut Buttons */}
        <div className="quick-pick-row">
          <span className="quick-pick-label">Quick picks:</span>
          <button
            type="button"
            className={`quick-pick-btn ${inputValue === '15' && inputUnit === 'minutes' ? 'active' : ''}`}
            onClick={() => handleQuickPick(15, 'minutes')}
          >
            15 min
          </button>
          <button
            type="button"
            className={`quick-pick-btn ${inputValue === '30' && inputUnit === 'minutes' ? 'active' : ''}`}
            onClick={() => handleQuickPick(30, 'minutes')}
          >
            30 min
          </button>
          <button
            type="button"
            className={`quick-pick-btn ${inputValue === '1' && inputUnit === 'hours' ? 'active' : ''}`}
            onClick={() => handleQuickPick(1, 'hours')}
          >
            1 hour
          </button>
          <button
            type="button"
            className={`quick-pick-btn ${inputValue === '1' && inputUnit === 'days' ? 'active' : ''}`}
            onClick={() => handleQuickPick(1, 'days')}
          >
            1 day
          </button>
        </div>

        {/* Validation Error Message or Live Preview */}
        {!durationInfo.isValid ? (
          <div className="duration-error-msg" role="alert">
            {durationInfo.errorMessage}
          </div>
        ) : (
          <div className="duration-preview-msg">
            {durationInfo.previewText}
          </div>
        )}
      </div>

      {/* --- 2. Generate Action Button --- */}
      <button
        type="button"
        className="pin-generate-btn"
        disabled={!durationInfo.isValid}
        onClick={handleGeneratePin}
      >
        <span>🔑</span>
        <span>{durationInfo.buttonLabel}</span>
      </button>

      {/* --- 3. Active / Recent Grant Display --- */}
      {currentGrant && (
        <div className="active-grant-container">
          {/* Status Badge */}
          <div className="grant-status-row">
            {status === 'active' && remainingSeconds > 0 && (
              <span className="grant-badge badge-active" role="status">
                ● Active
              </span>
            )}
            {status === 'expired' && (
              <span className="grant-badge badge-expired" role="status">
                ⏱ Expired
              </span>
            )}
            {status === 'revoked' && (
              <span className="grant-badge badge-revoked" role="status">
                ⛔ Revoked
              </span>
            )}
          </div>

          {/* Active State: Show PIN, countdown, expiry time, revoke button */}
          {status === 'active' && remainingSeconds > 0 ? (
            <div className="grant-active-details">
              <div className="pin-box">
                <span className="pin-box-label">4-Digit Access PIN</span>
                <div className="pin-digits-spaced" aria-label={`PIN ${currentGrant.pin}`}>
                  {currentGrant.pin.split('').join(' ')}
                </div>
              </div>

              <div className="countdown-box">
                <div className="countdown-time">
                  ⏱ Remaining: <strong>{formatCountdown(remainingSeconds)}</strong>
                </div>
                <div className="exact-expiry-text">
                  Expires at {formatExpiryTime(currentGrant.expiresAt)}
                </div>
              </div>

              <button
                type="button"
                className="revoke-btn"
                onClick={handleRevokeAccess}
              >
                ⛔ Revoke Access
              </button>

              <p className="pin-disclaimer-note">
                Demo PIN. Any registered demo doctor with this PIN can use it. The PIN itself contains no medical data.
              </p>
            </div>
          ) : (
            /* Expired or Revoked State: PIN is completely hidden */
            <div className="grant-inactive-message">
              <p>This PIN can no longer be used.</p>
            </div>
          )}
        </div>
      )}

      {/* --- 4. Access History Log --- */}
      <div className="access-history-section">
        <h3>Access History</h3>
        {auditEvents.length === 0 ? (
          <div className="empty-history-text">No access yet.</div>
        ) : (
          <div className="audit-timeline">
            {auditEvents.map((event) => {
              const isEmergency = event.mode === 'emergency';
              return (
                <div
                  key={event.id}
                  className={`audit-item ${isEmergency ? 'audit-emergency' : ''}`}
                >
                  <div className="audit-item-header">
                    <span className="audit-action">{event.action}</span>
                    {isEmergency ? (
                      <span className="mode-badge mode-emergency">EMERGENCY</span>
                    ) : (
                      <span className="mode-badge mode-standard">Standard</span>
                    )}
                  </div>

                  <div className="audit-meta">
                    <span className="audit-actor">{event.actor}</span>
                    <span className="audit-dot">·</span>
                    <span className="audit-time">{formatAuditTime(event.timestamp)}</span>
                  </div>

                  {event.details && (
                    <div className="audit-details">{event.details}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
