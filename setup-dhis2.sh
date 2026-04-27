#!/bin/bash

# setup-dhis2.sh
# Run this any time the demo server resets.
# Place this file in the project root next to package.json
# Then run: chmod +x setup-dhis2.sh && ./setup-dhis2.sh

set -u

SERVER="http://localhost:8080"
USER="admin"
PASS="district"

BASE="$SERVER/api"

get_creds() {
    echo -n "$USER:$PASS" | base64
}

api_get() {
    local path="$1"
    local creds
    creds=$(get_creds)
    curl -s -X GET "$BASE/$path" -H "Authorization: Basic $creds"
}

post_json() {
    local path="$1"
    local obj="$2"
    local creds
    creds=$(get_creds)

    local response
    response=$(curl -s -X POST \
        "$BASE/$path" \
        -H "Authorization: Basic $creds" \
        -H "Content-Type: application/json" \
        -d "$obj")

    local uid
    uid=$(echo "$response" | grep -o '"uid":"[A-Za-z0-9]\{11\}"' | head -1 | cut -d'"' -f4)
    if [ -n "$uid" ]; then
        echo "$uid"
        return 0
    fi

    local err
    err=$(echo "$response" | tr '\n' ' ' | sed 's/  */ /g' | cut -c1-220)
    echo "  ERROR $path : $err" >&2
    return 1
}

put_json() {
    local path="$1"
    local obj="$2"
    local creds
    creds=$(get_creds)
    curl -s -X PUT \
        "$BASE/$path" \
        -H "Authorization: Basic $creds" \
        -H "Content-Type: application/json" \
        -d "$obj" > /dev/null 2>&1
}

share() {
    local type="$1"
    local uid="$2"
    put_json "$type/$uid/sharing" '{"object":{"publicAccess":"rwrw----"}}'
}

require_uid() {
    local label="$1"
    local value="$2"
    if [ -z "$value" ]; then
        echo "ERROR: $label was not created successfully." >&2
        exit 1
    fi
}

get_first_id() {
    local resource="$1"
    local fields="$2"
    local filter="$3"
    local creds
    creds=$(get_creds)

    local response
    response=$(curl -sG \
        "$BASE/$resource" \
        -H "Authorization: Basic $creds" \
        --data-urlencode "fields=$fields" \
        --data-urlencode "paging=false" \
        --data-urlencode "filter=$filter")

    echo "$response" | grep -o '"id":"[A-Za-z0-9]\{11\}"' | head -1 | cut -d'"' -f4
}

get_user_id_by_username() {
    get_first_id "users" "id,username" "username:eq:$1"
}

assign_user_org_unit_scopes() {
    local user_id="$1"
    local ou_id="$2"
    local creds
    creds=$(get_creds)

    curl -s -X POST "$BASE/users/$user_id/organisationUnits/$ou_id" -H "Authorization: Basic $creds" -H "Content-Type: application/json" > /dev/null 2>&1
    curl -s -X POST "$BASE/users/$user_id/dataViewOrganisationUnits/$ou_id" -H "Authorization: Basic $creds" -H "Content-Type: application/json" > /dev/null 2>&1
    curl -s -X POST "$BASE/users/$user_id/teiSearchOrganisationUnits/$ou_id" -H "Authorization: Basic $creds" -H "Content-Type: application/json" > /dev/null 2>&1
}

get_or_create_ou() {
    local code="$1"
    local obj="$2"

    local existing
    existing=$(get_first_id "organisationUnits" "id,code" "code:eq:$code")
    if [ -n "$existing" ]; then
        echo "  (existing) $code : $existing" >&2
        echo "$existing"
        return 0
    fi

    local created
    created=$(post_json "organisationUnits" "$obj" 2>/dev/null || true)
    if [ -n "$created" ]; then
        echo "$created"
        return 0
    fi

    existing=$(get_first_id "organisationUnits" "id,code" "code:eq:$code")
    if [ -n "$existing" ]; then
        echo "  (existing after conflict) $code : $existing" >&2
        echo "$existing"
        return 0
    fi

    echo ""
}

