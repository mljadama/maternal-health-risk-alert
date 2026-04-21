#!/bin/bash

# setup-dhis2.sh
# Cross-platform setup script for macOS and Linux
# Run this any time the demo server resets.
# Place this file in the project root next to package.json
# Then run: chmod +x setup-dhis2.sh && ./setup-dhis2.sh

SERVER="http://localhost:8080"
USER="admin"
PASS="district"
ADMIN_UID="xE7jOejl9FI"

BASE="$SERVER/api"

# Helper function to POST JSON to DHIS2 API
post_json() {
    local path="$1"
    local obj="$2"
    local creds=$(echo -n "$USER:$PASS" | base64)
    
    local response=$(curl -s -X POST \
        "$BASE/$path" \
        -H "Authorization: Basic $creds" \
        -H "Content-Type: application/json" \
        -d "$obj")
    
    # Extract UID from response
    echo "$response" | grep -o '"uid":"[a-zA-Z0-9]\{11\}"' | head -1 | cut -d'"' -f4
}

# Helper function to PUT JSON to DHIS2 API
put_json() {
    local path="$1"
    local obj="$2"
    local creds=$(echo -n "$USER:$PASS" | base64)
    
    curl -s -X PUT \
        "$BASE/$path" \
        -H "Authorization: Basic $creds" \
        -H "Content-Type: application/json" \
        -d "$obj" > /dev/null
}

# Helper function to share resource
share() {
    local type="$1"
    local uid="$2"
    
    put_json "$type/$uid/sharing" '{"object":{"publicAccess":"rwrw----"}}'
}

echo ""
echo "============================================"
echo "  Maternal Health Risk Alert - DHIS2 Setup"
echo "============================================"
echo ""

# ── Step 1: Organisation Units ────────────────────────────────
echo "Step 1: Organisation units..."

gid=$(post_json "organisationUnits" \
    '{"name":"The Gambia","shortName":"Gambia","code":"GMB","openingDate":"1965-02-18"}')
echo "  The Gambia: $gid"

# Helper function to create hospital
make_hospital() {
    local name="$1"
    local short="$2"
    local code="$3"
    local date="$4"
    
    post_json "organisationUnits" \
        "{\"name\":\"$name\",\"shortName\":\"$short\",\"code\":\"$code\",\"openingDate\":\"$date\",\"parent\":{\"id\":\"$gid\"}}"
}

h1=$(make_hospital "Serrekunda General Hospital" "Serrekunda GH" "GMB001" "1975-01-01")
h2=$(make_hospital "Brikama Health Centre" "Brikama HC" "GMB002" "1980-01-01")
h3=$(make_hospital "Royal Victoria Teaching Hospital" "RVTH" "GMB003" "1923-01-01")
h4=$(make_hospital "Edward Francis Small Teaching Hospital" "EFSTH" "GMB004" "1923-01-01")
h5=$(make_hospital "Farafenni Hospital" "Farafenni Hosp" "GMB005" "1966-01-01")
h6=$(make_hospital "Bundung MCH Hospital" "Bundung MCH" "GMB006" "1989-01-01")

echo "  Serrekunda GH:  $h1"
echo "  Brikama HC:     $h2"
echo "  RVTH:           $h3"
echo "  EFSTH:          $h4"
echo "  Farafenni:      $h5"
echo "  Bundung MCH:    $h6"

# Assign all org units to admin user
for uid in "$gid" "$h1" "$h2" "$h3" "$h4" "$h5" "$h6"; do
    curl -s -X POST \
        "$BASE/users/$ADMIN_UID/organisationUnits/$uid" \
        -H "Authorization: Basic $(echo -n "$USER:$PASS" | base64)" \
        -H "Content-Type: application/json" > /dev/null 2>&1
done
echo "  Assigned to admin user"

# ── Step 2: Tracked Entity Attributes ────────────────────────
echo ""
echo "Step 2: Tracked entity attributes..."

make_attr() {
    local name="$1"
    local short="$2"
    local type="$3"
    
    post_json "trackedEntityAttributes" \
        "{\"name\":\"$name\",\"shortName\":\"$short\",\"valueType\":\"$type\",\"aggregationType\":\"NONE\"}"
}

a1=$(make_attr "GMB Full Name" "GMB Full Name" "TEXT")
a2=$(make_attr "GMB Age" "GMB Age" "NUMBER")
a3=$(make_attr "GMB Village" "GMB Village" "TEXT")
a4=$(make_attr "GMB Phone Number" "GMB Phone" "PHONE_NUMBER")
a5=$(make_attr "GMB Parity" "GMB Parity" "NUMBER")
a6=$(make_attr "GMB Previous Complications" "GMB Prev Complications" "TEXT")

