// src/services/dhis2Api.js
// ─────────────────────────────────────────────────────────────
// Raw DHIS2 Web API helpers.
// These are used as the `resource` + `data` in useDataMutation,
// or called directly via the DHIS2 app runtime engine.
// ─────────────────────────────────────────────────────────────

import { DEFAULT_APP_SETTINGS } from '../config/appSettings.js'

/**
 * buildRegistrationPayload
 * ─────────────────────────
 * Transforms the RegisterPatient form values into a valid
 * DHIS2 Tracker POST payload for /api/trackedEntityInstances
 *
 * DHIS2 API endpoint:
 *   POST /api/trackedEntityInstances
 *
 * On success the API returns:
 *   { httpStatus: "OK", response: { importSummaries: [{ reference: "<new TEI uid>" }] } }
 *
 * @param {object} formValues  - values from the registration form
 * @param {string} orgUnit     - UID of the selected health facility
 * @returns {object}           - payload ready to POST to DHIS2
 */
export function buildRegistrationPayload(formValues, orgUnit, config = DEFAULT_APP_SETTINGS) {
  const {
    fullName,
    age,
    village,
    phoneNumber,
    parity,
    previousComplications,
  } = formValues

  return {
    trackedEntityType: config.trackedEntityType.id,
    orgUnit,
    attributes: [
      { attribute: config.attributes.fullName,              value: fullName },
      { attribute: config.attributes.age,                   value: String(age) },
      { attribute: config.attributes.village,               value: village },
      { attribute: config.attributes.phoneNumber,           value: phoneNumber },
      { attribute: config.attributes.parity,                value: String(parity) },
      { attribute: config.attributes.previousComplications, value: previousComplications },
    ],
  }
}

/**
 * buildEnrollmentPayload
 * ──────────────────────
 * After creating a TEI, enroll her in the ANC program.
 *
 * DHIS2 API endpoint:
 *   POST /api/enrollments
 *
 * @param {string} trackedEntityInstance  - UID returned from TEI creation
 * @param {string} orgUnit                - UID of the health facility
 * @param {string} enrollmentDate         - ISO date string (today)
 * @param {number} gestationalAge         - weeks at enrollment
 * @returns {object}                      - enrollment payload
 */
export function buildEnrollmentPayload(
  trackedEntityInstance,
  orgUnit,
  enrollmentDate,
  gestationalAge,
  config = DEFAULT_APP_SETTINGS
) {
  return {
    program: config.program.id,
    trackedEntityInstance,
    orgUnit,
    enrollmentDate,
    incidentDate: enrollmentDate,
    // Store gestational age as a note — or as a program attribute if configured
    notes: [
      {
        value: `Gestational age at enrollment: ${gestationalAge} weeks`,
        storedDate: enrollmentDate,
      },
    ],
  }
}

/**
 * Org unit search query for useDataQuery
 * Fetches facilities the current user has access to.
 *
 * Usage:
 *   const { data } = useDataQuery(ORG_UNITS_QUERY)
 */
export const ORG_UNITS_QUERY = {
  orgUnits: {
    resource: 'organisationUnits',
    params: {
      fields: 'id,displayName',
      userOnly: true,
      paging: false,
    },
  },
}