get_or_create_attr() {
    local name="$1"
    local short="$2"
    local obj="$3"

    local existing
    existing=$(get_first_id "trackedEntityAttributes" "id,name,shortName" "name:eq:$name")
    if [ -z "$existing" ] && [ -n "$short" ]; then
        existing=$(get_first_id "trackedEntityAttributes" "id,name,shortName" "shortName:eq:$short")
    fi
    if [ -n "$existing" ]; then
        echo "  (existing) $name : $existing" >&2
        echo "$existing"
        return 0
    fi

    local created
    created=$(post_json "trackedEntityAttributes" "$obj" 2>/dev/null || true)
    if [ -n "$created" ]; then
        echo "$created"
        return 0
    fi

    existing=$(get_first_id "trackedEntityAttributes" "id,name,shortName" "name:eq:$name")
    if [ -z "$existing" ] && [ -n "$short" ]; then
        existing=$(get_first_id "trackedEntityAttributes" "id,name,shortName" "shortName:eq:$short")
    fi
    if [ -n "$existing" ]; then
        echo "  (existing after conflict) $name : $existing" >&2
        echo "$existing"
        return 0
    fi

    echo ""
}

get_or_create_de() {
    local name="$1"
    local short="$2"
    local obj="$3"

    local existing
    existing=$(get_first_id "dataElements" "id,name,shortName" "name:eq:$name")
    if [ -z "$existing" ] && [ -n "$short" ]; then
        existing=$(get_first_id "dataElements" "id,name,shortName" "shortName:eq:$short")
    fi
    if [ -n "$existing" ]; then
        echo "  (existing) $name : $existing" >&2
        echo "$existing"
        return 0
    fi

    local created
    created=$(post_json "dataElements" "$obj" 2>/dev/null || true)
    if [ -n "$created" ]; then
        echo "$created"
        return 0
    fi

    existing=$(get_first_id "dataElements" "id,name,shortName" "name:eq:$name")
    if [ -z "$existing" ] && [ -n "$short" ]; then
        existing=$(get_first_id "dataElements" "id,name,shortName" "shortName:eq:$short")
    fi
    if [ -n "$existing" ]; then
        echo "  (existing after conflict) $name : $existing" >&2
        echo "$existing"
        return 0
    fi

    echo ""
}

get_or_create_tet() {
    local name="$1"
    local short="$2"
    local obj="$3"

    local existing
    existing=$(get_first_id "trackedEntityTypes" "id,name,shortName" "name:eq:$name")
    if [ -z "$existing" ] && [ -n "$short" ]; then
        existing=$(get_first_id "trackedEntityTypes" "id,name,shortName" "shortName:eq:$short")
    fi
    if [ -n "$existing" ]; then
        echo "  (existing) $name : $existing" >&2
        echo "$existing"
        return 0
    fi

    local created
    created=$(post_json "trackedEntityTypes" "$obj" 2>/dev/null || true)
    if [ -n "$created" ]; then
        echo "$created"
        return 0
    fi

    existing=$(get_first_id "trackedEntityTypes" "id,name,shortName" "name:eq:$name")
    if [ -z "$existing" ] && [ -n "$short" ]; then
        existing=$(get_first_id "trackedEntityTypes" "id,name,shortName" "shortName:eq:$short")
    fi
    if [ -n "$existing" ]; then
        echo "  (existing after conflict) $name : $existing" >&2
        echo "$existing"
        return 0
    fi

    echo ""
}