echo "  Full Name:           $a1"
echo "  Age:                 $a2"
echo "  Village:             $a3"
echo "  Phone:               $a4"
echo "  Parity:              $a5"
echo "  Prev Complications:  $a6"

# ── Step 3: Data Elements ─────────────────────────────────────
echo ""
echo "Step 3: Data elements..."

make_de() {
    local name="$1"
    local short="$2"
    local type="$3"
    
    post_json "dataElements" \
        "{\"name\":\"$name\",\"shortName\":\"$short\",\"valueType\":\"$type\",\"domainType\":\"TRACKER\",\"aggregationType\":\"NONE\"}"
}

d1=$(make_de "GMB BP Systolic" "GMB BP Systolic" "NUMBER")
d2=$(make_de "GMB BP Diastolic" "GMB BP Diastolic" "NUMBER")
d3=$(make_de "GMB Haemoglobin" "GMB Haemoglobin" "NUMBER")
d4=$(make_de "GMB Weight" "GMB Weight" "NUMBER")
d5=$(make_de "GMB Gestational Age" "GMB Gestational Age" "NUMBER")
d6=$(make_de "GMB Visit Number" "GMB Visit Number" "NUMBER")
d7=$(make_de "GMB Malaria Test Result" "GMB Malaria Result" "TEXT")
d8=$(make_de "GMB Iron Supplementation" "GMB Iron Suppl" "TRUE_ONLY")
d9=$(make_de "GMB Folic Acid" "GMB Folic Acid" "TRUE_ONLY")
d10=$(make_de "GMB Nurse Notes" "GMB Nurse Notes" "TEXT")
d11=$(make_de "GMB Danger Signs" "GMB Danger Signs" "TEXT")
d12=$(make_de "GMB Next Visit Date" "GMB Next Visit Date" "DATE")

echo "  BP Systolic:      $d1"
echo "  BP Diastolic:     $d2"
echo "  Haemoglobin:      $d3"
echo "  Weight:           $d4"
echo "  Gestational Age:  $d5"
echo "  Visit Number:     $d6"
echo "  Malaria Result:   $d7"
echo "  Iron Suppl:       $d8"
echo "  Folic Acid:       $d9"
echo "  Nurse Notes:      $d10"
echo "  Danger Signs:     $d11"
echo "  Next Visit Date:  $d12"

# ── Step 4: Program ───────────────────────────────────────────
echo ""
echo "Step 4: Creating ANC program..."

prog_uid=$(post_json "programs" \
'{
  "name":"GMB Antenatal Care",
  "shortName":"GMB ANC",
  "programType":"WITH_REGISTRATION",
  "trackedEntityType":{"id":"nEenWmSyUEp"},
  "organisationUnits":[
    {"id":"'"$gid"'"},{"id":"'"$h1"'"},{"id":"'"$h2"'"},
    {"id":"'"$h3"'"},{"id":"'"$h4"'"},{"id":"'"$h5"'"},{"id":"'"$h6"'"}
  ],
  "programTrackedEntityAttributes":[
    {"trackedEntityAttribute":{"id":"'"$a1"'"},"mandatory":true,"displayInList":true,"sortOrder":1},
    {"trackedEntityAttribute":{"id":"'"$a2"'"},"mandatory":true,"displayInList":true,"sortOrder":2},
    {"trackedEntityAttribute":{"id":"'"$a3"'"},"mandatory":true,"displayInList":true,"sortOrder":3},
    {"trackedEntityAttribute":{"id":"'"$a4"'"},"mandatory":false,"displayInList":true,"sortOrder":4},
    {"trackedEntityAttribute":{"id":"'"$a5"'"},"mandatory":true,"displayInList":true,"sortOrder":5},
    {"trackedEntityAttribute":{"id":"'"$a6"'"},"mandatory":false,"displayInList":true,"sortOrder":6}
  ]
}')

echo "  Program UID: $prog_uid"
share "programs" "$prog_uid"

# ── Step 5: Program Stage ─────────────────────────────────────
echo ""
echo "Step 5: Creating ANC visit program stage..."

