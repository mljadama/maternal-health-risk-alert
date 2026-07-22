import { assessRisk, RISK_LEVELS, RULE_IDS, THRESHOLDS } from './riskEngine'

describe('riskEngine', () => {
  it('assesses normal pregnancy as NORMAL risk with score 0', () => {
    const patient = { age: 25, parity: 1, previousComplications: 'None' }
    const visits = {
      totalVisits: 2,
      currentWeek: 20,
      firstVisitWeek: 10,
      latestBpSystolic: 118,
      latestBpDiastolic: 75,
      latestHaemoglobin: 12.0,
      latestMalariaResult: 'Negative',
      dangerSigns: [],
    }
    const result = assessRisk(patient, visits)
    expect(result.level).toBe(RISK_LEVELS.NORMAL)
    expect(result.score).toBe(0)
    expect(result.flags.length).toBe(0)
  })

  it('triggers HIGH risk for severe hypertension', () => {
    const patient = { age: 26, parity: 1 }
    const visits = {
      latestBpSystolic: 165,
      latestBpDiastolic: 112,
    }
    const result = assessRisk(patient, visits)
    expect(result.level).toBe(RISK_LEVELS.HIGH)
    expect(result.score).toBeGreaterThanOrEqual(50)
    expect(result.breakdown[RULE_IDS.BP_SEVERE_HYPERTENSION]).toBe(50)
  })

  it('triggers HIGH risk for severe anaemia', () => {
    const patient = { age: 28, parity: 2 }
    const visits = {
      latestHaemoglobin: 6.5,
    }
    const result = assessRisk(patient, visits)
    expect(result.level).toBe(RISK_LEVELS.HIGH)
    expect(result.score).toBe(45)
    expect(result.breakdown[RULE_IDS.HB_SEVERE_ANAEMIA]).toBe(45)
  })

  it('triggers HIGH risk for active malaria infection', () => {
    const patient = { age: 30, parity: 1 }
    const visits = {
      latestMalariaResult: 'Positive (P. falciparum)',
    }
    const result = assessRisk(patient, visits)
    expect(result.level).toBe(RISK_LEVELS.HIGH)
    expect(result.score).toBe(40)
    expect(result.breakdown[RULE_IDS.MALARIA_POSITIVE]).toBe(40)
  })

  it('accumulates scores across multiple risk factors', () => {
    const patient = { age: 16, parity: 4, previousComplications: 'Pre-eclampsia' }
    const visits = {
      latestBpSystolic: 145,
      latestBpDiastolic: 95,
      latestHaemoglobin: 10.2,
      dangerSigns: ['Severe headache', 'Blurred vision'],
    }
    const result = assessRisk(patient, visits)
    expect(result.level).toBe(RISK_LEVELS.HIGH)
    expect(result.rules.length).toBeGreaterThanOrEqual(4)
    expect(result.score).toBeGreaterThan(80)
  })

  it('respects customizable score weights and thresholds', () => {
    const patient = { age: 25, parity: 1 }
    const visits = {
      latestBpSystolic: 145, // Normally Moderate/High (35 pts)
      latestBpDiastolic: 92,
    }
    // Override hypertension score weight to 10 points instead of 35
    const customScores = { [RULE_IDS.BP_HYPERTENSION]: 10 }
    const customThresholds = { SCORE_HIGH: 50, SCORE_MODERATE: 20 }

    const result = assessRisk(patient, visits, { scores: customScores, thresholds: customThresholds })
    expect(result.score).toBe(10)
    expect(result.level).toBe(RISK_LEVELS.NORMAL) // 10 < SCORE_MODERATE (20)
  })
})