get_or_create_program() {
    local name="$1"
    local short="$2"
    local obj="$3"

    local existing
    existing=$(get_first_id "programs" "id,name,shortName" "name:eq:$name")
    if [ -z "$existing" ] && [ -n "$short" ]; then
        existing=$(get_first_id "programs" "id,name,shortName" "shortName:eq:$short")
    fi
    if [ -n "$existing" ]; then
        echo "  (existing) $name : $existing" >&2
        echo "$existing"
        return 0
    fi

    local created
    created=$(post_json "programs" "$obj" 2>/dev/null || true)
    if [ -n "$created" ]; then
        echo "$created"
        return 0
    fi

    existing=$(get_first_id "programs" "id,name,shortName" "name:eq:$name")
    if [ -z "$existing" ] && [ -n "$short" ]; then
        existing=$(get_first_id "programs" "id,name,shortName" "shortName:eq:$short")
    fi
    if [ -n "$existing" ]; then
        echo "  (existing after conflict) $name : $existing" >&2
        echo "$existing"
        return 0
    fi

    echo ""
}

get_or_create_stage() {
    local name="$1"
    local obj="$2"

    local existing
    existing=$(get_first_id "programStages" "id,name" "name:eq:$name")
    if [ -n "$existing" ]; then
        echo "  (existing) $name : $existing" >&2
        echo "$existing"
        return 0
    fi

    local created
    created=$(post_json "programStages" "$obj" 2>/dev/null || true)
    if [ -n "$created" ]; then
        echo "$created"
        return 0
    fi

    existing=$(get_first_id "programStages" "id,name" "name:eq:$name")
    if [ -n "$existing" ]; then
        echo "  (existing after conflict) $name : $existing" >&2
        echo "$existing"
        return 0
    fi

    echo ""
}

upsert_datastore_config() {
    local namespace_key="$1"
    local payload="$2"
    local creds
    creds=$(get_creds)

    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
        "$BASE/dataStore/$namespace_key" \
        -H "Authorization: Basic $creds" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if [ "$code" = "200" ] || [ "$code" = "201" ] || [ "$code" = "204" ]; then
        return 0
    fi

    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        "$BASE/dataStore/$namespace_key" \
        -H "Authorization: Basic $creds" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if [ "$code" = "200" ] || [ "$code" = "201" ] || [ "$code" = "204" ]; then
        return 0
    fi

    return 1
}

echo ""
echo "============================================"
echo "  Maternal Health Risk Alert - DHIS2 Setup"
echo "============================================"
echo ""

ADMIN_UID=$(get_user_id_by_username "$USER")
require_uid "user id for username '$USER'" "$ADMIN_UID"
echo "Using user '$USER' UID: $ADMIN_UID"

# Step 1: Organisation Units
echo "Step 1: Organisation units..."

gid=$(get_or_create_ou "GMB" '{"name":"The Gambia","shortName":"Gambia","code":"GMB","openingDate":"1965-02-18"}')
require_uid "root organisation unit" "$gid"
echo "  The Gambia: $gid"

make_hospital() {
    local name="$1"
    local short="$2"
    local code="$3"
    local date="$4"
    get_or_create_ou "$code" "{\"name\":\"$name\",\"shortName\":\"$short\",\"code\":\"$code\",\"openingDate\":\"$date\",\"parent\":{\"id\":\"$gid\"}}"
}

h1=$(make_hospital "Serrekunda General Hospital" "Serrekunda GH" "GMB001" "1975-01-01")
h2=$(make_hospital "Brikama Health Centre" "Brikama HC" "GMB002" "1980-01-01")
h3=$(make_hospital "Royal Victoria Teaching Hospital" "RVTH" "GMB003" "1923-01-01")
h4=$(make_hospital "Edward Francis Small Teaching Hospital" "EFSTH" "GMB004" "1923-01-01")
h5=$(make_hospital "Farafenni Hospital" "Farafenni Hosp" "GMB005" "1966-01-01")
h6=$(make_hospital "Bundung MCH Hospital" "Bundung MCH" "GMB006" "1989-01-01")

