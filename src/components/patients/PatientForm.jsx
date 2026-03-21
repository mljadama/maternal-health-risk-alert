// src/components/patients/PatientForm.jsx
// Shared demographic form fields used by the registration page.
import React from 'react'
import {
  Box, CircularProgress, Grid, InputAdornment,
  MenuItem, TextField, Typography,
} from '@mui/material'
import {
  PersonOutline, LocationOn, PhoneAndroid, LocalHospital,
} from '@mui/icons-material'
import { COMPLICATION_OPTIONS } from '../../config/dhis2.js'

export function PersonalDetailsFields({ values, errors, onChange, orgUnits = [], orgUnitsLoading = false }) {
  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12}>
        <TextField
          label="Full name" value={values.fullName}
          onChange={e => onChange('fullName', e.target.value)}
          error={!!errors.fullName} helperText={errors.fullName}
          fullWidth required placeholder="e.g. Fatou Jallow"
          InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline fontSize="small" color="action" /></InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Age" type="number" value={values.age}
          onChange={e => onChange('age', e.target.value)}
          error={!!errors.age}
          helperText={errors.age || (values.age && (Number(values.age) < 18 || Number(values.age) > 35) ? '⚠ Outside 18–35 normal range' : '')}
          fullWidth required inputProps={{ min: 10, max: 60 }}
          InputProps={{ endAdornment: <InputAdornment position="end">yrs</InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Village" value={values.village}
          onChange={e => onChange('village', e.target.value)}
          error={!!errors.village} helperText={errors.village}
          fullWidth required placeholder="e.g. Bakau"
          InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Phone number" value={values.phoneNumber}
          onChange={e => onChange('phoneNumber', e.target.value)}
          error={!!errors.phoneNumber} helperText={errors.phoneNumber}
          fullWidth required placeholder="+220 7012345"
          InputProps={{ startAdornment: <InputAdornment position="start"><PhoneAndroid fontSize="small" color="action" /></InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select label="Health facility" value={values.orgUnit}
          onChange={e => onChange('orgUnit', e.target.value)}
          error={!!errors.orgUnit} helperText={errors.orgUnit}
          fullWidth required
          InputProps={{ startAdornment: <InputAdornment position="start"><LocalHospital fontSize="small" color="action" /></InputAdornment> }}
        >
          {orgUnitsLoading
            ? <MenuItem disabled><CircularProgress size={14} sx={{ mr: 1 }} />Loading…</MenuItem>
            : orgUnits.map(o => <MenuItem key={o.id} value={o.id}>{o.displayName}</MenuItem>)
          }
        </TextField>
      </Grid>
    </Grid>
  )
}

export function PregnancyDetailsFields({ values, errors, onChange }) {
  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Gestational age" type="number" value={values.gestationalAge}
          onChange={e => onChange('gestationalAge', e.target.value)}
          error={!!errors.gestationalAge} helperText={errors.gestationalAge || 'Weeks since LMP'}
          fullWidth required inputProps={{ min: 1, max: 42 }}
          InputProps={{ endAdornment: <InputAdornment position="end">weeks</InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Parity" type="number" value={values.parity}
          onChange={e => onChange('parity', e.target.value)}
          error={!!errors.parity} helperText={errors.parity || 'Number of previous births'}
          fullWidth required inputProps={{ min: 0, max: 15 }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          select label="Previous complications" value={values.previousComplications}
          onChange={e => onChange('previousComplications', e.target.value)}
          helperText="Most significant previous complication" fullWidth
        >
          {COMPLICATION_OPTIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </Grid>
    </Grid>
  )
}