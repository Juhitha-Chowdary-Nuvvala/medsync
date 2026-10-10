# MedSync | Unified Health Passport

---

## 1. MedSync
**One-Line Description:** A unified digital health passport enabling patients to aggregate medical records, share time-limited PIN-based access with clinicians, and safeguard vital care data across fragmented providers.

**Hackathon Track:** HealthTech: "Lost in Transit: Fragmented Medical Records and Repeated Care Across Providers"

---

## 2. Live Demo Link
[ADD LIVE LINK HERE](ADD_LIVE_LINK_HERE)

---

## 3. Demo Video
[ADD VIDEO LINK HERE](ADD_VIDEO_LINK_HERE)

> *Note: The demonstration video file is also placed in the repository in the [`demo/`](./demo) folder (see `demo/README.txt`).*

---

## 4. Problem Statement
When patients visit different healthcare providers—specialists, diagnostic labs, outpatient clinics, and hospitals—their clinical records remain trapped in disconnected silos. Medical records rarely travel with the patient, leading to:
- **Redundant Care:** Repeated and unnecessary diagnostic tests (like blood panels and imaging) that cost patients and health systems time and money.
- **Medication Risks:** Preventable adverse drug-drug interactions and prescription errors caused by incomplete medication histories.
- **Emergency Delays:** Dangerous delays in emergency triage when an unresponsive or unconscious patient cannot communicate severe allergies, chronic conditions, or blood group.

Patients lack a single, patient-owned, consented passport to carry and control their own medical history across providers.

---

## 5. Our Solution and Features
MedSync is a lightweight, patient-centric digital health passport built to eliminate data fragmentation without complex infrastructure:

1. **Unified Health Timeline:** Consolidates prescriptions, lab reports, visit notes, discharge summaries, and radiology imaging chronologically with realistic paper-style document previews.
2. **Time-Limited PIN Sharing with Custom Duration:** Patients choose access durations (minutes, hours, or days) to generate temporary 4-digit PINs for clinicians.
3. **Instant Revocation:** Patients can click "Revoke Access" at any moment to immediately lock clinician access.
4. **Access History (Audit Trail):** Permanent, immutable log recording every PIN generation, successful chart access, denied PIN attempt, consultation saved, test ordered, revocation, expiry, and emergency override.
5. **Emergency Break-Glass Triage (Restricted View):** Clinicians can unlock emergency triage without a PIN for unconscious or unresponsive patients. Access is strictly limited to critical triage data (blood group, allergies, chronic conditions, and emergency contacts) and permanently logs an `EMERGENCY OVERRIDE` audit event.
6. **Consultation and Prescription Recording:** Clinicians record diagnoses, notes, and prescriptions with doctor identity (`Dr. Sarah Jenkins (MD-8821)`) and exact timestamp, automatically updating the patient's active medication list and timeline.
7. **Simulated Clinical Alerts:**
   - **Drug-Drug Interaction:** Alerts when prescribing an NSAID (Ibuprofen) while the patient takes a blood thinner (Apixaban).
   - **Allergy Alert:** Critical alert when prescribing a penicillin-class antibiotic (Amoxicillin) for a penicillin-allergic patient.
   - **Duplicate Test Warning:** Warns clinicians if ordering a diagnostic test (e.g. HbA1c) that was already conducted within the last 30 days.
8. **Simulated Medical Record Upload:** Patients can record external medical documents with field validation, custom date bounds, and live document generation.
9. **Cross-Tab Live Synchronization:** Real-time updates between patient and clinician tabs using the browser's native `storage` events—no page reload required.

---

## 6. How It Works (Step-by-Step Demo Flow)
Experience MedSync's two-way workflow using two browser windows or tabs:

1. **Welcome Screen:** On the gateway page, choose between **"I'm a Patient"** and **"I'm a Doctor"**.
2. **Open Two Tabs:**
   - In **Tab 1**, select "I'm a Patient", autofill demo credentials (`PID-12345` / `password123`), and log in to the Patient Portal.
   - In **Tab 2**, select "I'm a Doctor", autofill demo credentials (`MD-8821` / `doctor123`), and log in to the Doctor Portal.
3. **Generate PIN (Tab 1):** In the Patient Consent Hub on the right, pick a duration (e.g., 30 minutes) and click **"Generate PIN"** to obtain an active 4-digit PIN.
4. **Access Chart (Tab 2):** In the Doctor Portal lookup gate, enter `PID-12345` and the 4-digit PIN, then click **"Verify & Access Chart"**.
5. **Review Timeline & Test Alerts (Tab 2):**
   - Review the patient's records and active medications.
   - In the Consultation Pad, type `Ibuprofen` to see the severe bleeding interaction warning with Apixaban.
   - Type `Amoxicillin` to see the critical Penicillin allergy warning.
   - Under Diagnostic History, order `HbA1c` to trigger the repeat-test warning (completed 3 days ago). Click "Review timeline" to highlight the existing report.
   - Acknowledge alerts, prescribe a medication, and click **"Sign & Save Consultation"**.
