import {
  PROGRAM,
  PROGRAM_STAGE,
  TRACKED_ENTITY_TYPE,
  ATTRIBUTES,
  DATA_ELEMENTS,
  THRESHOLDS,
  MALARIA_RESULTS,
  DANGER_SIGN_OPTIONS,
  COMPLICATION_OPTIONS,
  RISK_COLORS,
} from './dhis2.js'

export const APP_SETTINGS_NAMESPACE = 'maternal_health_risk_alert'
export const APP_SETTINGS_KEY = 'config'

export const DEFAULT_APP_SETTINGS = {
  program: {
    id: PROGRAM.id,
    name: PROGRAM.name,
  },
  programStage: {
    id: PROGRAM_STAGE.id,
    name: PROGRAM_STAGE.name,
  },
  trackedEntityType: {
    id: TRACKED_ENTITY_TYPE,
  },
  attributes: { ...ATTRIBUTES },
  dataElements: { ...DATA_ELEMENTS },
  thresholds: { ...THRESHOLDS },
  malariaResults: [...MALARIA_RESULTS],
  dangerSignOptions: [...DANGER_SIGN_OPTIONS],
  complicationOptions: [...COMPLICATION_OPTIONS],
  riskColors: { ...RISK_COLORS },
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function mergeDeep(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : base
  }

  if (!isPlainObject(base)) {
    return override === undefined ? base : override
  }

  const result = { ...base }
  if (!isPlainObject(override)) {
    return result
  }

  Object.entries(override).forEach(([key, value]) => {
    result[key] = mergeDeep(base[key], value)
  })

  return result
}

export function normalizeAppSettings(storedSettings) {
  return mergeDeep(DEFAULT_APP_SETTINGS, storedSettings)
}

export function buildAppSettingsPayload(settings) {
  return normalizeAppSettings(settings)
}
