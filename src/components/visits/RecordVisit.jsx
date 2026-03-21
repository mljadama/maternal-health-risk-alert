// src/components/visits/RecordVisit.jsx
// ─────────────────────────────────────────────────────────────
// ANC visit recording form.
// Fields: blood pressure, haemoglobin, weight, visit date,
//         malaria test, iron supplementation, nurse notes,
//         danger signs, gestational age, next visit date.
//
// On submit:
//   POST /api/events  →  stores a DHIS2 Tracker Event
//   Then runs client-side risk engine to show instant assessment.
// ─────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Grid,
  InputAdornment,
  MenuItem,
  Snackbar,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Favorite,
  Bloodtype,
  MonitorWeight,
  CalendarMonth,
  BugReport,
  Medication,
  Notes,
  Warning,
  CheckCircle,
  ArrowForward,
  LocalHospital,
  Science,
} from '@mui/icons-material'

import { useRecordVisit }                    from '../../hooks/useRecordVisit.js'
import { evaluateVisit, getRiskColor, getRiskLabel } from '../../services/riskEngine.js'
import { MALARIA_RESULTS, DANGER_SIGN_OPTIONS }       from '../../config/dhis2.js'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

const INITIAL_VALUES = {
  visitDate:           today(),
  visitNumber:         1,
  gestationalAge:      '',
  bpSystolic:          '',
  bpDiastolic:         '',
  haemoglobin:         '',
  weight:              '',
  malariaTestDone:     false,
  malariaTestResult:   'Not done',
  ironSupplementation: false,
  folicAcid:           false,
  dangerSigns:         [],
  nurseNotes:          '',
  nextVisitDate:       '',
}

