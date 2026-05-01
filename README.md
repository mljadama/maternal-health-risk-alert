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

## Overview

Maternal Health Risk Alert helps antenatal care teams identify high-risk pregnancies using routine DHIS2 tracker data. It analyzes each patient's clinical information as it is entered and highlights pregnancies that may need closer follow-up.

The app uses evidence-based clinical rules to score pregnancy risk based on vital signs, clinical findings, and obstetric history. Results are shown in real time across the dashboard, patient list, and risk alert views.

## Features

- Register pregnant women as Tracked Entity Instances in DHIS2 Tracker
- Record ANC visits with blood pressure, haemoglobin, weight, malaria results, and danger signs
- Automatic risk scoring using evidence-based clinical rules
- Colour-coded risk alerts dashboard for high, moderate, and normal risk
- Patient visit history with blood pressure and haemoglobin trend charts
- Runtime configuration page for mapping metadata to any DHIS2 instance
- Compatible with DHIS2 v2.38 and above

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
- `curl` and `base64` tools if you plan to run the setup script

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

## Deployment

### Build and install into DHIS2

```bash
npm run build
curl.exe -X POST "http://your-dhis2/api/apps" -u "admin:password" \
  -F "file=@build/bundle/Maternal Health Risk Alert-1.0.1.zip"
```

### Post-installation setup

Follow these steps after installing the app into DHIS2:

#### 1. Assign the app user role

> ⚠️ **Required.** Without this role, the Organisation Unit selector will not appear in the Register Patient form.

1. Go to **DHIS2 Menu → User Management → Users**
2. Find your user and click **Edit**
3. Under **Roles**, add **Maternal Health Risk Alert**
4. Click **Save**
5. Refresh the app

#### 2. Open the Configuration page

1. Open the **Maternal Health Risk Alert** app
2. Go to **Configuration** in the sidebar
3. Enter the UIDs from your DHIS2 instance or run the setup script and copy its output
4. Click **Save**

> The app will not work without a valid configuration. If the Program UID or other required fields are missing or incorrect, the Patients and Register Patient pages will show an error.

#### 3. Verify the configuration

After saving, confirm that the Program, Program Stage, Tracked Entity Type, attributes, and data elements show the expected values for your DHIS2 instance.

### Start development server

```bash
npm start
```

## Troubleshooting

### `npm install` fails with ERESOLVE peer dependency error

If this happens, you are likely using a stale dependency tree from an older branch or lockfile. Reinstall cleanly:

```bash
# delete node_modules and package-lock.json
npm install
```

### 400 error on Patients or Register Patient page

This usually means the app configuration is incomplete or invalid. Open **Configuration** in the sidebar and make sure all required fields are filled in correctly:

- Program UID
- Program Stage UID
- Tracked Entity Type UID
- All attribute and data element UIDs

Save the configuration and refresh the app.

### Org unit selector missing in Register Patient

The **Maternal Health Risk Alert** role has not been assigned to your user. See [Post-installation setup](#post-installation-setup).

### Tracker access errors after fresh install

If you see tracker permission errors immediately after running the setup script, log out and log back in to DHIS2. The setup script patches org unit scopes for the setup user, and a fresh login is sometimes required for the changes to take effect.

## License

BSD 3-Clause