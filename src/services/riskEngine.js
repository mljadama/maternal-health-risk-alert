// src/services/riskEngine.js
// =============================================================================
// Maternal Health Risk Detection Engine
//
// Pure JavaScript — no React, no DHIS2 dependencies.
// Can be called from any hook, component, or Node.js test suite.
//
// Primary export:
//   assessRisk(patient, visits) → { level, score, flags, rules, summary, recommendations, breakdown }
//
// level is one of:  'high' | 'moderate' | 'normal'
// =============================================================================


// =============================================================================
// SECTION 1 — Risk levels, thresholds, rule IDs
// =============================================================================

export const RISK_LEVELS = {
  HIGH:     'high',
  MODERATE: 'moderate',
  NORMAL:   'normal',
}

// All clinical cutoffs in one place.
// Change a value here to update the entire engine.
export const THRESHOLDS = {
  AGE_MIN:                  18,   // below → high risk
  AGE_MAX:                  35,   // above → moderate risk
  BP_SYSTOLIC_HIGH:        140,
  BP_DIASTOLIC_HIGH:        90,
  BP_SYSTOLIC_SEVERE:      160,
  BP_DIASTOLIC_SEVERE:     110,
  HB_NORMAL_MIN:            11.0, // < 11  → mild anaemia
  HB_MODERATE_ANAEMIA:       8.0, // < 8   → moderate anaemia
  HB_SEVERE_ANAEMIA:         7.0, // < 7   → severe anaemia
  ANC_MINIMUM_VISITS:        4,   // < 4 by week 36 → flag
  FIRST_TRIMESTER_WEEKS:    13,   // first visit after week 13 → late booking
  GRAND_MULTIPARA_THRESHOLD: 4,
  SCORE_HIGH:               40,   // total score >= 40 → HIGH
  SCORE_MODERATE:           20,   // total score >= 20 → MODERATE
}

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


// =============================================================================
// SECTION 2 — Individual rule evaluators
//
// Each returns null (not triggered) or a RuleResult:
//   { id, message, score, severity, recommendation }
//
// Rules that can fire multiple results return an array.
// =============================================================================

// ── Rule 1: Age ───────────────────────────────────────────────────────────────
function ruleAge(age) {
  if (age == null) return null
  if (age < THRESHOLDS.AGE_MIN) return {
    id:             RULE_IDS.AGE_TOO_YOUNG,
    message:        `Adolescent pregnancy — age ${age} (under ${THRESHOLDS.AGE_MIN})`,
    score:          25,
    severity:       'high',
    recommendation: 'Refer to specialist ANC clinic. Screen for pre-eclampsia and anaemia at every visit.',
  }
  if (age > THRESHOLDS.AGE_MAX) return {
    id:             RULE_IDS.AGE_TOO_OLD,
    message:        `Advanced maternal age — age ${age} (over ${THRESHOLDS.AGE_MAX})`,
    score:          20,
    severity:       'moderate',
    recommendation: 'Offer chromosomal screening. Monitor for gestational hypertension and diabetes.',
  }
  return null
}

// ── Rule 2: Blood pressure ────────────────────────────────────────────────────
function ruleBloodPressure(sys, dia) {
  if (sys == null || dia == null) return null
  const s = Number(sys), d = Number(dia)
  if (s >= THRESHOLDS.BP_SYSTOLIC_SEVERE || d >= THRESHOLDS.BP_DIASTOLIC_SEVERE) return {
    id:             RULE_IDS.BP_SEVERE_HYPERTENSION,
    message:        `Severe hypertension — ${s}/${d} mmHg (threshold >= ${THRESHOLDS.BP_SYSTOLIC_SEVERE}/${THRESHOLDS.BP_DIASTOLIC_SEVERE})`,
    score:          50,
    severity:       'high',
    recommendation: 'URGENT: Admit immediately. Start antihypertensive therapy. Rule out pre-eclampsia.',
  }
  if (s >= THRESHOLDS.BP_SYSTOLIC_HIGH || d >= THRESHOLDS.BP_DIASTOLIC_HIGH) return {
    id:             RULE_IDS.BP_HYPERTENSION,
    message:        `Hypertension — ${s}/${d} mmHg (threshold >= ${THRESHOLDS.BP_SYSTOLIC_HIGH}/${THRESHOLDS.BP_DIASTOLIC_HIGH})`,
    score:          35,
    severity:       'high',
    recommendation: 'Repeat BP in 15 min. Order urine protein. Refer to doctor if confirmed.',
  }
  return null
}