function validate(values) {
  const errors = {}
  if (!values.visitDate)
    errors.visitDate = 'Visit date is required'
  if (!values.bpSystolic || values.bpSystolic < 60 || values.bpSystolic > 250)
    errors.bpSystolic = 'Enter systolic BP (60–250 mmHg)'
  if (!values.bpDiastolic || values.bpDiastolic < 40 || values.bpDiastolic > 150)
    errors.bpDiastolic = 'Enter diastolic BP (40–150 mmHg)'
  if (!values.haemoglobin || values.haemoglobin < 3 || values.haemoglobin > 20)
    errors.haemoglobin = 'Enter Hb level (3–20 g/dL)'
  if (!values.weight || values.weight < 25 || values.weight > 200)
    errors.weight = 'Enter weight (25–200 kg)'
  if (!values.gestationalAge || values.gestationalAge < 1 || values.gestationalAge > 42)
    errors.gestationalAge = 'Enter gestational age (1–42 weeks)'
  if (values.malariaTestDone && !values.malariaTestResult)
    errors.malariaTestResult = 'Select a test result'
  return errors
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, color = '#1565c0', title, subtitle }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
      <Box sx={{
        width: 38, height: 38, borderRadius: '9px',
        backgroundColor: color + '18',
        border: `1.5px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon sx={{ color, fontSize: 19 }} />
      </Box>
      <Box>
        <Typography variant="subtitle2" fontWeight={600} lineHeight={1.2}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Box>
  )
}

function BPMeter({ systolic, diastolic }) {
  if (!systolic || !diastolic) return null
  const s = Number(systolic), d = Number(diastolic)
  let label = 'Normal', color = 'success'
  if (s >= 160 || d >= 110) { label = 'Severe hypertension'; color = 'error' }
  else if (s >= 140 || d >= 90) { label = 'Hypertension'; color = 'error' }
  else if (s >= 130 || d >= 80) { label = 'Elevated'; color = 'warning' }

  return (
    <Chip
      size="small"
      label={`${s}/${d} mmHg — ${label}`}
      color={color}
      variant="outlined"
      sx={{ mt: 1, fontWeight: 500, fontSize: 11 }}
    />
  )
}

function HbMeter({ value }) {
  if (!value) return null
  const v = Number(value)
  let label = 'Normal', color = 'success'
  if (v < 7)  { label = 'Severe anaemia';   color = 'error' }
  else if (v < 10) { label = 'Moderate anaemia'; color = 'warning' }
  else if (v < 11) { label = 'Mild anaemia';     color = 'warning' }
  return (
    <Chip
      size="small"
      label={`${v} g/dL — ${label}`}
      color={color}
      variant="outlined"
      sx={{ mt: 1, fontWeight: 500, fontSize: 11 }}
    />
  )
}

// Risk assessment summary card shown after save
function RiskAssessmentCard({ assessment }) {
  if (!assessment) return null
  const { level, score, flags } = assessment
  const color  = getRiskColor(level)
  const label  = getRiskLabel(level)
  const bgMap  = { error: '#fff5f5', warning: '#fffbf0', success: '#f0fdf4' }
  const bdMap  = { error: '#fecaca', warning: '#fde68a', success: '#bbf7d0' }

  return (
    <Card
      elevation={0}
      sx={{
        mt: 3,
        border: '1.5px solid',
        borderColor: bdMap[color],
        backgroundColor: bgMap[color],
        borderRadius: 3,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography variant="overline" sx={{ color: `${color}.main`, fontWeight: 700, fontSize: 10 }}>
              Risk assessment
            </Typography>
            <Typography variant="h6" fontWeight={700} sx={{ color: `${color}.dark`, lineHeight: 1.2 }}>
              {label}
            </Typography>
          </Box>
          <Chip
            label={`Score: ${score}`}
            color={color}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        {flags.length > 0 ? (
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.8}>
              Risk factors identified ({flags.length}):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
              {flags.map((f) => (
                <Chip
                  key={f}
                  label={f}
                  size="small"
                  color={color}
                  variant="outlined"
                  icon={<Warning style={{ fontSize: 12 }} />}
                  sx={{ fontSize: 11 }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="success.dark">
            No risk factors detected. Continue routine ANC schedule.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

// DHIS2 payload preview panel
function PayloadPreview({ values }) {
  const preview = {
    resource: 'POST /api/events',
    body: {
      program:              'ANC_PROGRAM_UID',
      programStage:         'ANC_VISIT_STAGE_UID',
      orgUnit:              '<facility_UID>',
      trackedEntityInstance:'<patient_TEI_UID>',
      enrollment:           '<enrollment_UID>',
      eventDate:            values.visitDate || today(),
      status:               'COMPLETED',
      dataValues: [
        { dataElement: 'DE_BP_SYSTOLIC_UID',    value: values.bpSystolic    || '' },
        { dataElement: 'DE_BP_DIASTOLIC_UID',   value: values.bpDiastolic   || '' },
        { dataElement: 'DE_HAEMOGLOBIN_UID',    value: values.haemoglobin   || '' },
        { dataElement: 'DE_WEIGHT_UID',         value: values.weight        || '' },
        { dataElement: 'DE_GESTATIONAL_AGE_UID',value: values.gestationalAge|| '' },
        { dataElement: 'DE_MALARIA_RESULT_UID', value: values.malariaTestResult || 'Not done' },
        { dataElement: 'DE_IRON_SUPPL_UID',     value: values.ironSupplementation ? 'true' : 'false' },
        { dataElement: 'DE_NURSE_NOTES_UID',    value: values.nurseNotes    || '' },
        { dataElement: 'DE_DANGER_SIGNS_UID',   value: (values.dangerSigns || []).join(', ') },
      ],
    },
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
        DHIS2 API PAYLOAD PREVIEW
      </Typography>
      <Box
        component="pre"
        sx={{
          background: '#0f172a',
          color: '#e2e8f0',
          p: 2,
          borderRadius: 2,
          fontSize: 11,
          overflow: 'auto',
          lineHeight: 1.6,
          fontFamily: 'monospace',
          maxHeight: 320,
          '& .key':    { color: '#93c5fd' },
          '& .str':    { color: '#86efac' },
          '& .url':    { color: '#fbbf24', fontWeight: 700 },
        }}
      >
        <span className="url">{preview.resource}</span>
        {'\n\n'}
        {JSON.stringify(preview.body, null, 2)
          .split('\n')
          .map((line, i) => {
            const colored = line
              .replace(/"([^"]+)":/g, '<span class="key">"$1":</span>')
              .replace(/: "([^"]*)"/g, ': <span class="str">"$1"</span>')
            return (
              <span key={i} dangerouslySetInnerHTML={{ __html: colored + '\n' }} />
            )
          })}
      </Box>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function RecordVisit({
  patientName   = 'Fatou Jallow',
  teiUid        = 'PATIENT_TEI_UID',
  enrollmentUid = 'ENROLLMENT_UID',
  orgUnit       = 'ORG_UNIT_UID',
  visitNumber   = 1,
  onSuccess,
}) {
  const [values, setValues]           = useState({ ...INITIAL_VALUES, visitNumber })
  const [errors, setErrors]           = useState({})
  const [assessment, setAssessment]   = useState(null)
  const [showPayload, setShowPayload] = useState(false)
  const [snackbar, setSnackbar]       = useState({ open: false, message: '', severity: 'success' })
  const [saved, setSaved]             = useState(false)

  const { recordVisit, loading } = useRecordVisit()

  // ── Live risk preview (before save) ──────────────────────
  const liveRisk = useMemo(() => {
    if (!values.bpSystolic && !values.haemoglobin) return null
    return evaluateVisit({
      bpSystolic:      Number(values.bpSystolic),
      bpDiastolic:     Number(values.bpDiastolic),
      haemoglobin:     Number(values.haemoglobin),
      gestationalAge:  Number(values.gestationalAge),
      malariaTestResult: values.malariaTestResult,
      dangerSigns:     values.dangerSigns,
      isFirstVisit:    visitNumber === 1,
    })
  }, [values.bpSystolic, values.bpDiastolic, values.haemoglobin,
      values.gestationalAge, values.malariaTestResult, values.dangerSigns])

  function handleChange(field, value) {
    setValues(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function handleDangerSignToggle(sign) {
    setValues(prev => {
      const current = prev.dangerSigns
      return {
        ...prev,
        dangerSigns: current.includes(sign)
          ? current.filter(s => s !== sign)
          : [...current, sign],
      }
    })
  }

  async function handleSubmit() {
    const errs = validate(values)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    try {
      const { eventUid } = await recordVisit(values, teiUid, enrollmentUid, orgUnit)

      // Run risk engine on the saved visit
      const result = evaluateVisit({
        bpSystolic:        Number(values.bpSystolic),
        bpDiastolic:       Number(values.bpDiastolic),
        haemoglobin:       Number(values.haemoglobin),
        gestationalAge:    Number(values.gestationalAge),
        malariaTestResult: values.malariaTestResult,
        dangerSigns:       values.dangerSigns,
        isFirstVisit:      visitNumber === 1,
      })

      setAssessment(result)
      setSaved(true)
      setSnackbar({
        open: true,
        message: `Visit saved (Event ID: ${eventUid})`,
        severity: 'success',
      })
      onSuccess?.({ eventUid, assessment: result })
    } catch (err) {
      setSnackbar({ open: true, message: `Save failed: ${err.message}`, severity: 'error' })
    }
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2, sm: 0 } }}>

      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Record ANC visit</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.3}>
              <LocalHospital sx={{ fontSize: 13, mr: 0.5, verticalAlign: 'middle' }} />
              {patientName} · Visit {visitNumber}
            </Typography>
          </Box>
          {liveRisk && (
            <Chip
              label={`Live risk: ${getRiskLabel(liveRisk.level)}`}
              color={getRiskColor(liveRisk.level)}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
      </Box>

      <Card elevation={0} variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ p: 0 }}>

          {/* ── Section 1: Visit metadata ─────────────────── */}
          <SectionHeader icon={CalendarMonth} color="#1565c0" title="Visit details" subtitle="Date and gestational information" />
          <Grid container spacing={2} sx={{ mb: 3.5 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Visit date"
                type="date"
                value={values.visitDate}
                onChange={e => handleChange('visitDate', e.target.value)}
                error={!!errors.visitDate}
                helperText={errors.visitDate}
                fullWidth required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                label="Visit number"
                type="number"
                value={values.visitNumber}
                onChange={e => handleChange('visitNumber', e.target.value)}
                fullWidth
                inputProps={{ min: 1, max: 20 }}
                InputProps={{ endAdornment: <InputAdornment position="end">th</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                label="Gestational age"
                type="number"
                value={values.gestationalAge}
                onChange={e => handleChange('gestationalAge', e.target.value)}
                error={!!errors.gestationalAge}
                helperText={errors.gestationalAge}
                fullWidth required
                inputProps={{ min: 1, max: 42 }}
                InputProps={{ endAdornment: <InputAdornment position="end">wks</InputAdornment> }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* ── Section 2: Blood pressure ─────────────────── */}
          <SectionHeader icon={Favorite} color="#c62828" title="Blood pressure" subtitle="Measure both arms; record the higher reading" />
          <Grid container spacing={2} sx={{ mb: 3.5 }}>
            <Grid item xs={6}>
              <TextField
                label="Systolic"
                type="number"
                value={values.bpSystolic}
                onChange={e => handleChange('bpSystolic', e.target.value)}
                error={!!errors.bpSystolic}
                helperText={errors.bpSystolic}
                fullWidth required
                inputProps={{ min: 60, max: 250 }}
                InputProps={{ endAdornment: <InputAdornment position="end">mmHg</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Diastolic"
                type="number"
                value={values.bpDiastolic}
                onChange={e => handleChange('bpDiastolic', e.target.value)}
                error={!!errors.bpDiastolic}
                helperText={errors.bpDiastolic}
                fullWidth required
                inputProps={{ min: 40, max: 150 }}
                InputProps={{ endAdornment: <InputAdornment position="end">mmHg</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <BPMeter systolic={values.bpSystolic} diastolic={values.bpDiastolic} />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* ── Section 3: Lab results ────────────────────── */}
          <SectionHeader icon={Bloodtype} color="#6a1b9a" title="Lab results" subtitle="Haemoglobin and weight measurements" />
          <Grid container spacing={2} sx={{ mb: 3.5 }}>
            <Grid item xs={6}>
              <TextField
                label="Haemoglobin"
                type="number"
                value={values.haemoglobin}
                onChange={e => handleChange('haemoglobin', e.target.value)}
                error={!!errors.haemoglobin}
                helperText={errors.haemoglobin}
                fullWidth required
                inputProps={{ min: 3, max: 20, step: 0.1 }}
                InputProps={{ endAdornment: <InputAdornment position="end">g/dL</InputAdornment> }}
              />
              <HbMeter value={values.haemoglobin} />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Weight"
                type="number"
                value={values.weight}
                onChange={e => handleChange('weight', e.target.value)}
                error={!!errors.weight}
                helperText={errors.weight}
                fullWidth required
                inputProps={{ min: 25, max: 200, step: 0.1 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><MonitorWeight fontSize="small" color="action" /></InputAdornment>,
                  endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* ── Section 4: Malaria ────────────────────────── */}
          <SectionHeader icon={BugReport} color="#2e7d32" title="Malaria test" subtitle="Rapid diagnostic test (RDT) result" />
          <Grid container spacing={2} sx={{ mb: 3.5 }}>
            <Grid item xs={12} sm={5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={values.malariaTestDone}
                    onChange={e => handleChange('malariaTestDone', e.target.checked)}
                    color="success"
                  />
                }
                label={<Typography variant="body2">Malaria test performed</Typography>}
              />
            </Grid>
            <Grid item xs={12} sm={7}>
              <TextField
                select
                label="Test result"
                value={values.malariaTestResult}
                onChange={e => handleChange('malariaTestResult', e.target.value)}
                disabled={!values.malariaTestDone}
                error={!!errors.malariaTestResult}
                helperText={errors.malariaTestResult || (!values.malariaTestDone ? 'Enable test above first' : '')}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Science fontSize="small" color="action" /></InputAdornment>,
                }}
              >
                {MALARIA_RESULTS.map(r => (
                  <MenuItem key={r} value={r}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {r.startsWith('Positive') && <Warning fontSize="small" color="error" />}
                      {r === 'Negative' && <CheckCircle fontSize="small" color="success" />}
                      {r}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* ── Section 5: Supplementation ───────────────── */}
          <SectionHeader icon={Medication} color="#00695c" title="Supplementation given" subtitle="Tick all that were dispensed today" />
          <Box sx={{ display: 'flex', gap: 3, mb: 3.5, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={values.ironSupplementation}
                  onChange={e => handleChange('ironSupplementation', e.target.checked)}
                  color="primary"
                />
              }
              label={<Typography variant="body2">Iron supplementation</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={values.folicAcid}
                  onChange={e => handleChange('folicAcid', e.target.checked)}
                  color="primary"
                />
              }
              label={<Typography variant="body2">Folic acid</Typography>}
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── Section 6: Danger signs ───────────────────── */}
          <SectionHeader icon={Warning} color="#e65100" title="Danger signs" subtitle="Select all danger signs observed or reported" />
          <FormGroup row sx={{ mb: 3.5 }}>
            <Grid container spacing={0.5}>
              {DANGER_SIGN_OPTIONS.map(sign => (
                <Grid item xs={12} sm={6} key={sign}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={values.dangerSigns.includes(sign)}
                        onChange={() => handleDangerSignToggle(sign)}
                        sx={{ '&.Mui-checked': { color: 'error.main' } }}
                      />
                    }
                    label={<Typography variant="body2">{sign}</Typography>}
                  />
                </Grid>
              ))}
            </Grid>
          </FormGroup>
          {values.dangerSigns.length > 0 && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              <AlertTitle sx={{ fontWeight: 600, fontSize: 13 }}>
                {values.dangerSigns.length} danger sign{values.dangerSigns.length > 1 ? 's' : ''} flagged
              </AlertTitle>
              Refer patient immediately. Document referral in nurse notes.
            </Alert>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* ── Section 7: Nurse notes ────────────────────── */}
          <SectionHeader icon={Notes} color="#37474f" title="Nurse notes" subtitle="Clinical observations, referrals, follow-up actions" />
          <TextField
            label="Notes"
            multiline
            rows={4}
            value={values.nurseNotes}
            onChange={e => handleChange('nurseNotes', e.target.value)}
            fullWidth
            placeholder="e.g. Patient complains of mild headache. Referred for ophthalmology review. Next visit in 4 weeks..."
            sx={{ mb: 2 }}
          />
          <TextField
            label="Next visit date"
            type="date"
            value={values.nextVisitDate}
            onChange={e => handleChange('nextVisitDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 3.5 }}
          />

          {/* Risk assessment result (post-save) */}
          {saved && <RiskAssessmentCard assessment={assessment} />}

          {/* DHIS2 payload preview toggle */}
          <Box sx={{ mt: 3, mb: 1 }}>
            <Button
              size="small"
              variant="text"
              color="inherit"
              sx={{ fontSize: 11, color: 'text.secondary' }}
              onClick={() => setShowPayload(p => !p)}
            >
              {showPayload ? 'Hide' : 'Show'} DHIS2 API payload preview
            </Button>
            {showPayload && <PayloadPreview values={values} />}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Submit */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading || saved}
              size="large"
              endIcon={loading
                ? <CircularProgress size={16} color="inherit" />
                : saved ? <CheckCircle /> : <ArrowForward />}
              sx={{
                background: saved
                  ? undefined
                  : 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                px: 4,
                borderRadius: 2,
                minWidth: 180,
              }}
            >
              {loading ? 'Saving...' : saved ? 'Visit saved' : 'Save ANC visit'}
            </Button>
          </Box>

        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ borderRadius: 2, minWidth: 340 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}