# Maternal Health Risk Alert

A DHIS2 app for antenatal care. Clinic staff register pregnant women, record visits, and get a colour-coded risk result as soon as the data is saved.

It works on **any** DHIS2 instance. Map it to your antenatal Tracker program, then use it like other DHIS2 apps from the apps menu.

- **High risk** — needs urgent attention
- **Moderate risk** — needs closer follow-up
- **Normal** — continue the usual antenatal schedule

## Requirements

- DHIS2 **2.38** or later (verified on **2.40.8**)
- An antenatal **Tracker** program (with registration)
- Permission to use that program, and to save the app setting `maternal_health_risk_alert` / `config`
- Users assigned to the health facilities (organisation units) they work in

## Install

Install it the same way as other DHIS2 apps.

1. Open **App Management** in DHIS2.
2. Install **Maternal Health Risk Alert** from [App Hub](https://apps.dhis2.org/?query=Maternal%20Health%20Risk%20Alert), or upload the zip from a [release build](#build-a-zip).
3. Open the app from the DHIS2 apps menu.
4. Complete **Configuration** once before anyone registers patients.

If Configuration cannot save, ask a DHIS2 administrator to grant dataStore write access for this app.

## Configure (once per server)

The app does not ship with one country’s metadata. On first use, map **your** program.

1. Open **Configuration**.
2. Select your antenatal **tracker program** and visit **program stage**.
3. Map attributes (name, age, community/area, phone, parity, previous complications) and visit data elements (blood pressure, haemoglobin, weight, gestational age, and the rest).
4. Optionally change risk scores, cutoffs, and colours.
5. Save. Settings stay on that DHIS2 server.

Until this mapping is valid, patient pages stay locked so the app cannot write to the wrong program.

In DHIS2 **Users**, assign each nurse or midwife to the facilities they capture data for. The Register Patient facility list only shows organisation units assigned to the logged-in user.

## Use the app

| Page | What it is for |
|---|---|
| **Dashboard** | Pregnancies, risk counts (high / moderate / normal), ANC completion, and charts |
| **Register Patient** | New enrolment. This **is the first ANC visit**, so gestational age, blood pressure, haemoglobin, and weight are required |
| **Patients** | Search and open a record |
| **Record visit** | Later ANC visits (visit 2 onwards) |
| **Risk Alerts** | High and moderate cases that need follow-up |
| **Configuration** | Program mapping and risk rules (usually an administrator) |

Phone number is optional. If entered, it must be a valid number.

Patients and visits are stored in **your** DHIS2 Tracker program. Other countries install the same app on their own server and map their own program and facilities.

### Screenshots

![Dashboard](screenshots/screenshot-dashboard.png)

![Patients list](screenshots/screenshot-patients.png)

![Register patient](screenshots/screenshot-register.png)

![Risk alerts](screenshots/screenshot-risk-alert.png)

## Default risk scores

These are the built-in scores. Change them in Configuration if your protocol differs.

| Rule | Default score | Typical level |
|---|---|---|
| Severe hypertension (BP 160/110 or above) | +50 | High |
| Severe anaemia (Hb below 7 g/dL) | +45 | High |
| Active malaria infection | +40 | High |
| Hypertension (BP 140/90 or above) | +35 | High |
| Moderate anaemia (Hb below 8 g/dL) | +30 | High |
| Late ANC booking (after week 13) | +20 to +30 | Moderate / High |
| Adolescent pregnancy (age under 18) | +25 | High |
| Insufficient ANC visits | +25 | High |
| Danger signs reported | +25 per sign | High |
| Mild anaemia (Hb below 11 g/dL) | +20 | Moderate |
| Advanced maternal age (over 35) | +20 | Moderate |
| Grand multiparity (parity 4 or more) | +15 | Moderate |
| Previous obstetric complications | +15 to +25 | Moderate / High |

Default cutoffs: total score **40 or more** is high risk; **20 or more** is moderate risk.

## For developers

You need **Node.js 20+**. For the bundled demo server you also need **Docker**.

```bash
git clone https://github.com/mljadama/maternal-health-risk-alert.git
cd maternal-health-risk-alert
npm install
```

### Run against Docker DHIS2 on this machine

```bash
docker compose up -d
```

Wait until DHIS2 answers at `http://localhost:8080` (first start can take several minutes). Log in with `admin` / `district`, then seed demo metadata:

```bash
# Linux and macOS
chmod +x setup-dhis2.sh
./setup-dhis2.sh
```

```powershell
# Windows
.\setup-dhis2.ps1
```

The script attaches two demo clinics under an existing country-level organisation unit. It only creates a new root organisation unit if the server has none. Do not run this against a live national server.

Then:

```bash
npm start
```

Open **http://localhost:3001**. On the sign-in form set **Server** to `http://localhost:3001`, username `admin`, password `district`.

Do not use `:8080` or `:8081` as the Server URL (that causes a CORS error). If login still uses those ports, clear site data for `http://localhost:3001` or delete `DHIS2_BASE_URL` from local storage and refresh.

### Run against your own DHIS2

Start the app with `npm start` and point the Server field at `http://localhost:3001` while the Vite proxy forwards `/api` to your instance (default `http://localhost:8080` in `vite.config.js`).

### Tests

```bash
npm test -- --watchAll=false
```

### Build a zip

```bash
npm run build
```

The zip is written under `build/bundle/`. Install it in DHIS2 **App Management**, or upload it with:

```bash
curl -u "admin:district" -X POST "http://localhost:8080/api/apps" \
  -F "file=@build/bundle/Maternal Health Risk Alert-1.0.4.zip"
```

Replace the URL, username, and password for your server.

## License

BSD 3-Clause. See [LICENSE](LICENSE).
