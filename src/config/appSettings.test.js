import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  validateAppSettings,
  buildConfigValidationMessage,
} from './appSettings'

describe('appSettings', () => {
  it('normalizes empty or partial settings with defaults', () => {
    const normalized = normalizeAppSettings({})
    expect(normalized.thresholds.BP_SYSTOLIC_SEVERE).toBe(160)
    expect(normalized.ruleScores.BP_SEVERE_HYPERTENSION).toBe(50)
    expect(normalized.riskColors.high.main).toBe('#dc2626')
  })

  it('normalizes a hex string saved as a risk colour', () => {
    const normalized = normalizeAppSettings({
      riskColors: { high: '#111827' },
    })
    expect(normalized.riskColors.high.main).toBe('#111827')
    expect(normalized.riskColors.high.light).toMatch(/^#/)
  })

  it('detects missing required UID fields in configuration validation', () => {
    const validation = validateAppSettings({})
    expect(validation.isValid).toBe(false)
    expect(validation.missingFields.length).toBeGreaterThan(0)
  })

  it('validates correct 11-character alphanumeric UIDs', () => {
    const validConfig = {
      ...DEFAULT_APP_SETTINGS,
      program: { id: 'vKumfHCLF9s', name: 'ANC Program' },
      programStage: { id: 'a1b2c3d4e5f', name: 'ANC Visit' },
      trackedEntityType: { id: 'MCP2W15B98T' },
      attributes: {
        fullName: 'w1e2r3t4y5u',
        age: 'i6o7p8a9s0d',
        village: 'f1g2h3j4k5l',
        phoneNumber: 'z1x2c3v4b5n',
        parity: 'm1n2b3v4c5x',
        previousComplications: 'z9y8x7w6v5u',
      },
      dataElements: {
        bpSystolic: 'a1s2d3f4g5h',
        bpDiastolic: 'j6k7l8q9w0e',
        haemoglobin: 'r1t2y3u4i5o',
        weight: 'p6a7s8d9f0g',
        gestationalAge: 'h1j2k3l4z5x',
        visitNumber: 'c6v7b8n9m0q',
        malariaTestResult: 'w1e2r3t4y5u',
        ironSupplementation: 'i6o7p8a9s0d',
        folicAcid: 'f1g2h3j4k5l',
        nurseNotes: 'z1x2c3v4b5n',
        dangerSigns: 'm1n2b3v4c5x',
        nextVisitDate: 'z9y8x7w6v5u',
      },
    }

    const validation = validateAppSettings(validConfig)
    expect(validation.isValid).toBe(true)
    expect(validation.missingFields.length).toBe(0)
    expect(validation.invalidFields.length).toBe(0)
  })

  it('generates clear error messages when configuration is missing fields', () => {
    const validation = validateAppSettings({})
    const msg = buildConfigValidationMessage(validation, 'Config error:')
    expect(msg).toContain('Config error:')
    expect(msg).toContain('missing:')
  })
})
