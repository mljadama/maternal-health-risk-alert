import { isValidPhoneNumber, validatePatientForm, validateVisitForm } from './validationUtils'

describe('validationUtils', () => {
  describe('isValidPhoneNumber', () => {
    it('accepts valid phone numbers', () => {
      expect(isValidPhoneNumber('+2207000000')).toBe(true)
      expect(isValidPhoneNumber('7000000')).toBe(true)
      expect(isValidPhoneNumber('+1 234 567 8900')).toBe(true)
    })

    it('rejects invalid phone numbers', () => {
      expect(isValidPhoneNumber('')).toBe(false)
      expect(isValidPhoneNumber('abc')).toBe(false)
      expect(isValidPhoneNumber('123')).toBe(false)
    })
  })

  describe('validatePatientForm', () => {
    it('returns no errors for valid patient data', () => {
      const validData = {
        fullName: 'Fatou Jallow',
        age: 24,
        village: 'Serrekunda',
        phoneNumber: '+2207000000',
        orgUnit: 'GMB001',
        gestationalAge: 14,
        parity: 2,
      }
      expect(validatePatientForm(validData)).toEqual({})
    })

    it('returns field errors for invalid patient data', () => {
      const invalidData = {
        fullName: '',
        age: 5,
        village: '',
        phoneNumber: 'invalid',
        orgUnit: '',
        gestationalAge: 50,
        parity: -1,
      }
      const errors = validatePatientForm(invalidData)
      expect(errors.fullName).toBeDefined()
      expect(errors.age).toBeDefined()
      expect(errors.village).toBeDefined()
      expect(errors.phoneNumber).toBeDefined()
      expect(errors.orgUnit).toBeDefined()
      expect(errors.gestationalAge).toBeDefined()
      expect(errors.parity).toBeDefined()
    })
  })

  describe('validateVisitForm', () => {
    it('returns no errors for valid visit data', () => {
      const validVisit = {
        visitDate: '2026-07-20',
        bpSystolic: 120,
        bpDiastolic: 80,
        haemoglobin: 11.5,
        weight: 65,
        gestationalAge: 20,
      }
      expect(validateVisitForm(validVisit)).toEqual({})
    })

    it('validates BP systolic > diastolic', () => {
      const invalidBP = {
        bpSystolic: 80,
        bpDiastolic: 120,
      }
      const errors = validateVisitForm(invalidBP)
      expect(errors.bpSystolic).toContain('higher than diastolic')
    })
  })
})