// ── Rule 3: Haemoglobin ───────────────────────────────────────────────────────
function ruleHaemoglobin(hb) {
  if (hb == null) return null
  const v = Number(hb)
  if (v < THRESHOLDS.HB_SEVERE_ANAEMIA) return {
    id:             RULE_IDS.HB_SEVERE_ANAEMIA,
    message:        `Severe anaemia — Hb ${v} g/dL (threshold < ${THRESHOLDS.HB_SEVERE_ANAEMIA})`,
    score:          45,
    severity:       'high',
    recommendation: 'URGENT: Consider blood transfusion. Admit. Investigate cause (malaria, iron deficiency, sickle cell).',
  }
  if (v < THRESHOLDS.HB_MODERATE_ANAEMIA) return {
    id:             RULE_IDS.HB_MODERATE_ANAEMIA,
    message:        `Moderate anaemia — Hb ${v} g/dL (threshold < ${THRESHOLDS.HB_MODERATE_ANAEMIA})`,
    score:          30,
    severity:       'high',
    recommendation: 'Start oral iron therapy. Test for malaria. Recheck Hb in 4 weeks.',
  }
  if (v < THRESHOLDS.HB_NORMAL_MIN) return {
    id:             RULE_IDS.HB_MILD_ANAEMIA,
    message:        `Mild anaemia — Hb ${v} g/dL (threshold < ${THRESHOLDS.HB_NORMAL_MIN})`,
    score:          20,
    severity:       'moderate',
    recommendation: 'Increase iron and folic acid supplementation. Dietary counselling. Recheck in 6 weeks.',
  }
  return null
}

// ── Rule 4: Malaria ───────────────────────────────────────────────────────────
function ruleMalaria(currentResult, malariaHistory) {
  const flags = []
  if (currentResult && currentResult.toLowerCase().includes('positive'))
    flags.push({
      id:             RULE_IDS.MALARIA_POSITIVE,
      message:        `Active malaria infection — result: ${currentResult}`,
      score:          40,
      severity:       'high',
      recommendation: 'Start WHO-approved antimalarial therapy. Avoid artemisinin in first trimester. Monitor foetal wellbeing.',
    })
  if (malariaHistory === true || malariaHistory === 'true')
    flags.push({
      id:             RULE_IDS.MALARIA_HISTORY,
      message:        'Previous malaria infection during this pregnancy',
      score:          15,
      severity:       'moderate',
      recommendation: 'Ensure insecticide-treated bed net in use. Monthly RDT at each visit.',
    })
  return flags
}

// ── Rule 5: Missed / insufficient ANC visits ──────────────────────────────────
function ruleMissedVisits(totalVisits, currentWeek, expectedDates, attendedDates) {
  const flags = []

  // 5a — fewer than minimum visits approaching term
  if (currentWeek >= 36 && totalVisits < THRESHOLDS.ANC_MINIMUM_VISITS)
    flags.push({
      id:             RULE_IDS.INSUFFICIENT_VISITS,
      message:        `Insufficient visits — ${totalVisits} recorded, minimum ${THRESHOLDS.ANC_MINIMUM_VISITS} required by week 36`,
      score:          25,
      severity:       'high',
      recommendation: 'Schedule urgent catch-up visits. Review all overdue screening tests.',
    })

  // 5b — explicitly missed scheduled appointments
  if (expectedDates.length > 0 && attendedDates.length > 0) {
    const attended = new Set(attendedDates.map(d => d.split('T')[0]))
    const now      = new Date()
    const missed   = expectedDates
      .map(d => d.split('T')[0])
      .filter(d => new Date(d) < now && !attended.has(d))
    if (missed.length > 0)
      flags.push({
        id:             RULE_IDS.MISSED_ANC_VISITS,
        message:        `${missed.length} scheduled ANC visit${missed.length > 1 ? 's' : ''} missed (${missed.join(', ')})`,
        score:          missed.length * 10,
        severity:       missed.length >= 2 ? 'high' : 'moderate',
        recommendation: 'Contact patient immediately. Arrange home visit if unreachable.',
      })
  }
  return flags
}

