function collectErrorReports(report) {
  const reports = []

  const pushAll = (list = []) => {
    list.forEach(item => {
      if (item) reports.push(item)
    })
  }

  if (!report || typeof report !== 'object') {
    return reports
  }

  pushAll(report.validationReport?.errorReports)
  if (report.bundleReport?.typeReportMap) {
    Object.values(report.bundleReport.typeReportMap).forEach(typeReport => {
      typeReport?.objectReports?.forEach(objectReport => {
        pushAll(objectReport?.errorReports)
      })
    })
  }

  return reports
}

function extractReport(error) {
  if (!error) return null
  return error.details || error.response || error.report || error
}

export function formatTrackerError(error, fallback = 'Save failed on the DHIS2 server.') {
  const report = extractReport(error)
  const reports = collectErrorReports(report)
  const messages = reports.map(item => item.message).filter(Boolean)
  const codes = reports.map(item => item.errorCode).filter(Boolean)
  const combined = `${messages.join(' ')} ${codes.join(' ')}`.toLowerCase()

  if (/phone|phonenumber|value type|e1303|e1308/.test(combined)) {
    return `The entered values are not valid. ${messages.join(' | ') || 'Check the phone number and other fields, then try again.'}`
  }

  if (/shar|access|authority|e1000|e1100|e7132/.test(combined)) {
    return `You do not have permission to save this record. ${messages.join(' | ') || 'Check program sharing and organisation unit assignment.'}`
  }

  if (messages.length) {
    return messages.join(' | ')
  }

  const raw = String(error?.message || report?.message || '')
  if (raw && !/\b400\b/.test(raw)) {
    return raw
  }

  return fallback
}
