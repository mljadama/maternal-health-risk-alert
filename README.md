# Maternal Health Risk Alert System

A DHIS2 web application that automatically identifies high-risk pregnancies during antenatal care using evidence-based clinical rules.

## Available on DHIS2 App Hub

[Install from DHIS2 App Hub](https://apps.dhis2.org/app/maternal-health-risk-alert)

## Screenshots

### Dashboard
![Dashboard](screenshots/screenshot-dashboard.png)

### Patient List
![Patient List](screenshots/screenshot-patients.png)

### Patient Detail with Trend Charts
![Patient Detail](screenshots/screenshot-patient-detail.png)

### Risk Alerts
![Risk Alerts](screenshots/screenshot-risk-alerts.png)

### Register Patient
![Register](screenshots/screenshot-register.png)

## What it does

Health workers in antenatal clinics see many pregnant women every day. Identifying high-risk patients manually requires careful clinical assessment and can be time-consuming. High-risk cases may be identified too late.

This application automatically analyzes each patient's clinical data and flags high-risk pregnancies in real time the moment new data is entered. It uses evidence-based clinical rules to score pregnancy risk based on vital signs, clinical findings, and obstetric history. No manual analysis required.

## Features

- Register pregnant women as Tracked Entity Instances in DHIS2 Tracker
- Record ANC visits with blood pressure, haemoglobin, weight, malaria results and danger signs
- Automatic risk scoring using 9 evidence-based clinical rules
- Colour-coded risk alerts dashboard showing high, moderate and normal risk
- Patient visit history with blood pressure and haemoglobin trend charts
- Runtime configuration page for mapping metadata to any DHIS2 instance
- Works on any DHIS2 instance v2.38 and above

## Risk engine

| Rule | Score |
|---|---|
| Severe hypertension BP 160/110 or above | +50 |
| Severe anaemia Hb below 7 g/dL | +45 |
| Active malaria infection | +40 |
| Hypertension BP 140/90 or above | +35 |
| Moderate anaemia Hb below 8 g/dL | +30 |
| Late ANC booking after 13 weeks | +20 to +30 |
| Adolescent pregnancy age under 18 | +25 |
| Danger signs reported | +25 per sign |
| Grand multiparity parity 4 or more | +15 |

## Tech stack

- DHIS2 App Platform
- React 18 and React Router v6
- DHIS2 UI Library
- Recharts v2
- DHIS2 Tracker API v42

## Setup

### Requirements

- Node.js v20 or higher
- A running DHIS2 instance v2.38 or above
- curl and base64 tools (for running setup script)

### Install

```bash
git clone https://github.com/mljadama/maternal-health-risk-alert.git
cd maternal-health-risk-alert
npm install
```

> **Note:** If you previously cloned a branch with older lint dependencies and
> still see an `ERESOLVE` conflict, delete `node_modules` and run `npm install`
> again. This repository no longer requires `--force` for standard installs.

### Configure DHIS2 metadata

The app requires a Tracker program with ANC visits. You can either:

**Option 1: Use the provided setup script to create demo metadata**

Windows (PowerShell):
```powershell
# Update $SERVER in setup-dhis2.ps1 if not using localhost:8080
.\setup-dhis2.ps1
```

macOS/Linux (Bash):
```bash
# Update $SERVER in setup-dhis2.sh if not using localhost:8080
chmod +x setup-dhis2.sh
./setup-dhis2.sh
```

These scripts create demo DHIS2 metadata that matches the app's data model:
- ANC Program (Antenatal Care Tracker)
- ANC Visit Program Stage (repeatable)
- Tracked Entity Attributes (patient demographics)
- Data Elements (vital signs and test results)
- Organization Units (health facilities)

The setup scripts also force-assign organisation unit scopes for the setup
user (`organisationUnits`, `teiSearchOrganisationUnits`, and
`dataViewOrganisationUnits`) using both endpoint assignment and JSON Patch,
to avoid tracker access errors after fresh installs.

After running the setup script, open the app's **Configuration** page and
verify that the UIDs match the ones printed by the script. The script outputs
all generated UIDs at the end — copy these into the Configuration page and save.

The setup script also updates local default mapping files
(`datastore-config.json`, `src/config/defaultUidConfig.js`, and
`src/config/dhis2.js`) so the app's
**Restore defaults** behavior stays aligned with the generated metadata.

**Option 2: Manual configuration (use existing metadata)**

If you have an existing ANC Tracker program in your DHIS2 instance:

1. Find your program's UID in DHIS2 Maintenance → Tracker programs
2. Open the app's Configuration page
3. Enter the Program, Program Stage, Tracked Entity Type, attribute, and
   data element UIDs for your instance
4. Save the configuration to dataStore

The app will read these values at runtime, so the same build can run against
different DHIS2 instances.

### Build and install into DHIS2

```bash
npm run build
curl.exe -X POST "http://your-dhis2/api/apps" -u "admin:password" \
  -F "file=@build/bundle/Maternal Health Risk Alert-1.0.1.zip"
```

### Post-installation setup

Follow these steps after installing the app into DHIS2:

#### 1. Assign the app user role to your admin user

> ⚠️ **This step is required.** Without it, the Organisation Unit selector
> will not appear in the Register Patient form.

1. Go to **DHIS2 Menu → User Management → Users**
2. Find your admin user → click **Edit**
3. Under **Roles**, add **Maternal Health Risk Alert**
4. Click **Save**
5. Refresh the app — the org unit selector will now appear in Register Patient

#### 2. Open the Configuration page

1. Open the **Maternal Health Risk Alert** app
2. Go to **Configuration** (⚙️ in the sidebar)
3. Enter the UIDs output by the setup script (or your existing metadata UIDs)
4. Click **Save**

> ⚠️ **The app will not work without a valid configuration.** If the Program
> UID or other required fields are missing or incorrect, the Patients and
> Register Patient pages will show an error. Always complete this step before
> using the app.

#### 3. Verify the configuration

After saving, the Configuration page will display the currently mapped values.
Confirm that the Program, Program Stage, Tracked Entity Type, attributes, and
data elements all show the expected names from your DHIS2 instance.

### Start development server

```bash
npm start
```

## Troubleshooting

### `npm install` fails with ERESOLVE peer dependency error

If this happens, you are likely using a stale dependency tree from an older
branch/lockfile. Reinstall cleanly:

```bash
# delete node_modules and package-lock.json
npm install
```

If needed, run `npm install --legacy-peer-deps` once, then regenerate the lock
file with a clean `npm install`.

### 400 error on Patients or Register Patient page

This means the app configuration is incomplete or invalid. Go to
**Configuration** (⚙️ in the sidebar) and ensure all required fields are
filled in correctly:

- Program UID
- Program Stage UID
- Tracked Entity Type UID
- All attribute and data element UIDs

Save the configuration and refresh the app.

### Org unit selector missing in Register Patient

The **Maternal Health Risk Alert** user role has not been assigned to your
user. See [Post-installation setup](#post-installation-setup) above.

### Tracker access errors after fresh install

If you see tracker permission errors immediately after running the setup
script, log out and log back in to DHIS2. The setup script patches org unit
scopes for the setup user, and a fresh login is sometimes required for the
changes to take effect.

## Why this was built

Maternal mortality remains a significant health challenge globally. The leading
preventable causes include pre-eclampsia, severe anaemia, malaria in pregnancy,
and late ANC booking. All are detectable early when the right clinical data is
tracked systematically.

While DHIS2 is widely used for antenatal care data collection, no existing
standard tool provides automated individual pregnancy risk assessment at the
point of care. This application fills that gap by applying evidence-based
clinical rules to track data in real time, helping health workers identify and
manage high-risk pregnancies early.

The app is **generic and reusable**: it can be deployed on any DHIS2 instance
with an ANC Tracker program, regardless of metadata configuration. A setup wizard
and configuration page guide users through mapping their local metadata to the
app's expected fields.

## Deployment & App Hub

### Quick Start: Build & Deploy

This app is designed for easy deployment:

1. **Build**: `npm run build` creates a production-ready ZIP file.
2. **Install**: Upload `build/bundle/Maternal Health Risk Alert-*.zip` to DHIS2 via **App Management** (Maintenance → Apps).
3. **Configure**: Open the app → go to Configuration → map your ANC program's UIDs → Save.
4. **Use**: Users with the **Maternal Health Risk Alert** role can now register patients and view risk alerts.

### App Hub Submission Checklist

To submit or update this app on the [DHIS2 App Hub](https://apps.dhis2.org):

1. **Prepare metadata**:
   - ✅ `package.json`: Includes name, version, description, keywords, author, license
   - ✅ `d2.config.js`: Includes title, description, minDHIS2Version, author, support URL, keywords
   - ✅ `README.md`: Complete usage, setup, and development documentation
   - ✅ `LICENSE`: BSD-3-Clause included

2. **Build for submission**:
   ```bash
   npm install          # Ensure clean dependencies
   npm run build        # Create production bundle
   # Output: build/bundle/Maternal Health Risk Alert-1.0.2.zip
   ```

3. **Submit to App Hub**:
   - Visit [DHIS2 App Hub](https://apps.dhis2.org)
   - Sign in with your DHIS2 account
   - Click "Submit App" or "Update App"
   - Upload the ZIP file
   - Fill in metadata (copied from package.json and d2.config.js)
   - Add screenshots from `screenshots/` folder
   - Submit for review

4. **Post-submission**:
   - App Hub team reviews code and functionality (typically 5–7 days)
   - If approved, app appears in App Hub for all DHIS2 instances to discover
   - Users can install directly via App Management: **Maintenance → Apps → Browse App Hub**

### Build Artifacts

After running `npm run build`, you'll have:
- `build/bundle/Maternal Health Risk Alert-1.0.2.zip` — App package for DHIS2 installation
- `build/app/` — Uncompressed app files (for manual deployment or inspection)

For App Hub submission, use the **ZIP file only**.

For internal DHIS2 App Hub submission, the app includes:
- ✅ Versioned builds with semantic versioning
- ✅ Clear usage documentation
- ✅ Setup scripts for demo environments
- ✅ Open-source repository with active maintenance

## DHIS2 App Competition 2026 — Submission Checklist

This app meets the 2026 DHIS2 App Competition requirements:

- ✅ **Generic & Reusable**: Works on any DHIS2 instance (v2.38+) with any ANC Tracker program. Metadata must be configured via the Configuration page.
- ✅ **Public & Open-Source**: Available on [GitHub](https://github.com/mljadama/maternal-health-risk-alert) under BSD-3-Clause license.
- ✅ **Responsible Data Use**: No external AI services integrated. All processing is local within DHIS2.
- ✅ **Useful & Impactful**: Addresses maternal mortality by enabling real-time risk identification at point of care.
- ✅ **Uses DHIS2 Tools**: Built with DHIS2 App Platform, App Runtime, UI Library, and Tracker API.

### AI Use Disclosure

**This app does not integrate any AI services or models.** All risk scoring uses evidence-based clinical rules implemented in JavaScript. Development may have benefited from AI coding assistants, but no AI functionality is exposed to end-users.

### Accessibility (a11y)

This app aims to support accessibility:

- Built with DHIS2 UI components, which include ARIA labels and semantic HTML.
- Color coding (high/moderate/normal risk) is accompanied by text labels.
- Keyboard navigation is supported via standard browser and React patterns.
- Responsive design works on desktop, tablet, and mobile viewports.

**Known limitations**: Accessibility audit by specialist not yet completed. Contributions welcome.

## License

BSD 3-Clause