require_uid "Serrekunda GH" "$h1"
require_uid "Brikama HC" "$h2"
require_uid "RVTH" "$h3"
require_uid "EFSTH" "$h4"
require_uid "Farafenni" "$h5"
require_uid "Bundung MCH" "$h6"

echo "  Serrekunda GH:  $h1"
echo "  Brikama HC:     $h2"
echo "  RVTH:           $h3"
echo "  EFSTH:          $h4"
echo "  Farafenni:      $h5"
echo "  Bundung MCH:    $h6"

all_ou=("$gid" "$h1" "$h2" "$h3" "$h4" "$h5" "$h6")
for uid in "${all_ou[@]}"; do
    assign_user_org_unit_scopes "$ADMIN_UID" "$uid"
done
echo "  Assigned to user org unit scopes"

# Force assign all org unit scopes via PATCH
creds=$(get_creds)
ou_json='[{"id":"'"$gid"'"},{"id":"'"$h1"'"},{"id":"'"$h2"'"},{"id":"'"$h3"'"},{"id":"'"$h4"'"},{"id":"'"$h5"'"},{"id":"'"$h6"'"}]'
patch_body='[
  {"op":"add","path":"/organisationUnits","value":'"$ou_json"'},
  {"op":"add","path":"/teiSearchOrganisationUnits","value":'"$ou_json"'},
  {"op":"add","path":"/dataViewOrganisationUnits","value":'"$ou_json"'}
]'
if curl -s -X PATCH \
    "$BASE/users/$ADMIN_UID" \
    -H "Authorization: Basic $creds" \
    -H "Content-Type: application/json-patch+json" \
    -d "$patch_body" > /dev/null 2>&1; then
    echo "  Org unit scopes patched successfully"
else
    echo "  WARN: Could not patch org unit scopes"
fi

# Step 2: Tracked Entity Type and Attributes
echo ""
echo "Step 2: Tracked entity type and attributes..."

tracked_entity_type_uid=$(get_or_create_tet "GMB Pregnant Woman" "GMB Mother" '{"name":"GMB Pregnant Woman","shortName":"GMB Mother"}')
require_uid "tracked entity type" "$tracked_entity_type_uid"
echo "  Tracked Entity Type: $tracked_entity_type_uid"

make_attr() {
    local name="$1"
    local short="$2"
    local type="$3"
    get_or_create_attr "$name" "$short" "{\"name\":\"$name\",\"shortName\":\"$short\",\"valueType\":\"$type\",\"aggregationType\":\"NONE\"}"
}

a1=$(make_attr "GMB Full Name" "GMB Full Name" "TEXT")
a2=$(make_attr "GMB Age" "GMB Age" "NUMBER")
a3=$(make_attr "GMB Village" "GMB Village" "TEXT")
a4=$(make_attr "GMB Phone Number" "GMB Phone" "PHONE_NUMBER")
a5=$(make_attr "GMB Parity" "GMB Parity" "NUMBER")
a6=$(make_attr "GMB Previous Complications" "GMB Prev Complications" "TEXT")

require_uid "GMB Full Name attribute" "$a1"
require_uid "GMB Age attribute" "$a2"
require_uid "GMB Village attribute" "$a3"
require_uid "GMB Phone attribute" "$a4"
require_uid "GMB Parity attribute" "$a5"
require_uid "GMB Previous Complications attribute" "$a6"

echo "  Full Name:           $a1"
echo "  Age:                 $a2"
echo "  Village:             $a3"
echo "  Phone:               $a4"
echo "  Parity:              $a5"
echo "  Prev Complications:  $a6"

# Step 3: Data Elements
echo ""
echo "Step 3: Data elements..."

