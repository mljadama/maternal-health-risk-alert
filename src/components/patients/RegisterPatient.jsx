// src/components/patients/RegisterPatient.jsx
// ─────────────────────────────────────────────────────────────
// Pregnant woman registration form.
// Collects: full name, age, village, phone, health facility,
//           gestational age, parity, previous complications.
//
// On submit:
//   1. Validates all fields
//   2. Calls useRegisterPatient → POST /api/trackedEntityInstances
//   3. Then POST /api/enrollments to enroll in ANC program
//   4. Shows success/error feedback
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { useDataQuery } from '@dhis2/app-runtime'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  InputAdornment,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Alert,
  AlertTitle,
  Snackbar,
  Tooltip,
  LinearProgress,
} from '@mui/material'
import {
  PersonOutline,
  PhoneAndroid,
  LocationOn,
  LocalHospital,
  PregnantWoman,
  FamilyRestroom,
  Warning,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  HelpOutline,
} from '@mui/icons-material'

import { useRegisterPatient } from '../../hooks/useRegisterPatient.js'
import { ORG_UNITS_QUERY } from '../../services/dhis2Api.js'

// ── Stepper labels ─────────────────────────────────────────────
const STEPS = ['Personal details', 'Pregnancy info', 'Review & submit']

// ── Complication options ───────────────────────────────────────
const COMPLICATION_OPTIONS = [
  'None',
  'Pre-eclampsia',
  'Gestational diabetes',
  'Placenta previa',
  'Previous C-section',
  'Postpartum haemorrhage',
  'Anaemia',
  'Preterm birth',
  'Stillbirth',
  'Miscarriage',
]

// ── Initial form state ─────────────────────────────────────────
const INITIAL_VALUES = {
  fullName:              '',
  age:                   '',
  village:               '',
  phoneNumber:           '',
  orgUnit:               '',
  gestationalAge:        '',
  parity:                '',
  previousComplications: 'None',
}

// ── Field-level validation ─────────────────────────────────────
function validate(values, step) {
  const errors = {}

  if (step === 0 || step === 'all') {
    if (!values.fullName.trim())
      errors.fullName = 'Full name is required'
    if (!values.age || values.age < 10 || values.age > 60)
      errors.age = 'Enter a valid age (10–60)'
    if (!values.village.trim())
      errors.village = 'Village is required'
    if (!values.phoneNumber.trim())
      errors.phoneNumber = 'Phone number is required'
    else if (!/^[0-9+\s\-()]{7,15}$/.test(values.phoneNumber))
      errors.phoneNumber = 'Enter a valid phone number'
    if (!values.orgUnit)
      errors.orgUnit = 'Select a health facility'
  }

  if (step === 1 || step === 'all') {
    if (!values.gestationalAge || values.gestationalAge < 1 || values.gestationalAge > 42)
      errors.gestationalAge = 'Enter gestational age in weeks (1–42)'
    if (values.parity === '' || values.parity < 0 || values.parity > 15)
      errors.parity = 'Enter number of previous births (0–15)'
  }

  return errors
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #e91e8c 0%, #c2185b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ color: '#fff', fontSize: 20 }} />
      </Box>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} lineHeight={1.2}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

function RiskIndicator({ age, gestationalAge, parity }) {
  const risks = []
  if (age && (Number(age) < 18 || Number(age) > 35))
    risks.push({ label: 'Age risk', color: 'warning' })
  if (gestationalAge && Number(gestationalAge) > 20)
    risks.push({ label: 'Late presentation', color: 'error' })
  if (parity && Number(parity) >= 4)
    risks.push({ label: 'Grand multipara', color: 'warning' })

  if (risks.length === 0) return null

  return (
    <Alert
      severity="warning"
      icon={<Warning fontSize="small" />}
      sx={{ mt: 2, mb: 1, borderRadius: 2 }}
    >
      <AlertTitle sx={{ fontSize: 13, fontWeight: 600 }}>
        Risk factors detected
      </AlertTitle>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
        {risks.map((r) => (
          <Chip
            key={r.label}
            label={r.label}
            size="small"
            color={r.color}
            sx={{ fontWeight: 500 }}
          />
        ))}
      </Box>
    </Alert>
  )
}

