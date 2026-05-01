import {
  THRESHOLDS,
  MALARIA_RESULTS,
  DANGER_SIGN_OPTIONS,
  COMPLICATION_OPTIONS,
  RISK_COLORS,
} from './dhis2.js'

export const APP_SETTINGS_NAMESPACE = 'maternal_health_risk_alert'
export const APP_SETTINGS_KEY = 'config'
const UID_PATTERN = /^[A-Za-z][A-Za-z0-9]{10}$/

function readPath(source, path) {
  return path.split('.').reduce((current, key) => current?.[key], source)
}

const REQUIRED_UID_FIELDS = [
  { path: 'program.id', label: 'Program UID' },
  { path: 'programStage.id', label: 'Program stage UID' },
  { path: 'trackedEntityType.id', label: 'Tracked entity type UID' },
  { path: 'attributes.fullName', label: 'Full name attribute UID' },
  { path: 'attributes.age', label: 'Age attribute UID' },
  { path: 'attributes.village', label: 'Village attribute UID' },
  { path: 'attributes.phoneNumber', label: 'Phone number attribute UID' },
  { path: 'attributes.parity', label: 'Parity attribute UID' },
  { path: 'attributes.previousComplications', label: 'Previous complications attribute UID' },
  { path: 'dataElements.bpSystolic', label: 'Blood pressure systolic UID' },
  { path: 'dataElements.bpDiastolic', label: 'Blood pressure diastolic UID' },
  { path: 'dataElements.haemoglobin', label: 'Haemoglobin UID' },
  { path: 'dataElements.weight', label: 'Weight UID' },
  { path: 'dataElements.gestationalAge', label: 'Gestational age UID' },
  { path: 'dataElements.visitNumber', label: 'Visit number UID' },
  { path: 'dataElements.malariaTestResult', label: 'Malaria test result UID' },
  { path: 'dataElements.ironSupplementation', label: 'Iron supplementation UID' },
  { path: 'dataElements.folicAcid', label: 'Folic acid UID' },
  { path: 'dataElements.nurseNotes', label: 'Nurse notes UID' },
  { path: 'dataElements.dangerSigns', label: 'Danger signs UID' },
  { path: 'dataElements.nextVisitDate', label: 'Next visit date UID' },
]

export const DEFAULT_APP_SETTINGS = {
  program: {
    id: '',
    name: '',
  },
  programStage: {
    id: '',
    name: '',
  },
  trackedEntityType: {
    id: '',
  },
  attributes: {
    fullName: '',
    age: '',
    village: '',
    phoneNumber: '',
    parity: '',
    previousComplications: '',
  },
  dataElements: {
    bpSystolic: '',
    bpDiastolic: '',
    haemoglobin: '',
    weight: '',
    gestationalAge: '',
    visitNumber: '',
    malariaTestResult: '',
    ironSupplementation: '',
    folicAcid: '',
    nurseNotes: '',
    dangerSigns: '',
    nextVisitDate: '',
  },
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

export function validateAppSettings(settings) {
  const normalized = normalizeAppSettings(settings)
  const missingFields = []
  const invalidFields = []

  REQUIRED_UID_FIELDS.forEach(({ path, label }) => {
    const value = String(readPath(normalized, path) || '').trim()
    if (!value) {
      missingFields.push(label)
      return
    }
    if (!UID_PATTERN.test(value)) {
      invalidFields.push(label)
    }
  })

  return {
    isValid: missingFields.length === 0 && invalidFields.length === 0,
    missingFields,
    invalidFields,
  }
}

export function buildConfigValidationMessage(
  validation,
  prefix = 'The app configuration is incomplete or invalid.'
) {
  if (validation?.isValid) {
    return ''
  }

  const fragments = []
  if (validation?.missingFields?.length) {
    fragments.push(`missing: ${validation.missingFields.join(', ')}`)
  }
  if (validation?.invalidFields?.length) {
    fragments.push(`invalid UID format: ${validation.invalidFields.join(', ')}`)
  }

  return `${prefix} Open Configuration and correct the following fields (${fragments.join(' | ')}).`
}