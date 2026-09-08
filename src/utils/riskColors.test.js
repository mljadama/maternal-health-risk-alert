import { paletteFromHex, normalizeRiskColors } from './riskColors'

describe('riskColors', () => {
  it('builds a full palette from a main hex colour', () => {
    const palette = paletteFromHex('#2563eb')
    expect(palette.main).toBe('#2563eb')
    expect(palette.light).toMatch(/^#/)
    expect(palette.border).toMatch(/^#/)
    expect(palette.dark).toMatch(/^#/)
  })

  it('normalizes string colours saved from the configuration form', () => {
    const colors = normalizeRiskColors({ high: '#111827' })
    expect(colors.high.main).toBe('#111827')
    expect(colors.moderate.main).toBe('#d97706')
  })
})