// ── Rule 6: Late first visit (after first trimester) ─────────────────────────
function ruleLateFirstVisit(firstVisitWeek) {
  if (firstVisitWeek == null || firstVisitWeek <= THRESHOLDS.FIRST_TRIMESTER_WEEKS) return null
  const inThird = firstVisitWeek > 26
  return {
    id:             RULE_IDS.LATE_FIRST_VISIT,
    message:        `Late ANC booking — first visit at week ${firstVisitWeek} (after first trimester, week ${THRESHOLDS.FIRST_TRIMESTER_WEEKS})`,
    score:          inThird ? 30 : 20,
    severity:       inThird ? 'high' : 'moderate',
    recommendation: `First visit in ${inThird ? 'third' : 'second'} trimester. Expedite all first-trimester screening tests immediately.`,
  }
}

// ── Rule 7: Danger signs ──────────────────────────────────────────────────────
function ruleDangerSigns(dangerSigns) {
  if (!dangerSigns) return null
  const signs = Array.isArray(dangerSigns)
    ? dangerSigns.filter(Boolean)
    : dangerSigns.split(',').map(s => s.trim()).filter(Boolean)
  if (signs.length === 0) return null
  return {
    id:             RULE_IDS.DANGER_SIGNS,
    message:        `${signs.length} danger sign${signs.length > 1 ? 's' : ''} reported: ${signs.join('; ')}`,
    score:          signs.length * 25,
    severity:       'high',
    recommendation: 'URGENT: Refer to hospital immediately. Do not discharge without physician review.',
  }
}

// ── Rule 8: Grand multiparity ─────────────────────────────────────────────────
function ruleGrandMultipara(parity) {
  if (parity == null || Number(parity) < THRESHOLDS.GRAND_MULTIPARA_THRESHOLD) return null
  return {
    id:             RULE_IDS.GRAND_MULTIPARA,
    message:        `Grand multiparity — parity ${parity} (>= ${THRESHOLDS.GRAND_MULTIPARA_THRESHOLD})`,
    score:          15,
    severity:       'moderate',
    recommendation: 'Increased risk of uterine atony and PPH. Plan delivery at facility with blood bank.',
  }
}

// ── Rule 9: Previous complications ───────────────────────────────────────────
function rulePreviousComplications(comp) {
  if (!comp || comp.toLowerCase() === 'none') return null
  const SEVERE = ['pre-eclampsia','eclampsia','stillbirth','placenta previa','postpartum haemorrhage']
  const isSevere = SEVERE.some(c => comp.toLowerCase().includes(c))
  return {
    id:             RULE_IDS.PREVIOUS_COMPLICATIONS,
    message:        `Previous obstetric complication: ${comp}`,
    score:          isSevere ? 25 : 15,
    severity:       isSevere ? 'high' : 'moderate',
    recommendation: isSevere
      ? 'Refer to obstetrician. High-risk pregnancy management plan required.'
      : 'Increase monitoring frequency. Document complication details.',
  }
}


// =============================================================================
// SECTION 3 — Main assessRisk function
// =============================================================================

/**
 * assessRisk
 * ──────────
 * @param {Object}  patient
 * @param {number}  patient.age
 * @param {number}  [patient.parity]
 * @param {string}  [patient.previousComplications]
 *
 * @param {Object}   visits
 * @param {number}   visits.totalVisits
 * @param {number}   visits.currentWeek          - gestational age today
 * @param {number}   [visits.firstVisitWeek]     - GA at first ANC contact
 * @param {number}   [visits.latestBpSystolic]
 * @param {number}   [visits.latestBpDiastolic]
 * @param {number}   [visits.latestHaemoglobin]  - g/dL
 * @param {string}   [visits.latestMalariaResult]
 * @param {boolean}  [visits.malariaHistory]
 * @param {string[]} [visits.dangerSigns]
 * @param {string[]} [visits.expectedVisitDates] - ISO date strings
 * @param {string[]} [visits.attendedVisitDates] - ISO date strings
 *
 * @returns {{
 *   level:           'high'|'moderate'|'normal',
 *   score:           number,
 *   flags:           string[],
 *   rules:           Object[],
 *   summary:         string,
 *   recommendations: string[],
 *   breakdown:       Object
 * }}
 */
