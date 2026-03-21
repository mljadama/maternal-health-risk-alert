import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataQuery } from '@dhis2/app-runtime'
import {
    Alert, AlertTitle, Box, Button, Card, CardContent, Chip,
    CircularProgress, Divider, Grid, InputAdornment, LinearProgress,
    MenuItem, Snackbar, Step, StepLabel, Stepper, TextField,
    Tooltip, Typography,
} from '@mui/material'
import {
    PersonOutline, LocationOn, PhoneAndroid, LocalHospital,
    PregnantWoman, FamilyRestroom, Warning, CheckCircle,
    ArrowForward, ArrowBack, HelpOutline,
} from '@mui/icons-material'
import { useRegisterPatient } from '../hooks/useRegisterPatient.js'
import { COMPLICATION_OPTIONS } from '../config/dhis2.js'

const STEPS = ['Personal details', 'Pregnancy info', 'Review & submit']

const INIT = {
    fullName: '',
    age: '',
    village: '',
    phoneNumber: '',
    orgUnit: '',
    gestationalAge: '',
    parity: '',
    previousComplications: 'None',
}

const C = {
    pink: '#e91e8c',
    pinkDark: '#c2185b',
    text: '#0f172a',
    text2: '#64748b',
    border: '#e2e8f0',
    bg: '#f8fafc',
}

const ORG_UNITS_QUERY = {
    orgUnits: {
        resource: 'organisationUnits',
        params: { fields: 'id,displayName', userOnly: true, paging: false },
    },
}

function validate(values, step) {
    const errors = {}
    if (step === 0 || step === 'all') {
        if (!values.fullName.trim()) errors.fullName = 'Required'
        if (!values.age || values.age < 10 || values.age > 60) errors.age = 'Enter valid age (10 to 60)'
        if (!values.village.trim()) errors.village = 'Required'
        if (!values.phoneNumber.trim()) errors.phoneNumber = 'Required'
        if (!values.orgUnit) errors.orgUnit = 'Select a facility'
    }
    if (step === 1 || step === 'all') {
        if (!values.gestationalAge || values.gestationalAge < 1 || values.gestationalAge > 42) errors.gestationalAge = 'Enter weeks (1 to 42)'
        if (values.parity === '' || values.parity < 0 || values.parity > 15) errors.parity = 'Enter previous births (0 to 15)'
    }
    return errors
}

function RiskIndicator({ age, gestationalAge, parity }) {
    const flags = []
    if (age && (Number(age) < 18 || Number(age) > 35)) flags.push('Age risk')
    if (gestationalAge && Number(gestationalAge) > 13) flags.push('Late presentation')
    if (parity && Number(parity) >= 4) flags.push('Grand multipara')
    if (!flags.length) return null
    return (
        <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
            <AlertTitle sx={{ fontSize: 13, fontWeight: 600 }}>Risk factors detected</AlertTitle>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                {flags.map(f => (
                    <Chip key={f} label={f} size="small" color="warning" sx={{ fontWeight: 600 }} />
                ))}
            </Box>
        </Alert>
    )
}