// ─────────────────────────────────────────────────────────────
// Step 0 — Personal details
// ─────────────────────────────────────────────────────────────
function StepPersonal({ values, errors, onChange, orgUnits, orgUnitsLoading }) {
  return (
    <Box>
      <SectionHeader
        icon={PersonOutline}
        title="Personal details"
        subtitle="Patient identity and contact information"
      />
      <Grid container spacing={2.5}>

        {/* Full name */}
        <Grid item xs={12}>
          <TextField
            label="Full name"
            value={values.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            error={!!errors.fullName}
            helperText={errors.fullName}
            fullWidth
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutline fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            placeholder="e.g. Fatou Jallow"
          />
        </Grid>

        {/* Age */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Age"
            type="number"
            value={values.age}
            onChange={(e) => onChange('age', e.target.value)}
            error={!!errors.age}
            helperText={errors.age || (values.age < 18 || values.age > 35 ? '⚠ Outside 18–35 normal range' : '')}
            fullWidth
            required
            inputProps={{ min: 10, max: 60 }}
            InputProps={{
              endAdornment: <InputAdornment position="end">yrs</InputAdornment>,
            }}
          />
        </Grid>

        {/* Village */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Village"
            value={values.village}
            onChange={(e) => onChange('village', e.target.value)}
            error={!!errors.village}
            helperText={errors.village}
            fullWidth
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOn fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            placeholder="e.g. Bakau"
          />
        </Grid>

        {/* Phone */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Phone number"
            value={values.phoneNumber}
            onChange={(e) => onChange('phoneNumber', e.target.value)}
            error={!!errors.phoneNumber}
            helperText={errors.phoneNumber}
            fullWidth
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneAndroid fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            placeholder="e.g. +220 7012345"
          />
        </Grid>

        {/* Health facility */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.orgUnit} required>
            <TextField
              select
              label="Health facility"
              value={values.orgUnit}
              onChange={(e) => onChange('orgUnit', e.target.value)}
              error={!!errors.orgUnit}
              helperText={errors.orgUnit}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocalHospital fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            >
              {orgUnitsLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={16} sx={{ mr: 1 }} /> Loading...
                </MenuItem>
              ) : (
                orgUnits.map((ou) => (
                  <MenuItem key={ou.id} value={ou.id}>
                    {ou.displayName}
                  </MenuItem>
                ))
              )}
            </TextField>
          </FormControl>
        </Grid>

      </Grid>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────
// Step 1 — Pregnancy info
// ─────────────────────────────────────────────────────────────
function StepPregnancy({ values, errors, onChange }) {
  return (
    <Box>
      <SectionHeader
        icon={PregnantWoman}
        title="Pregnancy information"
        subtitle="Clinical details for this pregnancy"
      />
      <Grid container spacing={2.5}>

        {/* Gestational age */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Gestational age"
            type="number"
            value={values.gestationalAge}
            onChange={(e) => onChange('gestationalAge', e.target.value)}
            error={!!errors.gestationalAge}
            helperText={
              errors.gestationalAge ||
              'Weeks since last menstrual period'
            }
            fullWidth
            required
            inputProps={{ min: 1, max: 42 }}
            InputProps={{
              endAdornment: <InputAdornment position="end">weeks</InputAdornment>,
              startAdornment: (
                <InputAdornment position="start">
                  <PregnantWoman fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        {/* Parity */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Parity"
            type="number"
            value={values.parity}
            onChange={(e) => onChange('parity', e.target.value)}
            error={!!errors.parity}
            helperText={errors.parity || 'Number of previous births'}
            fullWidth
            required
            inputProps={{ min: 0, max: 15 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FamilyRestroom fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Parity is the number of times a woman has given birth to a baby of 22+ weeks gestation">
                    <HelpOutline fontSize="small" color="action" sx={{ cursor: 'help' }} />
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        {/* Previous complications */}
        <Grid item xs={12}>
          <FormControl fullWidth>
            <TextField
              select
              label="Previous complications"
              value={values.previousComplications}
              onChange={(e) => onChange('previousComplications', e.target.value)}
              helperText="Select the most significant previous complication"
            >
              {COMPLICATION_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt === 'None' ? (
                    <Typography color="text.secondary">{opt}</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Warning fontSize="small" color="warning" />
                      {opt}
                    </Box>
                  )}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
        </Grid>

      </Grid>

      {/* Live risk indicator */}
      <RiskIndicator
        age={values.age}
        gestationalAge={values.gestationalAge}
        parity={values.parity}
      />
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────
// Step 2 — Review
// ─────────────────────────────────────────────────────────────
function ReviewRow({ label, value, highlight }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 1.2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={500}
        color={highlight ? 'error.main' : 'text.primary'}
        textAlign="right"
      >
        {value || '—'}
      </Typography>
    </Box>
  )
}

function StepReview({ values, orgUnits }) {
  const facilityName =
    orgUnits.find((o) => o.id === values.orgUnit)?.displayName || values.orgUnit

  const isHighRisk =
    values.age < 18 ||
    values.age > 35 ||
    values.gestationalAge > 20 ||
    values.parity >= 4 ||
    values.previousComplications !== 'None'

  return (
    <Box>
      <SectionHeader
        icon={CheckCircle}
        title="Review registration"
        subtitle="Confirm all details before submitting"
      />

      {isHighRisk && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          <AlertTitle sx={{ fontWeight: 600 }}>High-risk pregnancy</AlertTitle>
          This patient has one or more high-risk indicators. She will be
          flagged automatically in the alerts dashboard after registration.
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Typography
            variant="overline"
            color="primary"
            fontWeight={600}
            display="block"
            mb={1}
          >
            Personal details
          </Typography>
          <ReviewRow label="Full name"       value={values.fullName} />
          <ReviewRow label="Age"             value={`${values.age} years`}
            highlight={values.age < 18 || values.age > 35} />
          <ReviewRow label="Village"         value={values.village} />
          <ReviewRow label="Phone number"    value={values.phoneNumber} />
          <ReviewRow label="Health facility" value={facilityName} />
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Typography
            variant="overline"
            color="primary"
            fontWeight={600}
            display="block"
            mb={1}
          >
            Pregnancy information
          </Typography>
          <ReviewRow label="Gestational age" value={`${values.gestationalAge} weeks`}
            highlight={values.gestationalAge > 20} />
          <ReviewRow label="Parity"          value={values.parity}
            highlight={values.parity >= 4} />
          <ReviewRow label="Previous complications" value={values.previousComplications}
            highlight={values.previousComplications !== 'None'} />
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary" display="block" mt={2}>
        Submitting will create a Tracked Entity Instance and enroll this
        patient in the Antenatal Care program on DHIS2.
      </Typography>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function RegisterPatient({ onSuccess }) {
  const [activeStep, setActiveStep] = useState(0)
  const [values, setValues]         = useState(INITIAL_VALUES)
  const [errors, setErrors]         = useState({})
  const [snackbar, setSnackbar]     = useState({ open: false, message: '', severity: 'success' })

  // Fetch org units for facility dropdown
  const { data: orgUnitData, loading: orgUnitsLoading } = useDataQuery(ORG_UNITS_QUERY)
  const orgUnits = orgUnitData?.orgUnits?.organisationUnits ?? []

  // Registration mutation hook
  const { register, loading: submitting } = useRegisterPatient()

  // ── Field change handler ──────────────────────────────────
  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
    // Clear field error on change
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  // ── Step navigation ───────────────────────────────────────
  function handleNext() {
    const stepErrors = validate(values, activeStep)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setActiveStep((s) => s + 1)
  }

  function handleBack() {
    setActiveStep((s) => s - 1)
  }

  // ── Final submission ──────────────────────────────────────
  async function handleSubmit() {
    const allErrors = validate(values, 'all')
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      setActiveStep(0)
      return
    }

    try {
      const { teiUid, enrollmentUid } = await register(values, values.orgUnit)

      setSnackbar({
        open: true,
        message: `Patient registered successfully (ID: ${teiUid})`,
        severity: 'success',
      })

      // Reset form
      setValues(INITIAL_VALUES)
      setActiveStep(0)

      // Notify parent page
      onSuccess?.({ teiUid, enrollmentUid })
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Registration failed: ${err.message}`,
        severity: 'error',
      })
    }
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', px: { xs: 2, sm: 0 } }}>

      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Register pregnant woman
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create a new antenatal care record. The patient will be enrolled
          in the ANC program and monitored for risk factors.
        </Typography>
      </Box>

      {/* Progress stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step progress bar */}
      <LinearProgress
        variant="determinate"
        value={((activeStep) / (STEPS.length - 1)) * 100}
        sx={{
          mb: 3,
          height: 4,
          borderRadius: 2,
          backgroundColor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            background: 'linear-gradient(90deg, #e91e8c, #c2185b)',
            borderRadius: 2,
          },
        }}
      />

      {/* Form card */}
      <Card
        elevation={0}
        variant="outlined"
        sx={{ borderRadius: 3, p: { xs: 2, sm: 3 } }}
      >
        <CardContent sx={{ p: 0 }}>

          {/* Step content */}
          {activeStep === 0 && (
            <StepPersonal
              values={values}
              errors={errors}
              onChange={handleChange}
              orgUnits={orgUnits}
              orgUnitsLoading={orgUnitsLoading}
            />
          )}
          {activeStep === 1 && (
            <StepPregnancy
              values={values}
              errors={errors}
              onChange={handleChange}
            />
          )}
          {activeStep === 2 && (
            <StepReview values={values} orgUnits={orgUnits} />
          )}

          <Divider sx={{ my: 3 }} />

          {/* Navigation buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || submitting}
              startIcon={<ArrowBack />}
              variant="text"
              color="inherit"
            >
              Back
            </Button>

            <Typography variant="caption" color="text.secondary">
              Step {activeStep + 1} of {STEPS.length}
            </Typography>

            {activeStep < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                variant="contained"
                endIcon={<ArrowForward />}
                sx={{
                  background: 'linear-gradient(135deg, #e91e8c 0%, #c2185b 100%)',
                  px: 3,
                  borderRadius: 2,
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={submitting}
                endIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                sx={{
                  background: submitting
                    ? undefined
                    : 'linear-gradient(135deg, #e91e8c 0%, #c2185b 100%)',
                  px: 3,
                  borderRadius: 2,
                  minWidth: 160,
                }}
              >
                {submitting ? 'Registering...' : 'Register patient'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Success / error snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ borderRadius: 2, minWidth: 340 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Box>
  )
}