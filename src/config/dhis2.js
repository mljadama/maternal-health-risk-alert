// src/config/dhis2.js
// All UIDs confirmed from play.im.dhis2.org/dev-2-42
// Program UID:       VvjcLK7x1bH
// Program Stage UID: oDMD0SBDBRx

export const PROGRAM = {
    id:   'VvjcLK7x1bH',
    name: 'GMB Antenatal Care',
}

export const PROGRAM_STAGE = {
    id:   'oDMD0SBDBRx',
    name: 'GMB ANC Visit',
}

export const TRACKED_ENTITY_TYPE = 'nEenWmSyUEp'

export const ORG_UNITS = {
    theGambia:             'nzUt055ynO4',
    serrекundaGH:          'wi4GobGoOoT',
    brikаmaHC:             'mGyei5DWnSW',
    royalVictoria:         'OwSYyqO2GF4',
    edwardFrancis:         'sn3D3SL1EDy',
    farafenni:             'w11r0gSek0M',
    bundungMCH:            'vIk7su8Ukr6',
}

export const ATTRIBUTES = {
    fullName:              'aEd3LH11QUL',
    age:                   'BSMFmsYwB7M',
    village:               'mk2rXAJdWnL',
    phoneNumber:           'qH6v37fPn3D',
    parity:                'nc9FXYSjgbs',
    previousComplications: 's0PoCJQBjGx',
}

export const DATA_ELEMENTS = {
    bpSystolic:          't1zfO95B32O',
    bpDiastolic:         'sHIHCU7vvB0',
    haemoglobin:         'bjVuflEL5yj',
    weight:              'QNV1CAlfYEV',
    gestationalAge:      'BLQwVUAgzxb',
    visitNumber:         'yNii4R46ckl',
    malariaTestResult:   'HTalhsN1uPA',
    ironSupplementation: 'iahGS6WNerS',
    folicAcid:           'iyCXGGvXbaw',
    nurseNotes:          'GVeHumOFGG4',
    dangerSigns:         'D9WefsLiHXb',
    nextVisitDate:       'oI9lnGfaq7L',
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