export default function RegisterPatient() {
    const navigate = useNavigate()
    const [step, setStep] = useState(0)
    const [vals, setVals] = useState(INIT)
    const [errs, setErrs] = useState({})
    const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' })
    const [saved, setSaved] = useState(false)

    const { data: ouData, loading: ouLoading } = useDataQuery(ORG_UNITS_QUERY)
    const orgUnits = ouData?.orgUnits?.organisationUnits ?? []

    const { register, loading: submitting } = useRegisterPatient()

    function change(field, value) {
        setVals(prev => ({ ...prev, [field]: value }))
        if (errs[field]) setErrs(prev => ({ ...prev, [field]: undefined }))
    }

    function handleNext() {
        const e = validate(vals, step)
        if (Object.keys(e).length) { setErrs(e); return }
        setErrs({})
        setStep(s => s + 1)
    }

    async function handleSubmit() {
        const e = validate(vals, 'all')
        if (Object.keys(e).length) { setErrs(e); setStep(0); return }
        try {
            await register(vals, vals.orgUnit)
            setSaved(true)
            setSnack({ open: true, msg: 'Patient registered successfully!', sev: 'success' })
        } catch (err) {
            setSnack({ open: true, msg: 'Registration failed: ' + err.message, sev: 'error' })
        }
    }

    const facilityName = orgUnits.find(o => o.id === vals.orgUnit)?.displayName || vals.orgUnit

    const riskFlags = []
    if (vals.age && (Number(vals.age) < 18 || Number(vals.age) > 35)) riskFlags.push('Age risk')
    if (vals.gestationalAge && Number(vals.gestationalAge) > 13) riskFlags.push('Late presentation')
    if (vals.parity && Number(vals.parity) >= 4) riskFlags.push('Grand multipara')

    return (
        <Box sx={{ background: C.bg, minHeight: '100vh', p: { xs: 2, md: 3 } }}>
            <Box sx={{ maxWidth: 680, mx: 'auto' }}>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" fontWeight={800} sx={{ color: C.text }}>
                        Register pregnant woman
                    </Typography>
                    <Typography variant="body2" sx={{ color: C.text2, mt: 0.5 }}>
                        Enroll a new patient in the Antenatal Care program
                    </Typography>
                </Box>

                <Stepper activeStep={step} sx={{ mb: 3 }}>
                    {STEPS.map(l => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
                </Stepper>

                <LinearProgress
                    variant="determinate"
                    value={(step / (STEPS.length - 1)) * 100}
                    sx={{
                        mb: 3, height: 4, borderRadius: 2,
                        backgroundColor: '#e2e8f0',
                        '& .MuiLinearProgress-bar': {
                            background: 'linear-gradient(90deg, #e91e8c, #c2185b)',
                            borderRadius: 2,
                        },
                    }}
                />

                <Card elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>

                        {step === 0 && (
                            <Grid container spacing={2.5}>
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Box sx={{ width: 38, height: 38, borderRadius: '9px', background: 'linear-gradient(135deg,#e91e8c,#c2185b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <PersonOutline sx={{ color: '#fff', fontSize: 19 }} />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={700}>Personal details</Typography>
                                            <Typography variant="caption" color="text.secondary">Patient identity and contact</Typography>
                                        </Box>
                                    </Box>
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        label="Full name" value={vals.fullName}
                                        onChange={e => change('fullName', e.target.value)}
                                        error={!!errs.fullName} helperText={errs.fullName}
                                        fullWidth required placeholder="e.g. Fatou Jallow"
                                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline fontSize="small" color="action" /></InputAdornment> }}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Age" type="number" value={vals.age}
                                        onChange={e => change('age', e.target.value)}
                                        error={!!errs.age}
                                        helperText={errs.age || (vals.age && (vals.age < 18 || vals.age > 35) ? 'Outside 18 to 35 normal range' : '')}
                                        fullWidth required inputProps={{ min: 10, max: 60 }}
                                        InputProps={{ endAdornment: <InputAdornment position="end">yrs</InputAdornment> }}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Village" value={vals.village}
                                        onChange={e => change('village', e.target.value)}
                                        error={!!errs.village} helperText={errs.village}
                                        fullWidth required placeholder="e.g. Bakau"
                                        InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment> }}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Phone number" value={vals.phoneNumber}
                                        onChange={e => change('phoneNumber', e.target.value)}
                                        error={!!errs.phoneNumber} helperText={errs.phoneNumber}
                                        fullWidth required placeholder="+220 7012345"
                                        InputProps={{ startAdornment: <InputAdornment position="start"><PhoneAndroid fontSize="small" color="action" /></InputAdornment> }}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select label="Health facility" value={vals.orgUnit}
                                        onChange={e => change('orgUnit', e.target.value)}
                                        error={!!errs.orgUnit} helperText={errs.orgUnit}
                                        fullWidth required
                                        InputProps={{ startAdornment: <InputAdornment position="start"><LocalHospital fontSize="small" color="action" /></InputAdornment> }}
                                    >
                                        {ouLoading
                                            ? <MenuItem disabled><CircularProgress size={14} sx={{ mr: 1 }} />Loading...</MenuItem>
                                            : orgUnits.map(o => <MenuItem key={o.id} value={o.id}>{o.displayName}</MenuItem>)
                                        }
                                    </TextField>
                                </Grid>
                            </Grid>
                        )}

                        {step === 1 && (
                            <Grid container spacing={2.5}>
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Box sx={{ width: 38, height: 38, borderRadius: '9px', background: 'linear-gradient(135deg,#e91e8c,#c2185b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <PregnantWoman sx={{ color: '#fff', fontSize: 19 }} />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={700}>Pregnancy information</Typography>
                                            <Typography variant="caption" color="text.secondary">Clinical details for this pregnancy</Typography>
                                        </Box>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Gestational age" type="number" value={vals.gestationalAge}
                                        onChange={e => change('gestationalAge', e.target.value)}
                                        error={!!errs.gestationalAge} helperText={errs.gestationalAge || 'Weeks since LMP'}
                                        fullWidth required inputProps={{ min: 1, max: 42 }}
                                        InputProps={{ endAdornment: <InputAdornment position="end">weeks</InputAdornment> }}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Parity" type="number" value={vals.parity}
                                        onChange={e => change('parity', e.target.value)}
                                        error={!!errs.parity} helperText={errs.parity || 'Number of previous births'}
                                        fullWidth required inputProps={{ min: 0, max: 15 }}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><FamilyRestroom fontSize="small" color="action" /></InputAdornment>,
                                            endAdornment: <InputAdornment position="end"><Tooltip title="Number of births at 22 weeks or more"><HelpOutline fontSize="small" color="action" sx={{ cursor: 'help' }} /></Tooltip></InputAdornment>,
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        select label="Previous complications" value={vals.previousComplications}
                                        onChange={e => change('previousComplications', e.target.value)}
                                        helperText="Most significant previous complication" fullWidth
                                    >
                                        {COMPLICATION_OPTIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                    </TextField>
                                </Grid>

                                <Grid item xs={12}>
                                    <RiskIndicator age={vals.age} gestationalAge={vals.gestationalAge} parity={vals.parity} />
                                </Grid>
                            </Grid>
                        )}

                        {step === 2 && !saved && (
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                                    <Box sx={{ width: 38, height: 38, borderRadius: '9px', background: 'linear-gradient(135deg,#e91e8c,#c2185b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircle sx={{ color: '#fff', fontSize: 19 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={700}>Review registration</Typography>
                                        <Typography variant="caption" color="text.secondary">Confirm all details before submitting</Typography>
                                    </Box>
                                </Box>

                                {riskFlags.length > 0 && (
                                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                        <AlertTitle sx={{ fontWeight: 700 }}>High-risk pregnancy detected</AlertTitle>
                                        This patient will be flagged in the alerts dashboard.
                                    </Alert>
                                )}

                                {[
                                    {
                                        title: 'Personal details',
                                        rows: [
                                            ['Full name', vals.fullName],
                                            ['Age', vals.age + ' years'],
                                            ['Village', vals.village],
                                            ['Phone', vals.phoneNumber],
                                            ['Facility', facilityName || 'Not selected'],
                                        ],
                                    },
                                    {
                                        title: 'Pregnancy',
                                        rows: [
                                            ['Gestational age', vals.gestationalAge + ' weeks'],
                                            ['Parity', vals.parity],
                                            ['Previous complications', vals.previousComplications],
                                        ],
                                    },
                                ].map(({ title, rows }) => (
                                    <Card key={title} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Typography variant="overline" color="primary" fontWeight={700} sx={{ fontSize: 10 }}>{title}</Typography>
                                            {rows.map(([k, v]) => (
                                                <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8, borderBottom: '1px solid #f1f5f9', '&:last-child': { borderBottom: 'none' } }}>
                                                    <Typography variant="caption" color="text.secondary">{k}</Typography>
                                                    <Typography variant="caption" fontWeight={600}>{v || 'Not provided'}</Typography>
                                                </Box>
                                            ))}
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        )}

                        {saved && (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                                    <CheckCircle sx={{ color: '#16a34a', fontSize: 28 }} />
                                </Box>
                                <Typography variant="h6" fontWeight={800} gutterBottom>Patient registered!</Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {vals.fullName} is now enrolled in the ANC program.
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mt: 3 }}>
                                    <Button variant="outlined" onClick={() => { setVals(INIT); setStep(0); setSaved(false) }}>
                                        Register another
                                    </Button>
                                    <Button variant="contained" onClick={() => navigate('/patients')}
                                        sx={{ background: 'linear-gradient(135deg,#e91e8c,#c2185b)' }}>
                                        View patients
                                    </Button>
                                </Box>
                            </Box>
                        )}

                        {!saved && (
                            <>
                                <Divider sx={{ my: 3 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Button
                                        onClick={() => setStep(s => s - 1)}
                                        disabled={step === 0 || submitting}
                                        startIcon={<ArrowBack />}
                                        color="inherit"
                                    >
                                        Back
                                    </Button>
                                    <Typography variant="caption" color="text.secondary">
                                        Step {step + 1} of {STEPS.length}
                                    </Typography>
                                    {step < STEPS.length - 1 ? (
                                        <Button
                                            onClick={handleNext}
                                            variant="contained"
                                            endIcon={<ArrowForward />}
                                            sx={{ background: 'linear-gradient(135deg,#e91e8c,#c2185b)', px: 3, borderRadius: 2 }}
                                        >
                                            Continue
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleSubmit}
                                            variant="contained"
                                            disabled={submitting}
                                            endIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <CheckCircle />}
                                            sx={{ background: 'linear-gradient(135deg,#e91e8c,#c2185b)', px: 3, borderRadius: 2, minWidth: 160 }}
                                        >
                                            {submitting ? 'Registering...' : 'Register patient'}
                                        </Button>
                                    )}
                                </Box>
                            </>
                        )}

                    </CardContent>
                </Card>
            </Box>

            <Snackbar
                open={snack.open}
                autoHideDuration={6000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snack.sev}
                    variant="filled"
                    onClose={() => setSnack(s => ({ ...s, open: false }))}
                    sx={{ borderRadius: 2 }}
                >
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    )
}