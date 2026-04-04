// src/config/dhis2.js
// All UIDs from local Docker DHIS2 instance (http://localhost:8080)
// These are permanent and will never reset

export const PROGRAM = {
    id:   'e8KFbAy617h',
    name: 'GMB Antenatal Care',
}

export const PROGRAM_STAGE = {
    id:   'vwUpkSACTFy',
    name: 'GMB ANC Visit',
}

export const TRACKED_ENTITY_TYPE = 'ioJeGoAK80X'

export const ORG_UNITS = {
    theGambia:     'XVOAXBkfqji',
    serrекundaGH:  'ROebyw7EnRV',
    brikаmaHC:     'nNWwjJGxneB',
    royalVictoria: 'pNG08WuAJAs',
    edwardFrancis: 'AEj0tm8XM1b',
    farafenni:     'CX5ihYFpzcG',
    bundungMCH:    'Zmw770ATyCp',
}

export const ATTRIBUTES = {
    fullName:              'FlTjYogGR69',
    age:                   'arhjvbdjUs7',
    village:               'wS88wLfMqgV',
    phoneNumber:           'jD85ykGIPZw',
    parity:                'qIguqeJK0Ht',
    previousComplications: 'buf53xLJhuX',
}

export const DATA_ELEMENTS = {
    bpSystolic:          'vybXaYCAYM1',
    bpDiastolic:         'bR1PcPv0J2s',
    haemoglobin:         'SsZDLgtmvSP',
    weight:              'kiFX5YtAI2u',
    gestationalAge:      'uiZfTG4z155',
    visitNumber:         'Rus2XYFUeBw',
    malariaTestResult:   'eeD1DwyXexA',
    ironSupplementation: 'nphRB2vY7v6',
    folicAcid:           'C4bAKAN3GaQ',
    nurseNotes:          'Wzt73YX23nq',
    dangerSigns:         'NnddJBFrywK',
    nextVisitDate:       'TMRL7w3yB74',
}

export const THRESHOLDS = {
    AGE_MIN:                  18,
    AGE_MAX:                  35,
    BP_SYSTOLIC_HIGH:        140,
    BP_DIASTOLIC_HIGH:        90,
    BP_SYSTOLIC_SEVERE:      160,
    BP_DIASTOLIC_SEVERE:     110,
    HB_NORMAL_MIN:            11.0,
    HB_MODERATE_ANAEMIA:       8.0,
    HB_SEVERE_ANAEMIA:         7.0,
    ANC_MINIMUM_VISITS:        4,
    FIRST_TRIMESTER_WEEKS:    13,
    GRAND_MULTIPARA_THRESHOLD: 4,
    SCORE_HIGH:               40,
    SCORE_MODERATE:           20,
}

export const MALARIA_RESULTS = [
    'Negative',
    'Positive (P. falciparum)',
    'Positive (P. vivax)',
    'Not done',
]

export const DANGER_SIGN_OPTIONS = [
    'Severe headache',
    'Blurred vision',
    'Severe abdominal pain',
    'Vaginal bleeding',
    'Convulsions',
    'Difficulty breathing',
    'Reduced fetal movement',
    'Swelling of face/hands',
]

export const COMPLICATION_OPTIONS = [
    'None',
    'Pre-eclampsia',
    'Gestational diabetes',
    'Placenta previa',
    'Previous C-section',
    'Postpartum haemorrhage',
    'Anaemia',
    'Preterm birth',
    'Stillbirth',
    'Miscarriage',
]

export const RISK_COLORS = {
    high:     { main: '#dc2626', light: '#fef2f2', border: '#fecaca', dark: '#991b1b' },
    moderate: { main: '#d97706', light: '#fffbeb', border: '#fde68a', dark: '#92400e' },
    normal:   { main: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', dark: '#14532d' },
}