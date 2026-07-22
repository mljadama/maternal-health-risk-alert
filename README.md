# Maternal Health Risk Alert System

A DHIS2 web application that automatically identifies high-risk pregnancies during antenatal care using evidence-based clinical rules.

## Why this project exists

The Gambia recorded 130 maternal deaths in 2025, many linked to conditions such as pre-eclampsia, severe anaemia, and malaria that can be detected early with timely screening. Yet in many antenatal care settings, risk identification still depends on manual review, overstretched staff, and paper records.

Maternal Health Risk Alert was built to help close that gap. The app automatically scores pregnancy risk as soon as clinical data is entered, so high-risk patients are flagged immediately rather than discovered too late.

## Available on DHIS2 App Hub

[Install from DHIS2 App Hub](https://apps.dhis2.org/?query=Maternal%20Health%20Risk%20Alert)
> ✅ **v1.0.3 approved on May 5, 2026** — Recommended for production use.

## Screenshots

### Dashboard
![Dashboard](screenshots/screenshot-dashboard.png)

### Patients list
![Patients list](screenshots/screenshot-patients.png)

### Patient register
![Register patient](screenshots/screenshot-register.png)

### Risk alerts
![Risk alerts](screenshots/screenshot-risk-alert.png)

## Overview

Maternal Health Risk Alert helps antenatal care teams identify high-risk pregnancies using routine DHIS2 tracker data. It analyzes each patient's clinical information as it is entered and highlights pregnancies that may need closer follow-up.

The app uses evidence-based clinical rules to score pregnancy risk based on vital signs, clinical findings, and obstetric history. Results are shown in real time across the dashboard, patient list, and risk alert views.

## Features

- Register pregnant women as Tracked Entity Instances in DHIS2 Tracker
- Record ANC visits with blood pressure, haemoglobin, weight, malaria results, and danger signs
- Automatic risk scoring using evidence-based clinical rules
- **Fully Configurable Clinical Protocol**: UI controls for risk score weights, clinical thresholds/cutoffs, and alert badge colors
- **Robust Field Validation**: Client-side regex phone number validation, age, BP (systolic > diastolic), and Hb checks
- **Detailed Server Error Reporting**: Parses DHIS2 `validationReport` to display exact field validation errors
- Colour-coded risk alerts dashboard for high, moderate, and normal risk
- Patient visit history with blood pressure and haemoglobin trend charts
- Runtime configuration page for mapping metadata to any DHIS2 instance
- **Docker Stack**: Ready-to-use Docker Compose setup for local PostGIS + DHIS2 2.40.8 development
- **Comprehensive Unit Test Suite**: Automated unit tests for risk engine, form validation, and configuration schema
- Compatible with DHIS2 v2.38 and above (fully verified on v2.40.8)

## Risk engine

Default clinical scoring weights (customizable via Configuration UI):

| Rule | Default Score | Category |
|---|---|---|
| Severe hypertension (BP 160/110 or above) | +50 | High |
| Severe anaemia (Hb below 7 g/dL) | +45 | High |
| Active malaria infection | +40 | High |
| Hypertension (BP 140/90 or above) | +35 | High |
| Moderate anaemia (Hb 7.0-7.9 g/dL) | +30 | High |
| Late ANC booking (after week 13) | +20 to +30 | Moderate / High |
| Adolescent pregnancy (age under 18) | +25 | High |
| Danger signs reported | +25 per sign | High |
| Grand multiparity (parity 4 or more) | +15 | Moderate |
| Previous obstetric complications | +15 to +25 | Moderate / High |

## Tech stack

- DHIS2 App Platform & UI Library
- React 18 & React Router v6
- Recharts v2 for clinical trend visualization
- DHIS2 Tracker APIs (v2.38 - v2.40+ backward and forward compatible)
- Jest & React Testing Library for automated testing
- Docker Compose (PostgreSQL 15 PostGIS + DHIS2 Core 2.40.8)

## Setup

### Requirements

- Node.js v20 or higher
- A running DHIS2 instance v2.38 or above (or use our local Docker stack)
- `curl` and `base64` tools if running setup scripts

### Quickstart with Docker (Local DHIS2 Stack)

Spins up a local PostgreSQL 15 PostGIS container and DHIS2 Core 2.40.8 container on `http://localhost:8080`:

```bash
# Start Docker services
docker-compose up -d

# Seed metadata & org units (in PowerShell or Bash)
.\setup-dhis2.ps1

# Start the dev server
npm start
```

Default credentials:
- Username: `admin`
- Password: `district`

### Install Dependencies

```bash
git clone https://github.com/mljadama/maternal-health-risk-alert.git
cd maternal-health-risk-alert
npm install
```

### Configure DHIS2 metadata

The app requires a Tracker program with ANC visits. You can either:

**Option 1: Use the setup script (recommended)**

Windows (PowerShell):
```powershell
.\setup-dhis2.ps1
```

macOS/Linux (Bash):
```bash
chmod +x setup-dhis2.sh
./setup-dhis2.sh
```

These scripts detect existing root organisation units (`level=1`) in your DHIS2 server and attach demo health facilities under them.

**Option 2: Manual configuration**

1. Find your program's UID in DHIS2 Maintenance → Tracker programs
2. Open the app's **Configuration** page
3. Map the Program, Program Stage, Tracked Entity Type, attribute, and data element UIDs
4. Customize risk score weights, decision thresholds, and alert badge colors if desired
5. Save the configuration to `dataStore`

## Testing

Run the automated unit test suite:

```bash
npm test -- --watchAll=false
```

Tests cover:
- **`riskEngine.test.js`**: All clinical scoring rules, thresholds, multi-factor calculations, and dynamic weight overrides.
- **`validationUtils.test.js`**: Form input validators, regex phone checkers, BP systolic vs diastolic rules, and range bounds.
- **`appSettings.test.js`**: DHIS2 `dataStore` configuration normalization and UID validation.

## Deployment

### Build and install into DHIS2

```bash
npm run build
curl.exe -X POST "http://your-dhis2/api/apps" -u "admin:password" \
  -F "file=@build/bundle/Maternal Health Risk Alert-1.0.3.zip"
```

## License

BSD 3-Clause
