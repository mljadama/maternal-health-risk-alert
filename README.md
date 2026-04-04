# Maternal Health Risk Alert System

A DHIS2 web application that automatically identifies high-risk pregnancies during antenatal care in The Gambia.

## Screenshots

### Dashboard
![Dashboard](screenshots/screenshot-dashboard.png)

### Patient List
![Patient List](screenshots/screenshot-patients.png)

### Patient Detail
![Patient Detail](screenshots/screenshot-patient-detail.png)

### Risk Alerts
![Risk Alerts](screenshots/screenshot-risk-alerts.png)

### Register Patient
![Register](screenshots/screenshot-register.png)

## What it does

Health workers in Gambian clinics see 20 to 50 pregnant women every day. Identifying high-risk patients currently requires manual review of paper registers. High-risk cases are often identified too late.

This application automatically analyses every patient clinical data and flags high-risk pregnancies in real time the moment new data is entered. No manual analysis required.

## Features

- Register pregnant women as Tracked Entity Instances in DHIS2 Tracker
- Record ANC visits with blood pressure, haemoglobin, weight, malaria results and danger signs
- Automatic risk scoring using 9 evidence-based clinical rules
- Colour-coded risk alerts dashboard showing high, moderate and normal risk
- Patient visit history with blood pressure and haemoglobin trend charts
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
- Material UI v5
- Recharts v2
- DHIS2 Tracker API v42

## Setup

### Requirements

- Node.js v20 or higher
- A running DHIS2 instance v2.38 or above

### Install
```bash
git clone https://github.com/mljadama/maternal-health-risk-alert.git
cd maternal-health-risk-alert
npm install
```

### Configure DHIS2 metadata

Update the server URL in setup-dhis2.ps1 then run:
```powershell
.\setup-dhis2.ps1
```

This creates the ANC Program, Program Stage, Tracked Entity Attributes and Data Elements automatically.

### Build and install into DHIS2
```bash
npm run build
curl.exe -X POST "http://your-dhis2/api/apps" -u "admin:password" -F "file=@build/bundle/Maternal Health Risk Alert-1.0.0.zip"
```

## Why this was built

The Gambia recorded 130 maternal deaths in 2025. The leading causes are pre-eclampsia, severe anaemia, malaria in pregnancy, and late ANC booking. All are detectable early if the right data is tracked. No existing DHIS2 tool automatically scores individual pregnancy risk at the point of care. This application fills that gap.

## Submitted to

DHIS2 Annual Conference 2026 App Competition

## License

BSD 3-Clause