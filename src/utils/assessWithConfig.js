import { assessRisk } from '../services/riskEngine.js'

export function assessConfiguredRisk(config, patient, visits) {
  return assessRisk(patient, visits, {
    thresholds: config?.thresholds,
    scores: config?.ruleScores,
  })
}