stage_uid=$(post_json "programStages" \
'{
  "name":"GMB ANC Visit",
  "program":{"id":"'"$prog_uid"'"},
  "sortOrder":1,
  "repeatable":true,
  "programStageDataElements":[
    {"dataElement":{"id":"'"$d1"'"},"compulsory":true,"sortOrder":1},
    {"dataElement":{"id":"'"$d2"'"},"compulsory":true,"sortOrder":2},
    {"dataElement":{"id":"'"$d3"'"},"compulsory":true,"sortOrder":3},
    {"dataElement":{"id":"'"$d4"'"},"compulsory":true,"sortOrder":4},
    {"dataElement":{"id":"'"$d5"'"},"compulsory":true,"sortOrder":5},
    {"dataElement":{"id":"'"$d6"'"},"compulsory":false,"sortOrder":6},
    {"dataElement":{"id":"'"$d7"'"},"compulsory":false,"sortOrder":7},
    {"dataElement":{"id":"'"$d8"'"},"compulsory":false,"sortOrder":8},
    {"dataElement":{"id":"'"$d9"'"},"compulsory":false,"sortOrder":9},
    {"dataElement":{"id":"'"$d10"'"},"compulsory":false,"sortOrder":10},
    {"dataElement":{"id":"'"$d11"'"},"compulsory":false,"sortOrder":11},
    {"dataElement":{"id":"'"$d12"'"},"compulsory":false,"sortOrder":12}
  ]
}')

echo "  Program Stage UID: $stage_uid"
share "programStages" "$stage_uid"

# ── Step 6: Write dhis2.js ────────────────────────────────────
echo ""
echo "Step 6: Writing src/config/dhis2.js..."

cat > src/config/dhis2.js << EOF
// src/config/dhis2.js
// AUTO-GENERATED by setup-dhis2.sh

export const PROGRAM       = { id: '$prog_uid',  name: 'GMB Antenatal Care' }
export const PROGRAM_STAGE = { id: '$stage_uid', name: 'GMB ANC Visit' }
export const TRACKED_ENTITY_TYPE = 'nEenWmSyUEp'

export const ORG_UNITS = {
    theGambia:     '$gid',
    serrекundaGH:  '$h1',
    brikаmaHC:     '$h2',
    royalVictoria: '$h3',
    edwardFrancis: '$h4',
    farafenni:     '$h5',
    bundungMCH:    '$h6',
}

export const ATTRIBUTES = {
    fullName:              '$a1',
    age:                   '$a2',
    village:               '$a3',
    phoneNumber:           '$a4',
    parity:                '$a5',
    previousComplications: '$a6',
}

export const DATA_ELEMENTS = {
    bpSystolic:          '$d1',
    bpDiastolic:         '$d2',
    haemoglobin:         '$d3',
    weight:              '$d4',
    gestationalAge:      '$d5',
    visitNumber:         '$d6',
    malariaTestResult:   '$d7',
    ironSupplementation: '$d8',
    folicAcid:           '$d9',
    nurseNotes:          '$d10',
    dangerSigns:         '$d11',
    nextVisitDate:       '$d12',
}

export const THRESHOLDS = {
    AGE_MIN: 18, AGE_MAX: 35,
    BP_SYSTOLIC_HIGH: 140, BP_DIASTOLIC_HIGH: 90,
    BP_SYSTOLIC_SEVERE: 160, BP_DIASTOLIC_SEVERE: 110,
    HB_NORMAL_MIN: 11.0, HB_MODERATE_ANAEMIA: 8.0, HB_SEVERE_ANAEMIA: 7.0,
    ANC_MINIMUM_VISITS: 4, FIRST_TRIMESTER_WEEKS: 13,
    GRAND_MULTIPARA_THRESHOLD: 4, SCORE_HIGH: 40, SCORE_MODERATE: 20,
}

export const MALARIA_RESULTS = [
    'Negative', 'Positive (P. falciparum)', 'Positive (P. vivax)', 'Not done',
]

export const DANGER_SIGN_OPTIONS = [
    'Severe headache', 'Blurred vision', 'Severe abdominal pain',
    'Vaginal bleeding', 'Convulsions', 'Difficulty breathing',
    'Reduced fetal movement', 'Swelling of face/hands',
]

export const COMPLICATION_OPTIONS = [
    'None', 'Pre-eclampsia', 'Gestational diabetes', 'Placenta previa',
    'Previous C-section', 'Postpartum haemorrhage', 'Anaemia',
    'Preterm birth', 'Stillbirth', 'Miscarriage',
]

export const RISK_COLORS = {
    high:     { main: '#dc2626', light: '#fef2f2', border: '#fecaca', dark: '#991b1b' },
    moderate: { main: '#d97706', light: '#fffbeb', border: '#fde68a', dark: '#92400e' },
    normal:   { main: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', dark: '#14532d' },
}
EOF

echo "  Written successfully"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  SETUP COMPLETE"
echo "============================================"
echo ""
echo "  Program UID:        $prog_uid"
echo "  Program Stage UID:  $stage_uid"
echo ""
echo "  Next steps:"
echo "  1. Restart:    npm start"
echo "  2. Build:      npm run build"
echo ""
