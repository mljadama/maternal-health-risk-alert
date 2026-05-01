// d2.config.js
// ─────────────────────────────────────────────────────────────
// DHIS2 App Platform configuration
// Compatible with @dhis2/cli-app-scripts v12.x
//
// Proxy is configured via --proxy flag in package.json:
//   d2-app-scripts start --proxy https://play.dhis2.org/demo
// ─────────────────────────────────────────────────────────────
// d2.config.js
const config = {
    type: 'app',
    name: 'Maternal Health Risk Alert',
    title: 'Maternal Health Risk Alert',
    version: '1.0.2',
    description: 'Automated antenatal care risk assessment and patient tracking using evidence-based clinical algorithms',
    longDescription: 'Maternal Health Risk Alert is a DHIS2 app for antenatal care (ANC) clinics that uses evidence-based clinical algorithms to identify pregnant women at high risk during routine ANC visits. The app integrates with DHIS2\'s Tracker API to assess risk factors and provides color-coded risk categorization. Risk assessments are automatically recorded in DHIS2 and displayed in dashboards for care coordination.',
    minDHIS2Version: '2.38',
    author: {
        name: 'Maternal Health Development Team',
        email: 'support@example.com',
    },
    support: {
        url: 'https://github.com/your-org/maternal-health-risk-alert/issues',
    },
    documentation: {
        user: 'https://github.com/your-org/maternal-health-risk-alert#usage',
        developer: 'https://github.com/your-org/maternal-health-risk-alert#development',
    },
    keywords: ['maternal-health', 'antenatal-care', 'pregnancy', 'risk-assessment', 'tracker', 'clinical-decision-support'],
    tags: ['maternal-health', 'antenatal-care', 'clinical-decision-support'],
    category: 'Health',
    targetAudience: ['Healthcare workers', 'ANC clinics', 'Maternal health programs'],
    entryPoints: {
        app: './src/App.jsx',
    },
}

module.exports = config