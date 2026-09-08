import { RISK_COLORS as DEFAULT_RISK_COLORS } from '../config/dhis2.js'

const HEX = /^#([0-9a-fA-F]{6})$/

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function hexToRgb(hex) {
  const match = HEX.exec(hex)
  if (!match) return null
  const n = parseInt(match[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map(channel => clamp(channel).toString(16).padStart(2, '0')).join('')}`
}

function mix(hex, target, amount) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return rgbToHex({
    r: rgb.r + (target.r - rgb.r) * amount,
    g: rgb.g + (target.g - rgb.g) * amount,
    b: rgb.b + (target.b - rgb.b) * amount,
  })
}

export function paletteFromHex(main, fallback = DEFAULT_RISK_COLORS.normal) {
  const normalized = HEX.test(main) ? main : fallback.main
  return {
    main: normalized,
    light: mix(normalized, { r: 255, g: 255, b: 255 }, 0.88),
    border: mix(normalized, { r: 255, g: 255, b: 255 }, 0.55),
    dark: mix(normalized, { r: 0, g: 0, b: 0 }, 0.35),
  }
}

export function normalizeRiskLevelColor(value, fallback) {
  if (typeof value === 'string') {
    return paletteFromHex(value, fallback)
  }
  if (value && typeof value === 'object' && value.main) {
    const palette = paletteFromHex(value.main, fallback)
    return {
      main: value.main,
      light: value.light || palette.light,
      border: value.border || palette.border,
      dark: value.dark || palette.dark,
    }
  }
  return fallback
}

export function normalizeRiskColors(value) {
  return {
    high: normalizeRiskLevelColor(value?.high, DEFAULT_RISK_COLORS.high),
    moderate: normalizeRiskLevelColor(value?.moderate, DEFAULT_RISK_COLORS.moderate),
    normal: normalizeRiskLevelColor(value?.normal, DEFAULT_RISK_COLORS.normal),
  }
}

export function getConfiguredRiskColors(config) {
  return normalizeRiskColors(config?.riskColors)
}
