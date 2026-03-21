// src/config/riskRules.js
// ─────────────────────────────────────────────────────────────
// Risk rule definitions used by the risk engine.
// Each rule has a stable ID, score weight, and display metadata.
// ─────────────────────────────────────────────────────────────

export const RULE_IDS = {
  AGE_TOO_YOUNG:          'AGE_TOO_YOUNG',
  AGE_TOO_OLD:            'AGE_TOO_OLD',
  BP_HYPERTENSION:        'BP_HYPERTENSION',
  BP_SEVERE_HYPERTENSION: 'BP_SEVERE_HYPERTENSION',
  HB_MILD_ANAEMIA:        'HB_MILD_ANAEMIA',
  HB_MODERATE_ANAEMIA:    'HB_MODERATE_ANAEMIA',
  HB_SEVERE_ANAEMIA:      'HB_SEVERE_ANAEMIA',
  MALARIA_POSITIVE:       'MALARIA_POSITIVE',
  MALARIA_HISTORY:        'MALARIA_HISTORY',
  MISSED_ANC_VISITS:      'MISSED_ANC_VISITS',
  INSUFFICIENT_VISITS:    'INSUFFICIENT_VISITS',
  LATE_FIRST_VISIT:       'LATE_FIRST_VISIT',
  DANGER_SIGNS:           'DANGER_SIGNS',
  GRAND_MULTIPARA:        'GRAND_MULTIPARA',
  PREVIOUS_COMPLICATIONS: 'PREVIOUS_COMPLICATIONS',
}

// Score weights for each rule (used in risk engine scoring)
export const RULE_SCORES = {
  [RULE_IDS.AGE_TOO_YOUNG]:          25,
  [RULE_IDS.AGE_TOO_OLD]:            20,
  [RULE_IDS.BP_HYPERTENSION]:        35,
  [RULE_IDS.BP_SEVERE_HYPERTENSION]: 50,
  [RULE_IDS.HB_MILD_ANAEMIA]:        20,
  [RULE_IDS.HB_MODERATE_ANAEMIA]:    30,
  [RULE_IDS.HB_SEVERE_ANAEMIA]:      45,
  [RULE_IDS.MALARIA_POSITIVE]:       40,
  [RULE_IDS.MALARIA_HISTORY]:        15,
  [RULE_IDS.MISSED_ANC_VISITS]:      10, // per missed visit
  [RULE_IDS.INSUFFICIENT_VISITS]:    25,
  [RULE_IDS.LATE_FIRST_VISIT]:       20, // +10 if third trimester
  [RULE_IDS.DANGER_SIGNS]:           25, // per danger sign
  [RULE_IDS.GRAND_MULTIPARA]:        15,
  [RULE_IDS.PREVIOUS_COMPLICATIONS]: 15, // +10 if severe
}

// Human-readable labels for each rule (shown in UI chips)
export const RULE_LABELS = {
  [RULE_IDS.AGE_TOO_YOUNG]:          'Adolescent pregnancy',
  [RULE_IDS.AGE_TOO_OLD]:            'Advanced maternal age',
  [RULE_IDS.BP_HYPERTENSION]:        'Hypertension',
  [RULE_IDS.BP_SEVERE_HYPERTENSION]: 'Severe hypertension',
  [RULE_IDS.HB_MILD_ANAEMIA]:        'Mild anaemia',
  [RULE_IDS.HB_MODERATE_ANAEMIA]:    'Moderate anaemia',
  [RULE_IDS.HB_SEVERE_ANAEMIA]:      'Severe anaemia',
  [RULE_IDS.MALARIA_POSITIVE]:       'Active malaria infection',
  [RULE_IDS.MALARIA_HISTORY]:        'Previous malaria this pregnancy',
  [RULE_IDS.MISSED_ANC_VISITS]:      'Missed ANC appointments',
  [RULE_IDS.INSUFFICIENT_VISITS]:    'Insufficient ANC visits',
  [RULE_IDS.LATE_FIRST_VISIT]:       'Late ANC booking',
  [RULE_IDS.DANGER_SIGNS]:           'Danger signs reported',
  [RULE_IDS.GRAND_MULTIPARA]:        'Grand multiparity',
  [RULE_IDS.PREVIOUS_COMPLICATIONS]: 'Previous obstetric complication',
}