make_de() {
    local name="$1"
    local short="$2"
    local type="$3"
    get_or_create_de "$name" "$short" "{\"name\":\"$name\",\"shortName\":\"$short\",\"valueType\":\"$type\",\"domainType\":\"TRACKER\",\"aggregationType\":\"NONE\"}"
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

require_uid "BP Systolic data element" "$d1"
require_uid "BP Diastolic data element" "$d2"
require_uid "Haemoglobin data element" "$d3"
require_uid "Weight data element" "$d4"
require_uid "Gestational Age data element" "$d5"
require_uid "Visit Number data element" "$d6"
require_uid "Malaria Result data element" "$d7"
require_uid "Iron Supplementation data element" "$d8"
require_uid "Folic Acid data element" "$d9"
require_uid "Nurse Notes data element" "$d10"
require_uid "Danger Signs data element" "$d11"
require_uid "Next Visit Date data element" "$d12"

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

# Step 4: Program
echo ""
echo "Step 4: Creating ANC program..."

prog_payload=$(cat <<EOF
{
  "name":"GMB Antenatal Care",
  "shortName":"GMB ANC",
  "programType":"WITH_REGISTRATION",
  "trackedEntityType":{"id":"$tracked_entity_type_uid"},
  "organisationUnits":[
    {"id":"$gid"},{"id":"$h1"},{"id":"$h2"},
    {"id":"$h3"},{"id":"$h4"},{"id":"$h5"},{"id":"$h6"}
  ],
  "programTrackedEntityAttributes":[
    {"trackedEntityAttribute":{"id":"$a1"},"mandatory":true,"displayInList":true,"sortOrder":1},
    {"trackedEntityAttribute":{"id":"$a2"},"mandatory":true,"displayInList":true,"sortOrder":2},
    {"trackedEntityAttribute":{"id":"$a3"},"mandatory":true,"displayInList":true,"sortOrder":3},
    {"trackedEntityAttribute":{"id":"$a4"},"mandatory":false,"displayInList":true,"sortOrder":4},
    {"trackedEntityAttribute":{"id":"$a5"},"mandatory":true,"displayInList":true,"sortOrder":5},
    {"trackedEntityAttribute":{"id":"$a6"},"mandatory":false,"displayInList":true,"sortOrder":6}
  ]
}
EOF
)
prog_uid=$(get_or_create_program "GMB Antenatal Care" "GMB ANC" "$prog_payload")
require_uid "program" "$prog_uid"
echo "  Program UID: $prog_uid"
share "programs" "$prog_uid"

# Step 5: Program Stage
echo ""
echo "Step 5: Creating ANC visit program stage..."

stage_payload=$(cat <<EOF
{
  "name":"GMB ANC Visit",
  "program":{"id":"$prog_uid"},
  "sortOrder":1,
  "repeatable":true,
  "programStageDataElements":[
    {"dataElement":{"id":"$d1"},"compulsory":true,"sortOrder":1},
    {"dataElement":{"id":"$d2"},"compulsory":true,"sortOrder":2},
    {"dataElement":{"id":"$d3"},"compulsory":true,"sortOrder":3},
    {"dataElement":{"id":"$d4"},"compulsory":true,"sortOrder":4},
    {"dataElement":{"id":"$d5"},"compulsory":true,"sortOrder":5},
    {"dataElement":{"id":"$d6"},"compulsory":false,"sortOrder":6},
    {"dataElement":{"id":"$d7"},"compulsory":false,"sortOrder":7},
    {"dataElement":{"id":"$d8"},"compulsory":false,"sortOrder":8},
    {"dataElement":{"id":"$d9"},"compulsory":false,"sortOrder":9},
    {"dataElement":{"id":"$d10"},"compulsory":false,"sortOrder":10},
    {"dataElement":{"id":"$d11"},"compulsory":false,"sortOrder":11},
    {"dataElement":{"id":"$d12"},"compulsory":false,"sortOrder":12}
  ]
}
EOF
)
stage_uid=$(get_or_create_stage "GMB ANC Visit" "$stage_payload")
require_uid "program stage" "$stage_uid"
echo "  Program Stage UID: $stage_uid"
share "programStages" "$stage_uid"

# Step 6: Seed runtime app configuration
echo ""
echo "Step 6: Seeding runtime app configuration..."

config_json=$(cat <<EOF
{
  "program": {"id": "$prog_uid", "name": "GMB Antenatal Care"},
  "programStage": {"id": "$stage_uid", "name": "GMB ANC Visit"},
  "trackedEntityType": {"id": "$tracked_entity_type_uid"},
  "attributes": {
    "fullName": "$a1",
    "age": "$a2",
    "village": "$a3",
    "phoneNumber": "$a4",
    "parity": "$a5",
    "previousComplications": "$a6"
  },
  "dataElements": {
    "bpSystolic": "$d1",
    "bpDiastolic": "$d2",
    "haemoglobin": "$d3",
    "weight": "$d4",
    "gestationalAge": "$d5",
    "visitNumber": "$d6",
    "malariaTestResult": "$d7",
    "ironSupplementation": "$d8",
    "folicAcid": "$d9",
    "nurseNotes": "$d10",
    "dangerSigns": "$d11",
    "nextVisitDate": "$d12"
  },
  "thresholds": {
    "AGE_MIN": 18, "AGE_MAX": 35,
    "BP_SYSTOLIC_HIGH": 140, "BP_DIASTOLIC_HIGH": 90,
    "BP_SYSTOLIC_SEVERE": 160, "BP_DIASTOLIC_SEVERE": 110,
    "HB_NORMAL_MIN": 11.0, "HB_MODERATE_ANAEMIA": 8.0, "HB_SEVERE_ANAEMIA": 7.0,
    "ANC_MINIMUM_VISITS": 4, "FIRST_TRIMESTER_WEEKS": 13,
    "GRAND_MULTIPARA_THRESHOLD": 4, "SCORE_HIGH": 40, "SCORE_MODERATE": 20
  },
  "malariaResults": ["Negative", "Positive (P. falciparum)", "Positive (P. vivax)", "Not done"],
  "dangerSignOptions": ["Severe headache", "Blurred vision", "Severe abdominal pain", "Vaginal bleeding", "Convulsions", "Difficulty breathing", "Reduced fetal movement", "Swelling of face/hands"],
  "complicationOptions": ["None", "Pre-eclampsia", "Gestational diabetes", "Placenta previa", "Previous C-section", "Postpartum haemorrhage", "Anaemia", "Preterm birth", "Stillbirth", "Miscarriage"],
  "riskColors": {
    "high": {"main": "#dc2626", "light": "#fef2f2", "border": "#fecaca", "dark": "#991b1b"},
    "moderate": {"main": "#d97706", "light": "#fffbeb", "border": "#fde68a", "dark": "#92400e"},
    "normal": {"main": "#16a34a", "light": "#f0fdf4", "border": "#bbf7d0", "dark": "#14532d"}
  }
}
EOF
)

if upsert_datastore_config "maternal_health_risk_alert/config" "$config_json"; then
    echo "  Configuration saved to dataStore"
else
    echo "ERROR: Could not save configuration to dataStore." >&2
    exit 1
fi

# Step 7: Write dhis2.js
echo ""
echo "Step 7: Writing src/config/dhis2.js..."

cat > src/config/dhis2.js << EOF
// src/config/dhis2.js
// AUTO-GENERATED by setup-dhis2.sh

export const PROGRAM       = { id: '$prog_uid',  name: 'GMB Antenatal Care' }
export const PROGRAM_STAGE = { id: '$stage_uid', name: 'GMB ANC Visit' }
export const TRACKED_ENTITY_TYPE = '$tracked_entity_type_uid'

export const ORG_UNITS = {
    theGambia:     '$gid',
    serrekundaGH:  '$h1',
    brikamaHC:     '$h2',
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
echo "  3. Test:       Register a patient and record a visit"
echo ""
