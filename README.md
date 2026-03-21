# Maternal Health Risk Alert System

A DHIS2 web application that automatically identifies high-risk pregnancies during antenatal care in The Gambia.

## What it does

Registers pregnant women in DHIS2 Tracker, records ANC visit data, and runs a real-time risk engine that flags high-risk patients so health workers know who needs urgent attention — without any manual review.

## Features

- Register patients and enroll in ANC program
- Record ANC visits with clinical measurements
- Automatic risk scoring using 9 clinical rules
- Colour-coded risk alerts dashboard
- Patient visit history with trend charts

## Tech stack

- DHIS2 App Platform
- React 18 and React Router v6
- Material UI v5
- Recharts
- DHIS2 Tracker API v42

## Setup

### Requirements

- Node.js v20+
- A running DHIS2 instance (v2.38+)

### Install

```bash
git clone https://github.com/YOUR_USERNAME/maternal-health-risk-alert.git
cd maternal-health-risk-alert
npm install
```

### Configure DHIS2 metadata

Update the server URL in `setup-dhis2.ps1` then run:

.\setup-dhis2.ps1

This creates the ANC Program, Program Stage, and all Data Elements on your DHIS2 instance and writes the UIDs to `src/config/dhis2.js` automatically.

### Start

```bash
npm start
```

Log in at `http://localhost:3000` with your DHIS2 credentials.

## Why it was built

The Gambia recorded 130 maternal deaths in 2025. Most were caused by conditions detectable early — pre-eclampsia, anaemia, malaria, late booking. No existing DHIS2 tool automatically scores individual pregnancy risk at the point of care. This app fills that gap.
