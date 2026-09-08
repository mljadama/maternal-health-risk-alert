// src/utils/validationUtils.js
// ─────────────────────────────────────────────────────────────
// Form validation helper utilities for patient registration
// and ANC visit recording.
// ─────────────────────────────────────────────────────────────

export function isValidPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return false
  const cleaned = phone.trim().replace(/[\s\-().]/g, '')
  return /^\+?[0-9]{7,15}$/.test(cleaned)
}

export function validatePatientForm(values) {
  const errors = {}

  // Full name
  if (!values.fullName || !values.fullName.trim()) {
    errors.fullName = 'Full name is required'
  } else if (values.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters'
  }

  // Age
  if (values.age === undefined || values.age === '' || values.age === null) {
    errors.age = 'Age is required'
  } else {
    const ageNum = Number(values.age)
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 60) {
      errors.age = 'Age must be between 10 and 60 years'
    }
  }

  // Village / Community
  if (!values.village || !values.village.trim()) {
    errors.village = 'Village / Community is required'
  }

  if (values.phoneNumber && values.phoneNumber.trim() && !isValidPhoneNumber(values.phoneNumber)) {
    errors.phoneNumber = 'Enter a valid phone number with 7 to 15 digits, optionally starting with +'
  }

  // Organisation unit (Facility)
  if (!values.orgUnit) {
    errors.orgUnit = 'Select a health facility'
  }

  // Gestational age at booking
  if (values.gestationalAge === undefined || values.gestationalAge === '' || values.gestationalAge === null) {
    errors.gestationalAge = 'Gestational age is required'
  } else {
    const gaNum = Number(values.gestationalAge)
    if (isNaN(gaNum) || gaNum < 1 || gaNum > 42) {
      errors.gestationalAge = 'Gestational age must be between 1 and 42 weeks'
    }
  }

  // Parity
  if (values.parity === undefined || values.parity === '' || values.parity === null) {
    errors.parity = 'Parity is required'
  } else {
    const parityNum = Number(values.parity)
    if (isNaN(parityNum) || parityNum < 0 || parityNum > 15) {
      errors.parity = 'Parity must be between 0 and 15'
    }
  }

  return errors
}

export function validateVisitForm(values, { requireClinical = false } = {}) {
  const errors = {}

  if (requireClinical) {
    if (values.bpSystolic === undefined || values.bpSystolic === '') {
      errors.bpSystolic = 'Systolic BP is required'
    }
    if (values.bpDiastolic === undefined || values.bpDiastolic === '') {
      errors.bpDiastolic = 'Diastolic BP is required'
    }
    if (values.haemoglobin === undefined || values.haemoglobin === '') {
      errors.haemoglobin = 'Haemoglobin is required'
    }
    if (values.weight === undefined || values.weight === '') {
      errors.weight = 'Weight is required'
    }
    if (values.gestationalAge === undefined || values.gestationalAge === '') {
      errors.gestationalAge = 'Gestational age is required'
    }
  }

  // Systolic BP
  if (values.bpSystolic !== undefined && values.bpSystolic !== '') {
    const sys = Number(values.bpSystolic)
    if (isNaN(sys) || sys < 60 || sys > 250) {
      errors.bpSystolic = 'Systolic BP must be between 60 and 250 mmHg'
    }
  }

  // Diastolic BP
  if (values.bpDiastolic !== undefined && values.bpDiastolic !== '') {
    const dia = Number(values.bpDiastolic)
    if (isNaN(dia) || dia < 40 || dia > 150) {
      errors.bpDiastolic = 'Diastolic BP must be between 40 and 150 mmHg'
    }
  }

  // BP Cross-validation
  if (
    values.bpSystolic &&
    values.bpDiastolic &&
    !errors.bpSystolic &&
    !errors.bpDiastolic &&
    Number(values.bpSystolic) <= Number(values.bpDiastolic)
  ) {
    errors.bpSystolic = 'Systolic BP must be higher than diastolic BP'
  }

  // Haemoglobin
  if (values.haemoglobin !== undefined && values.haemoglobin !== '') {
    const hb = Number(values.haemoglobin)
    if (isNaN(hb) || hb < 3.0 || hb > 20.0) {
      errors.haemoglobin = 'Haemoglobin must be between 3.0 and 20.0 g/dL'
    }
  }

  // Weight
  if (values.weight !== undefined && values.weight !== '') {
    const w = Number(values.weight)
    if (isNaN(w) || w < 25 || w > 250) {
      errors.weight = 'Weight must be between 25 and 250 kg'
    }
  }

  // Gestational age at visit
  if (values.gestationalAge !== undefined && values.gestationalAge !== '') {
    const ga = Number(values.gestationalAge)
    if (isNaN(ga) || ga < 1 || ga > 42) {
      errors.gestationalAge = 'Gestational age must be between 1 and 42 weeks'
    }
  }

  return errors
}