export function assessRisk(patient = {}, visits = {}) {
  const { age, parity, previousComplications } = patient
  const {
    totalVisits        = 0,
    currentWeek        = 0,
    firstVisitWeek,
    latestBpSystolic,
    latestBpDiastolic,
    latestHaemoglobin,
    latestMalariaResult,
    malariaHistory,
    dangerSigns        = [],
    expectedVisitDates = [],
    attendedVisitDates = [],
  } = visits

  // Collect every triggered rule
  const triggered = []
  const add  = r  => { if (r)              triggered.push(r) }
  const addA = rs => { if (Array.isArray(rs)) triggered.push(...rs) }

  add(ruleAge(age))
  add(ruleBloodPressure(latestBpSystolic, latestBpDiastolic))
  add(ruleHaemoglobin(latestHaemoglobin))
  addA(ruleMalaria(latestMalariaResult, malariaHistory))
  addA(ruleMissedVisits(totalVisits, currentWeek, expectedVisitDates, attendedVisitDates))
  add(ruleLateFirstVisit(firstVisitWeek))
  add(ruleDangerSigns(dangerSigns))
  add(ruleGrandMultipara(parity))
  add(rulePreviousComplications(previousComplications))

  // Score and level
  const score = triggered.reduce((s, r) => s + r.score, 0)
  const level = score >= THRESHOLDS.SCORE_HIGH     ? RISK_LEVELS.HIGH
              : score >= THRESHOLDS.SCORE_MODERATE ? RISK_LEVELS.MODERATE
              : RISK_LEVELS.NORMAL

  // Outputs
  const flags           = triggered.map(r => r.message)
  const recommendations = [...new Set(triggered.map(r => r.recommendation))]
  const breakdown       = Object.fromEntries(triggered.map(r => [r.id, r.score]))
  const top             = [...triggered].sort((a,b) => b.score - a.score)[0]
  const summary         = triggered.length === 0
    ? 'No risk factors identified. Continue routine ANC schedule.'
    : `${level.toUpperCase()} RISK (score ${score}): ${top.message}.`

  return { level, score, flags, rules: triggered, summary, recommendations, breakdown }
}


// =============================================================================
// SECTION 4 — Utility helpers
// =============================================================================

export function getRiskColor(level) {
  return { high: 'error', moderate: 'warning', normal: 'success' }[level] ?? 'default'
}

export function getRiskLabel(level) {
  return { high: 'High risk', moderate: 'Moderate risk', normal: 'Normal' }[level] ?? 'Unknown'
}

export function getRiskBadgeStyle(level) {
  return ({
    high:     { background: '#fee2e2', color: '#991b1b', border: '1.5px solid #fca5a5' },
    moderate: { background: '#fef3c7', color: '#92400e', border: '1.5px solid #fcd34d' },
    normal:   { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
  })[level] ?? {}
}

/**
 * assessMultipleVisits
 * Runs assessRisk across an array of visit records and returns the worst result.
 * Used by PatientDetail to show overall pregnancy risk from all recorded visits.
 */
export function assessMultipleVisits(patient, visitArray = []) {
  if (!visitArray.length) return assessRisk(patient, {})
  const all = visitArray.map((v, i) =>
    assessRisk(patient, { ...v, firstVisitWeek: i === 0 ? v.currentWeek : undefined })
  )
  return all.reduce((worst, curr) => curr.score > worst.score ? curr : worst)
}

/**
 * filterHighRiskPatients
 * Filters a patient list to only high/moderate risk, sorted by score descending.
 * Used by the Alerts dashboard page.
 *
 * @param {{ patient, visits }[]} patientList
 * @param {{ includeLevels?: string[] }} options
 * @returns {{ patient, visits, assessment }[]}
 */
export function filterHighRiskPatients(
  patientList = [],
  { includeLevels = [RISK_LEVELS.HIGH, RISK_LEVELS.MODERATE] } = {}
) {
  return patientList
    .map(({ patient, visits }) => ({ patient, visits, assessment: assessRisk(patient, visits) }))
    .filter(({ assessment }) => includeLevels.includes(assessment.level))
    .sort((a, b) => b.assessment.score - a.assessment.score)
}