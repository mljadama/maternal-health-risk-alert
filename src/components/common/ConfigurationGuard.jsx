import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, NoticeBox } from '@dhis2/ui'
import { useAppContext } from '../../context/AppContext.jsx'
import { validateAppSettings } from '../../config/appSettings.js'
import styles from './ConfigurationGuard.module.css'

export default function ConfigurationGuard({ children }) {
  const navigate = useNavigate()
  const { appSettings } = useAppContext()
  const validation = useMemo(() => validateAppSettings(appSettings), [appSettings])

  if (validation.isValid) {
    return children
  }

  // Configuration incomplete — show setup banner
  return (
    <Box padding="24px">
      <NoticeBox
        warning
        title="Setup Required: Configure Your Metadata"
        style={{ marginBottom: '16px' }}
      >
        <div>
          <p>
            Before using the Maternal Health Risk Alert app, you must configure your DHIS2 ANC program metadata.
          </p>
          <p style={{ marginTop: '8px', marginBottom: '16px' }}>
            The app works on any DHIS2 instance, but needs to know the UIDs of your:
          </p>
          <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
            <li>ANC Program</li>
            <li>ANC Visit Program Stage</li>
            <li>Tracked Entity Type (e.g., Pregnant Woman)</li>
            <li>Tracked Entity Attributes (Full Name, Age, etc.)</li>
            <li>Data Elements (BP Systolic, Haemoglobin, etc.)</li>
          </ul>
          <Button primary onClick={() => navigate('/configuration')}>
            Open Configuration →
          </Button>
        </div>
      </NoticeBox>

      <NoticeBox
        info
        title="How to find your UIDs"
      >
        <ol style={{ marginLeft: '20px' }}>
          <li>Go to <strong>DHIS2 Maintenance</strong> → <strong>Tracker programs</strong></li>
          <li>Find your ANC program and copy its UID</li>
          <li>Repeat for Program Stage, Attributes, and Data Elements</li>
          <li>Paste these UIDs into the Configuration page</li>
        </ol>
      </NoticeBox>

      {children}
    </Box>
  )
}
