// src/components/common/LoadingSpinner.jsx
import React from 'react'
import styles from './LoadingSpinner.module.css'

/**
 * Loading Spinner Component
 * Displays a spinner with optional message
 * @param {string} message - Message to display with spinner
 * @param {number} size - Spinner size: 24 (small), 32 (medium), 40 (large). Default: 28 (uses 32)
 * @param {boolean} fullPage - If true, takes up full page with centered content
 */
export default function LoadingSpinner({ message = 'Loading…', size = 28, fullPage = false }) {
	const sizeClass =
		size <= 24 ? styles.spinnerSmall :
		size <= 32 ? styles.spinnerMedium :
		styles.spinnerLarge

	if (fullPage) {
		return (
			<div className={styles.containerFullPage}>
				<div className={`${styles.spinner} ${sizeClass}`} aria-busy="true" />
				<p className={styles.message}>{message}</p>
			</div>
		)
	}

	return (
		<div className={styles.container}>
			<div className={`${styles.spinner} ${sizeClass}`} aria-busy="true" />
			<p className={styles.message}>{message}</p>
		</div>
	)
}