6. **Live Sync (Tab 1):** Switch back to Tab 1 without reloading. Notice the consultation record and new medication immediately appear on the patient's timeline and active medication list.
7. **Instant Revocation (Tab 1):** In the Consent Hub, click **"Revoke Access"**. Switch to Tab 2 to see the clinician chart immediately lock with access revoked.
8. **Emergency Override (Tab 2):** Return to the Doctor gate, enter `PID-12345` without a PIN, and click **"Emergency Break-Glass Override"**. Confirm the action to inspect the restricted vital triage view and immutable emergency audit log.
9. **Switch Role / Reset:** Click **"Log Out / Switch Role"** in the navigation header to return to the gateway, or click **"Reset MVP Data"** in the footer at any time to restore fresh demo data.

---

## 7. Demo Data
All demonstration data in MedSync is strictly **fictional**:

- **Fictional Patient:** Ramesh Kumar (`PID-12345`), Age 58, Blood Group `O+`.
  - *Emergency Contact:* `+91 98765 43210 (Wife: Priya)`
  - *Chronic Conditions:* Type 2 Diabetes, Hypertension, Atrial Fibrillation.
  - *Recorded Allergies:* Severe Penicillin Allergy.
  - *Active Medications:* Metformin 500mg, Apixaban 5mg (Blood Thinner), Amlodipine 5mg.
- **Fictional Doctor:** Dr. Sarah Jenkins (`MD-8821`), Cardiology, City General Hospital.
- **Simulated Triggers:**
  - `Ibuprofen` + `Apixaban` &rarr; Drug-drug interaction (bleeding risk).
  - `Amoxicillin` + recorded allergy &rarr; Critical penicillin allergy alert.
  - `HbA1c` within 30 days &rarr; Duplicate diagnostic test warning.
- **Reset Button:** The **"Reset MVP Data"** button in the footer resets all localStorage keys, restoring clean initial seed data.

---

## 8. Tech Stack and Dependencies
- **Core Framework:** React 19 (`react`, `react-dom`)
- **Build Tool:** Vite 8 (`vite`, `@vitejs/plugin-react`)
- **Styling:** Vanilla CSS with modern responsive design tokens, pure inline SVGs (zero external font or icon libraries).
- **Storage & Synchronization:** Browser `localStorage` with native cross-tab `window.addEventListener('storage', ...)`.
- **Sample Chest X-Ray Asset:** Sample chest radiogram stored in `public/images/chest-xray.jpg` and root `chest-xray.jpg`.
  - *Source and license:* ADD SOURCE HERE
- **External APIs:** **None.** MedSync uses zero external APIs or third-party web services; it runs completely self-contained in the browser.
- **Transparency Notice:** Built with AI-assisted coding (Antigravity) for rapid prototyping and architecture.

---

## 9. Setup and Local Development
### Prerequisites
- Node.js (v18.x or higher)
- npm (v9.x or higher)

### Commands
```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build locally
npm run preview
```

---

## 10. Honest Limitations
MedSync is a prototype built for hackathon demonstration. It has the following explicit limitations:

- **Browser Storage Boundary:** All records and audit logs are stored in the browser's `localStorage`. Data works only in the same browser and origin; it does not sync across separate devices or incognito sessions.
- **Simulated Authentication:** The role selection screen and mock login cards are simulated demo sign-ins for demonstration, not cryptographically secure authentication.
- **Client-Side Security:** Frontend-only access checks, countdown timers, and lockout rules are not real security; a production system requires authenticated server-side sessions, TLS encryption, and secure APIs.
- **4-Digit PIN Security:** A 4-digit PIN is low security, intended solely for fast hackathon evaluation. A production healthcare system requires server-side validation, rate limiting, and stronger cryptographic authorization tokens.
- **Simulated Rules & File Upload:** Clinical alerts are a tiny demo rule set, not a certified clinical decision support system. Document upload is simulated; no binary PDF or DICOM files are stored or parsed.
- **No Hospital EHR Integration:** There is no integration with real hospital electronic health record (EHR) systems or national registries.
- **Not for Real Medical Use:** MedSync makes no claims of regulatory compliance (such as HIPAA, GDPR, or ABDM/NDHM), production security, or clinical readiness. It must never be used for real medical diagnosis or treatment.

---

## 11. Future Scope
If developed into a production clinical system, MedSync's architectural roadmap includes:

- **Hosted Backend & Real Authentication:** Cloud backend (e.g., PostgreSQL with Node.js/Go) with OAuth 2.0 / OpenID Connect, multi-factor authentication, and role-based access control.
- **Cross-Device Sync:** End-to-end encrypted synchronization across patient and hospital devices.
- **Real Document Storage:** HIPAA-compliant encrypted blob storage for diagnostic PDFs, lab results, and high-resolution DICOM medical imaging.
- **QR-Based Sharing:** Dynamic patient QR codes for instant, authenticated clinician scanning in physical consultation rooms.
- **Verified Clinician Credentials:** Integration with national medical council registries to verify practicing clinician licenses before chart access.
- **Comprehensive Drug-Interaction Database:** Real-time drug-drug, drug-allergy, and drug-disease interaction checks connected to validated clinical databases (e.g. First Databank, Lexicomp, RxNorm).
- **Biometric Emergency Identification:** Biometric emergency identification designed strictly with legal governance, patient consent policies, and emergency medical protocols.

---

## 12. Team
- **Team Member 1:** [ADD NAME 1 HERE]
- **Team Member 2:** [ADD NAME 2 HERE]
- **Team Member 3:** [ADD NAME 3 HERE]
- **Team Member 4:** [ADD NAME 4 HERE]