import React, { useState, useEffect } from 'react';
import { loadData, resetData } from './store.js';
import { formatDateLabel } from './seedData.js';
import DocumentPreview from './DocumentPreview.jsx';
import AddMedicalRecord from './AddMedicalRecord.jsx';
import ConsentHub from './ConsentHub.jsx';
import DoctorPortal from './DoctorPortal.jsx';
import { getRandomWellnessQuote } from './wellnessQuotes.js';
import {
  LogoMark,
  ShieldPulse,
  PersonIcon,
  StethoscopeIcon,
  ArrowRight,
  SmallShield,
  HeartbeatLine,
  BottomWaves,
  FolderCross
} from './WelcomeIcons.jsx';
import './App.css';

/**
 * MedSync Demo App
 * Unified Health Passport with Patient Portal (including Consent Hub),
 * Doctor Portal placeholder, and cross-tab localStorage synchronization.
 */
export default function App() {
  // Load data initially from store
  const [data, setData] = useState(() => loadData());
  // Active view: 'patient', 'doctor', or null for gateway screen
  const [activeView, setActiveView] = useState(null);
  // Authentication gate state for hackathon demo
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Rotating uplifting quote for Patient Portal wellness widget
  const [wellnessQuote, setWellnessQuote] = useState(() => getRandomWellnessQuote());
  // Collapsible health timeline: show 3 recent by default
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  // State for expanded timeline card
  const [expandedId, setExpandedId] = useState(null);
  // Fresh Mint toast for Patient Portal
  const [patientToast, setPatientToast] = useState(null);
  // Stage 8 Polish: Collapsible Demo Guide & About Dialog
  const [showDemoGuide, setShowDemoGuide] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Close About modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showAboutModal) {
        setShowAboutModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAboutModal]);

  // Toast notification auto-dismiss after 4 seconds
  useEffect(() => {
    if (!patientToast) return;
    const timer = setTimeout(() => {
      setPatientToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [patientToast]);

  // Pick a fresh rotating uplifting quote when Patient Portal is opened
  useEffect(() => {
    if (activeView === 'patient' && isLoggedIn) {
      setWellnessQuote(getRandomWellnessQuote());
    }
  }, [activeView, isLoggedIn]);

  // Cross-tab synchronization via storage event
  useEffect(() => {
    const handleStorageChange = (event) => {
      // Reload state when medsync_data changes in another tab
      if (event.key === 'medsync_data') {
        const updated = loadData();
        setData(updated);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Reset handler with confirmation
  const handleReset = () => {
    const confirmed = window.confirm('Reset all demo data?');
    if (confirmed) {
      const fresh = resetData();
      setData(fresh);
      setExpandedId(null);
    }
  };

  // Toggle timeline item expansion
  const toggleTimelineItem = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Handle new record added by patient (Stage 7)
  const handlePatientRecordAdded = (updatedData, message) => {
    if (updatedData) {
      setData(updatedData);
    }
    setPatientToast(message || 'Record added to your timeline');
  };

  const patient = data?.patient || {};
  const activeMedications = (data?.medications || []).filter((med) => med.active);

  // Sort timeline records by timestamp, newest first
  const sortedRecords = [...(data?.records || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Expected demo credentials
  const expectedId = activeView === 'doctor' ? 'MD-8821' : 'PID-12345';
  const expectedPassword = activeView === 'doctor' ? 'doctor123' : 'password123';

  // Handle persona selection on Gateway screen
  const handleSelectPersona = (role) => {
    setActiveView(role);
    setIsLoggedIn(false);
    if (role === 'doctor') {
      setLoginId('MD-8821');
      setLoginPassword('doctor123');
    } else {
      setLoginId('PID-12345');
      setLoginPassword('password123');
    }
    setLoginError('');
  };

  // Autofill helper
  const handleAutofill = () => {
    if (activeView === 'doctor') {
      setLoginId('MD-8821');
      setLoginPassword('doctor123');
    } else {
      setLoginId('PID-12345');
      setLoginPassword('password123');
    }
    setLoginError('');
  };

  // Login submission
  const handleLoginSubmit = (e) => {
    if (e) e.preventDefault();
    if (!loginId.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both your ID and password.');
      return;
    }

    if (
      loginId.trim().toUpperCase() === expectedId.toUpperCase() &&
      loginPassword.trim() === expectedPassword
    ) {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError(`Invalid credentials. Demo credentials: ${expectedId} / ${expectedPassword}`);
    }
  };

  // Return to Welcome Gateway
  const handleBackToGateway = () => {
    setActiveView(null);
    setIsLoggedIn(false);
    setLoginError('');
  };

  // If activeView is not set, render full-page "Welcome to MedSync" gateway screen
  if (!activeView) {
    return (
      <div className="welcome-page">
        {/* Subtle decorative background shapes (pointer-events none, aria-hidden) */}
        <div className="welcome-bg-decorations" aria-hidden="true">
          <div className="welcome-bg-heartbeat">
            <HeartbeatLine />
          </div>
          <div className="welcome-bg-folder">
            <FolderCross />
          </div>
          <div className="welcome-bg-waves">
            <BottomWaves />
          </div>
        </div>

        {/* Top-Left Header with LogoMark & brand text (no dark teal navbar) */}
        <header className="welcome-header">
          <div className="welcome-brand">
            <LogoMark />
            <div className="welcome-brand-text">
              <span className="welcome-brand-title">
                <span className="welcome-brand-med">Med</span>
                <span className="welcome-brand-sync">Sync</span>
              </span>
              <span className="welcome-brand-tagline">YOUR HEALTH, CONNECTED</span>
            </div>
          </div>
        </header>

        {/* Center Welcome Hero & Role Selection Content */}
        <main className="welcome-page-content">
          {/* ShieldPulse centered above heading with thin teal horizontal lines */}
          <div className="welcome-shield-row" aria-hidden="true">
            <div className="welcome-teal-line" />
            <ShieldPulse />
            <div className="welcome-teal-line" />
          </div>

          {/* Headings & Descriptions */}
          <h1 className="welcome-title">Welcome to MedSync</h1>
          <p className="welcome-subtitle">
            Your health passport for records, medications, and consented sharing.
          </p>
          <p className="welcome-small-line">
            Access your health information or review patient records, with access granted only by the patient.
          </p>

          {/* Role Selection Cards */}
          <div className="welcome-cards-container">
            {/* Patient Card */}
            <button
              type="button"
              className="welcome-role-card"
              onClick={() => handleSelectPersona('patient')}
              aria-label="Continue as Patient"
            >
              <div className="welcome-icon-circle welcome-patient-circle" aria-hidden="true">
                <PersonIcon />
              </div>
              <h2 className="welcome-card-title">I'm a Patient</h2>
              <p className="welcome-card-desc">
                View your medical records, medications and consent.
              </p>
              <div className="welcome-card-arrow-wrap" aria-hidden="true">
                <ArrowRight className="welcome-card-arrow" />
              </div>
            </button>

            {/* Doctor Card */}
            <button
              type="button"
              className="welcome-role-card"
              onClick={() => handleSelectPersona('doctor')}
              aria-label="Continue as Doctor"
            >
              <div className="welcome-icon-circle welcome-doctor-circle" aria-hidden="true">
                <StethoscopeIcon />
              </div>
              <h2 className="welcome-card-title">I'm a Doctor</h2>
              <p className="welcome-card-desc">
                Access patient records and clinical overview (with authorized access).
              </p>
              <div className="welcome-card-arrow-wrap" aria-hidden="true">
                <ArrowRight className="welcome-card-arrow" />
              </div>
            </button>
          </div>

          {/* Footer: SmallShield between two thin horizontal lines */}
          <footer className="welcome-footer">
            <div className="welcome-footer-divider" aria-hidden="true">
              <div className="welcome-footer-line" />
              <SmallShield />
              <div className="welcome-footer-line" />
            </div>
            <p className="welcome-footer-text">
              Demo with fictional data. Access is granted only with the patient's permission.
            </p>
          </footer>
        </main>
      </div>
    );
  }

  // If activeView is chosen but user is not logged in, render intermediate Mock Login view
  if (activeView && !isLoggedIn) {
    const isDoctor = activeView === 'doctor';
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full login-card">
          {/* Header & Persona Icon */}
          <div className="flex flex-col items-center text-center mb-6">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                isDoctor ? 'doctor-icon-bg' : 'user-icon-bg'
              }`}
            >
              {isDoctor ? (
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4.5 3v4a4.5 4.5 0 0 0 9 0V3" />
                  <path d="M9 11.5v3.5a4 4 0 0 0 4 4h1" />
                  <circle cx="19" cy="19" r="2.5" />
                  <circle cx="4.5" cy="3" r="1.2" fill="#2563eb" />
                  <circle cx="13.5" cy="3" r="1.2" fill="#2563eb" />
                </svg>
              ) : (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="#3b3561" aria-hidden="true">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V21.6h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              {isDoctor ? 'Doctor Portal Login' : 'Patient Portal Login'}
            </h2>
            <p className="text-sm text-gray-500">
              {isDoctor
                ? 'Clinical access and patient overview'
                : 'My records, medications and consent hub'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                {isDoctor ? 'Doctor ID' : 'Patient ID'}
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => {
                  setLoginId(e.target.value);
                  setLoginError('');
                }}
                placeholder={expectedId}
                className="login-input"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  setLoginError('');
                }}
                placeholder={expectedPassword}
                className="login-input"
              />
            </div>

            {/* Inline Error Message */}
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5 flex items-center gap-2">
                <span aria-hidden="true">⚠️</span>
                <span>{loginError}</span>
              </div>
            )}

            {/* Helper Box: Demo Credentials */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-900">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-teal-900">Demo Credentials:</span>
                <span className="text-[10px] bg-teal-200 text-teal-800 font-bold px-1.5 py-0.5 rounded uppercase">
                  Hackathon
                </span>
              </div>
              <div className="font-mono text-xs bg-white px-2.5 py-1.5 rounded border border-teal-100 flex items-center justify-between">
                <span>
                  <strong>ID:</strong> {expectedId}
                </span>
                <span className="text-gray-300">/</span>
                <span>
                  <strong>Password:</strong> {expectedPassword}
                </span>
              </div>
            </div>

            {/* Autofill Button */}
            <button
              type="button"
              onClick={handleAutofill}
              className="w-full py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg border border-teal-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>⚡</span>
              <span>Autofill Demo Credentials</span>
            </button>

            {/* Primary Login Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-md transition-all cursor-pointer text-sm"
            >
              Login to {isDoctor ? 'Doctor Portal' : 'Patient Portal'}
            </button>

            {/* Back to Gateway Button */}
            <button
              type="button"
              onClick={handleBackToGateway}
              className="w-full py-2 text-gray-500 hover:text-gray-700 text-xs font-medium transition-colors text-center cursor-pointer bg-transparent border-none mt-1"
            >
              ← Back to Gateway
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* --- Top Navigation --- */}
      <header>
        <nav className="navbar" aria-label="Main Navigation">
          <div
            className="brand-section"
            onClick={handleBackToGateway}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleBackToGateway();
            }}
            style={{ cursor: 'pointer' }}
            title="Return to Welcome Screen"
          >
            <div className="brand-logo-group">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#ec4899" className="heart-icon" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <div className="brand-text-block">
                <span className="logo-text">MedSync</span>
                <span className="logo-subtext">YOUR HEALTH, CONNECTED</span>
              </div>
            </div>
            <span className="logo-badge">{activeView === 'doctor' ? 'Doctor View' : 'Patient View'}</span>
          </div>

          <div className="view-toggle-container" role="tablist" aria-label="Portal View Switcher">
            <button
              type="button"
              className="toggle-btn"
              onClick={handleBackToGateway}
              title="Return to Welcome Gateway"
            >
              ⇄ Log Out / Switch Role
            </button>
          </div>
        </nav>
      </header>

      {/* --- Collapsible Demo Guide for Judges (Stage 8) --- */}
      <div className="demo-guide-bar">
        <button
          type="button"
          className="demo-guide-toggle-btn"
          onClick={() => setShowDemoGuide((prev) => !prev)}
          aria-expanded={showDemoGuide}
          aria-controls="demo-guide-panel"
        >
          <span>📋 {showDemoGuide ? 'Hide Demo Guide for Judges' : 'Demo Guide (Judges Walkthrough)'}</span>
          <span aria-hidden="true">{showDemoGuide ? '▲' : '▼'}</span>
        </button>

        {showDemoGuide && (
          <div id="demo-guide-panel" className="demo-guide-panel" role="region" aria-label="Judges Demo Guide">
            <div className="demo-guide-header">
              <h4>Judges Walkthrough: Short Demo Flow</h4>
              <span className="demo-patient-tag">Patient ID: <strong>PID-12345</strong></span>
            </div>
            <ol className="demo-guide-list">
              <li><strong>Patient View:</strong> In the Consent Hub on the right, pick a duration (e.g. 30 min) and click <em>"Generate PIN"</em>.</li>
              <li><strong>Doctor View:</strong> Open MedSync in a second browser tab (or switch to Doctor View), enter <code>PID-12345</code> and the 4-digit PIN, then click <em>"Verify & Access Chart"</em>.</li>
              <li><strong>Clinical Chart & Alerts:</strong> Review the chart. In the Consultation Pad, type <code>Ibuprofen</code> or <code>Amoxicillin</code> to see simulated interaction/allergy alerts. Under Diagnostic History, order <code>HbA1c</code> to see the duplicate-test warning. Check the review checkbox and click <em>"Sign & Save Consultation"</em>.</li>
              <li><strong>Real-Time Sync:</strong> Switch back to the patient tab and observe the newly added consultation record and medication appear automatically without reloading.</li>
              <li><strong>Instant Revocation:</strong> In the patient tab, click <em>"Revoke Access"</em>. Look at the doctor tab—the chart locks automatically.</li>
              <li><strong>Emergency Triage:</strong> In Doctor View, enter <code>PID-12345</code> with a blank PIN, click <em>"Emergency Break-Glass Override"</em>, and confirm. Notice only vital triage data is shown and an immutable EMERGENCY event is logged.</li>
              <li><strong>Reset Demo:</strong> Click <em>"Reset MVP Data"</em> in the footer to restore clean initial data at any time.</li>
            </ol>
          </div>
        )}
      </div>

      {/* --- Main Application Body --- */}
      <main className="main-content">
        {activeView === 'doctor' ? (
          /* --- Doctor Portal (Stage 3) --- */
          <DoctorPortal
            data={data}
            onDataChange={setData}
            formatDateLabel={formatDateLabel}
          />
        ) : (
          /* --- Patient Portal (Read-Only) --- */
          <div className="patient-portal">
            {/* A. Wellness Widget (Rotating uplifting quote) */}
            <div className="wellness-widget" role="status">
              <span aria-hidden="true">✨</span>
              <span>{wellnessQuote}</span>
            </div>

            {/* B. Profile Card */}
            <section className="profile-card" aria-label="Patient Profile">
              <div className="profile-header">
                <div className="profile-avatar" aria-label="Avatar initials">
                  RK
                </div>
                <div className="profile-identity">
                  <h2>{patient.name || 'Ramesh Kumar'}</h2>
                  <div className="profile-meta-row">
                    <span className="meta-item">
                      Age: <strong>{patient.age || 58}</strong>
                    </span>
                    <span className="meta-item">
                      Blood Group: <strong>{patient.bloodGroup || 'O+'}</strong>
                    </span>
                    <span className="meta-item">
                      Patient ID: <span className="id-badge">{patient.id || 'PID-12345'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-details-grid">
                <div className="detail-block">
                  <label>Emergency Contact</label>
                  <div>{patient.emergencyContact || '+91 98765 43210 (Wife: Priya)'}</div>
                </div>
                <div className="detail-block">
                  <label>Chronic Conditions</label>
                  <div className="conditions-tags">
                    {(patient.conditions || []).map((condition, idx) => (
                      <span key={idx} className="condition-pill">
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* C. Allergy Banner (Immediately below Profile) */}
            <div className="allergy-banner" role="alert" aria-label="Severe Allergy Warning">
              <span aria-hidden="true">⚠️</span>
              <span>Severe Penicillin Allergy</span>
            </div>

            {/* D. Main Content Grid (Two Columns on Desktop) */}
            <div className="portal-grid">
              {/* Left Column: Active Medications & Health Timeline */}
              <div className="portal-left-column">
                {/* E. Active Medications Card */}
                <section className="white-card" aria-labelledby="medications-heading">
                  <h2 id="medications-heading" className="card-title">
                    Active Medications
                  </h2>
                  <div className="medication-list">
                    {activeMedications.length === 0 ? (
                      <p className="empty-section-msg">No active medications recorded.</p>
                    ) : (
                      activeMedications.map((med) => (
                        <div key={med.id} className="medication-item">
                          <div className="med-info-left">
                            <h3>{med.name}</h3>
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
                      ))
                    )}
                  </div>
                </section>

                {/* F. Simulated Add Medical Record (Stage 7) */}
                <AddMedicalRecord
                  patient={patient}
                  onRecordAdded={handlePatientRecordAdded}
                />

                {/* G. Health Timeline */}
                <section id="patient-timeline-section" className="white-card" aria-labelledby="timeline-heading">
                  <h2 id="timeline-heading" className="card-title">
                    Health Timeline
                  </h2>
                  <div id="patient-timeline-list" className="timeline-list">
                    {sortedRecords.length === 0 ? (
                      <p className="empty-section-msg">No medical records found on timeline.</p>
                    ) : (
                      (showAllTimeline ? sortedRecords : sortedRecords.slice(0, 3)).map((record) => {
                        const isExpanded = expandedId === record.id;
                        return (
                          <article key={record.id} className="timeline-card">
                            <button
                              type="button"
                              className="timeline-header-btn"
                              onClick={() => toggleTimelineItem(record.id)}
                              aria-expanded={isExpanded}
                              aria-controls={`preview-${record.id}`}
                            >
                              <div className="timeline-meta-row">
                                <div className="timeline-badge-group">
                                  <span className="type-pill">{record.type}</span>
                                  <span>{record.facility}</span>
                                </div>
                                <span className="timeline-date-label">
                                  {formatDateLabel(record.date)}
                                </span>
                              </div>

                              <div className="timeline-title-row">
                                <h3>{record.title}</h3>
                                <span className="expand-chevron" aria-hidden="true">
                                  {isExpanded ? '▲ Hide' : '▼ Expand'}
                                </span>
                              </div>

                              {record.source === 'doctor' && (
                                <div className="timeline-doctor-stamp">
                                  Added by {record.clinician || 'Dr. Sarah Jenkins (MD-8821)'} at{' '}
                                  {new Date(record.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </div>
                              )}

                              {record.source === 'patient' && (
                                <div className="timeline-patient-stamp">
                                  Added by patient (simulated upload)
                                </div>
                              )}

                              <p className="timeline-summary">{record.summary}</p>
                            </button>


                            {isExpanded && (
                              <div id={`preview-${record.id}`} className="timeline-preview-drawer">
                                <DocumentPreview
                                  record={record}
                                  patient={patient}
                                  doctor={data?.doctor}
                                  formatDateLabel={formatDateLabel}
                                />
                              </div>
                            )}
                          </article>
                        );
                      })
                    )}
                  </div>

                  {sortedRecords.length > 3 && (
                    <div className="timeline-toggle-wrapper">
                      <button
                        type="button"
                        className="view-all-records-btn"
                        onClick={() => {
                          if (showAllTimeline) {
                            setShowAllTimeline(false);
                            const el = document.getElementById('patient-timeline-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          } else {
                            setShowAllTimeline(true);
                          }
                        }}
                        aria-expanded={showAllTimeline}
                        aria-controls="patient-timeline-list"
                        aria-label={showAllTimeline ? 'Show less records' : `View all records (${sortedRecords.length})`}
                      >
                        {showAllTimeline ? 'Show less' : `View all records (${sortedRecords.length})`}
                      </button>
                    </div>
                  )}
                </section>
              </div>

              {/* Right Column: Consent Hub */}
              <div className="portal-right-column">
                <ConsentHub data={data} patient={patient} onDataChange={setData} />
              </div>
            </div>

            {/* Fresh Mint Toast for Patient Portal (Stage 7) */}
            {patientToast && (
              <div className="mint-toast" role="status" aria-live="polite">
                <span className="toast-icon" aria-hidden="true">✓</span>
                <span>{patientToast}</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- Footer --- */}
      <footer className="app-footer">
        <div className="footer-left">
          <span className="footer-note">Fictional demo data only.</span>
          <button
            type="button"
            className="about-demo-btn"
            onClick={() => setShowAboutModal(true)}
          >
            About this demo
          </button>
        </div>
        <button type="button" className="reset-btn" onClick={handleReset}>
          Reset MVP Data
        </button>
      </footer>

      {/* --- About This Demo Modal (Stage 8) --- */}
      {showAboutModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAboutModal(false)}
          role="presentation"
        >
          <div
            className="about-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="about-dialog-title">About This Demo</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAboutModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                <strong>MedSync is a fictional hackathon demo.</strong>
              </p>
              <p>All patients and doctors are fictional.</p>
              <p>Data is saved in your browser (localStorage) and does not sync across devices or browsers.</p>
              <p>It is not a secure or real clinical system.</p>
              <p>Alerts are simulated decision support.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="modal-primary-btn"
                onClick={() => setShowAboutModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
