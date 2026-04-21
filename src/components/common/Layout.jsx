// src/components/common/Layout.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from './Layout.module.css'

const DHIS2_HEADER_HEIGHT = 48
const SIDEBAR_WIDTH = 260
const MOBILE_BREAKPOINT = 768

const NAV_ITEMS = [
    { label: 'Dashboard',        icon: '📊', path: '/dashboard' },
    { label: 'Patients',         icon: '👥', path: '/patients'  },
    { label: 'Register Patient', icon: '➕', path: '/register'  },
    { label: 'Risk Alerts',      icon: '⚠️', path: '/alerts', badge: true },
]

/**
 * Sidebar Content Component
 * Navigation menu for the application
 */
function SidebarContent({ onNavigate }) {
    const navigate = useNavigate()
    const location = useLocation()

    function go(path) {
        navigate(path)
        if (onNavigate) onNavigate()
    }

    return (
        <div className={styles.sidebar}>
            {/* Logo */}
            <div className={styles.sidebarLogo}>
                <div className={styles.logoIcon}>♀</div>
                <div className={styles.logoText}>
                    <h3>Maternal Health</h3>
                    <p>Risk Alert</p>
                </div>
            </div>

            <hr className={styles.divider} />

            {/* Navigation items */}
            <ul className={styles.navList}>
                {NAV_ITEMS.map(item => {
                    const active =
                        location.pathname === item.path ||
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                    return (
                        <li key={item.path} className={styles.navItem}>
                            <button
                                onClick={() => go(item.path)}
                                className={`${styles.navLink} ${active ? styles.active : ''}`}
                                aria-current={active ? 'page' : undefined}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                <span className={styles.navLabel}>{item.label}</span>
                                {item.badge && <span className={styles.badge} />}
                            </button>
                        </li>
                    )
                })}
            </ul>

            {/* Footer */}
            <div className={styles.sidebarFooter}>
                <p className={styles.footerText}>DHIS2 v2.38+</p>
                <p className={styles.footerVersion}>Maternal Health v1.0.0</p>
            </div>
        </div>
    )
}

/**
 * Layout Component
 * Main app layout with sidebar navigation and responsive mobile menu
 */
export default function Layout({ children }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <div className={styles.root}>
            {/* Desktop Sidebar */}
            {!isMobile && (
                <div className={styles.sidebarContainer}>
                    <div className={styles.sidebarFixed}>
                        <SidebarContent />
                    </div>
                </div>
            )}

            {/* Mobile Menu */}
            {isMobile && mobileMenuOpen && (
                <div
                    className={styles.mobileBackdrop}
                    onClick={() => setMobileMenuOpen(false)}
                    role="presentation"
                />
            )}

            {isMobile && (
                <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.open : ''}`}>
                    <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
                </div>
            )}

            {/* Mobile App Bar */}
            {isMobile && (
                <div
                    className={styles.mobileAppBar}
                    style={{ top: `${DHIS2_HEADER_HEIGHT}px` }}
                >
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            padding: '8px',
                        }}
                        aria-label="Toggle menu"
                    >
                        ☰
                    </button>
                    <div style={{ fontSize: '18px', marginRight: '8px' }}>♀</div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                        Maternal Health
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main
                className={`${styles.content} ${isMobile ? styles.contentMobile : ''}`}
                style={{
                    marginTop: isMobile ? `${DHIS2_HEADER_HEIGHT + 56}px` : `${DHIS2_HEADER_HEIGHT}px`,
                }}
            >
                {children}
            </main>
        </div>
    )
}