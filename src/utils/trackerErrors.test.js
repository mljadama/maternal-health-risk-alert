import { formatTrackerError } from './trackerErrors'

describe('formatTrackerError', () => {
  it('explains invalid phone values instead of blaming configuration', () => {
    const message = formatTrackerError({
      details: {
        validationReport: {
          errorReports: [
            { errorCode: 'E1303', message: 'Value does not match value type PHONE_NUMBER' },
          ],
        },
      },
    })
    expect(message).toMatch(/not valid/i)
    expect(message).not.toMatch(/sharing/i)
    expect(message).not.toMatch(/Configuration/i)
  })

  it('keeps sharing errors distinct from field validation', () => {
    const message = formatTrackerError({
      details: {
        validationReport: {
          errorReports: [{ errorCode: 'E1000', message: 'Program is not shared with the user' }],
        },
      },
    })
    expect(message).toMatch(/permission/i)
  })

  it('does not map a generic HTTP 400 to a sharing or config error', () => {
    const message = formatTrackerError({ message: 'Request failed with status code 400' }, 'Could not save the patient.')
    expect(message).toBe('Could not save the patient.')
  })
})
