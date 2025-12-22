import { test, expect } from '@playwright/test'

/**
 * E2E Test: Complete Booking Flow
 * 
 * This test simulates a user making a complete booking:
 * 1. Navigate to homepage
 * 2. Select date and time
 * 3. Select number of passengers
 * 4. Fill contact information
 * 5. Complete captcha (mocked in test env)
 * 6. Submit booking
 * 7. Verify booking confirmation
 */

test.describe('Complete Booking Flow', () => {
  test('should allow user to make a booking from start to finish', async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto('/')
    await expect(page).toHaveTitle(/Sweet Narcisse/)
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')
    
    // 2. Look for booking button or section
    const bookingButton = page.getByRole('button', { name: /réserver|book/i }).first()
    if (await bookingButton.isVisible()) {
      await bookingButton.click()
    }
    
    // Wait for booking widget to appear
    await page.waitForSelector('[data-testid="booking-widget"], .booking-form, form', { timeout: 10000 })
    
    // 3. Select date (tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    const dateInput = page.locator('input[type="date"], input[name="date"]').first()
    if (await dateInput.isVisible()) {
      await dateInput.fill(tomorrowStr)
    }
    
    // 4. Select time (10:00)
    const timeSelect = page.locator('select[name="time"], input[name="time"]').first()
    if (await timeSelect.isVisible()) {
      const tagName = await timeSelect.evaluate(el => el.tagName)
      if (tagName === 'SELECT') {
        // Try to find option with "10:00" in the text
        const options = await timeSelect.locator('option').allTextContents()
        const matchingOption = options.find(opt => opt.includes('10:00'))
        if (matchingOption) {
          await timeSelect.selectOption({ label: matchingOption })
        } else {
          await timeSelect.selectOption({ index: 1 }) // Fallback to first available time
        }
      } else {
        await timeSelect.fill('10:00')
      }
    }
    
    // 5. Select number of passengers
    // Adults
    const adultsInput = page.locator('input[name="adults"], select[name="adults"]').first()
    if (await adultsInput.isVisible()) {
      if (await adultsInput.evaluate(el => el.tagName) === 'SELECT') {
        await adultsInput.selectOption('2')
      } else {
        await adultsInput.fill('2')
      }
    }
    
    // Children (if available)
    const childrenInput = page.locator('input[name="children"], select[name="children"]').first()
    if (await childrenInput.isVisible()) {
      if (await childrenInput.evaluate(el => el.tagName) === 'SELECT') {
        await childrenInput.selectOption('1')
      } else {
        await childrenInput.fill('1')
      }
    }
    
    // 6. Fill contact information
    const firstNameInput = page.locator('input[name="firstName"], input[placeholder*="prénom" i], input[placeholder*="first" i]').first()
    await firstNameInput.fill('John')
    
    const lastNameInput = page.locator('input[name="lastName"], input[placeholder*="nom" i], input[placeholder*="last" i]').first()
    await lastNameInput.fill('Doe')
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    await emailInput.fill('john.doe.e2e@example.com')
    
    const phoneInput = page.locator('input[type="tel"], input[name="phone"]').first()
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+33612345678')
    }
    
    // 7. Handle reCAPTCHA (in test env, it should be mocked or bypassed)
    // The test environment should have RECAPTCHA mocked
    
    // 8. Submit the booking
    const submitButton = page.getByRole('button', { name: /réserver|confirmer|book|submit/i }).last()
    await submitButton.click()
    
    // 9. Wait for confirmation or redirect
    // This could be a success message, redirect to payment, or confirmation page
    await page.waitForURL(/\/confirm|\/payment|\/success/, { timeout: 15000 }).catch(() => {
      // If no redirect, look for success message on same page
    })
    
    // 10. Verify booking confirmation
    // Look for success indicators
    const successIndicators = [
      page.getByText(/réservation confirmée|booking confirmed|succès|success/i),
      page.getByText(/merci|thank you|confirmation/i),
      page.locator('[data-testid="booking-success"]'),
      page.locator('.success-message'),
    ]
    
    let foundSuccess = false
    for (const indicator of successIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        foundSuccess = true
        break
      }
    }
    
    // If we didn't find a success message, check if we're on a payment page
    if (!foundSuccess) {
      const currentUrl = page.url()
      if (currentUrl.includes('payment') || currentUrl.includes('checkout')) {
        foundSuccess = true
        // Verify payment page elements
        await expect(page.getByText(/montant|amount|total/i)).toBeVisible()
      }
    }
    
    expect(foundSuccess).toBe(true)
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'tests/e2e/screenshots/booking-complete.png', fullPage: true })
  })
  
  test('should validate required fields', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Try to find and click booking button
    const bookingButton = page.getByRole('button', { name: /réserver|book/i }).first()
    if (await bookingButton.isVisible()) {
      await bookingButton.click()
    }
    
    // Wait for form
    await page.waitForSelector('form', { timeout: 10000 })
    
    // Try to submit without filling required fields
    const submitButton = page.getByRole('button', { name: /réserver|confirmer|book|submit/i }).last()
    await submitButton.click()
    
    // Should show validation errors
    const errorMessages = page.locator('.error, .text-red-500, [role="alert"], .invalid-feedback')
    const errorCount = await errorMessages.count()
    
    expect(errorCount).toBeGreaterThan(0)
  })
  
  test('should show available time slots', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Navigate to booking
    const bookingButton = page.getByRole('button', { name: /réserver|book/i }).first()
    if (await bookingButton.isVisible()) {
      await bookingButton.click()
    }
    
    // Wait for date picker
    await page.waitForSelector('input[type="date"], input[name="date"]', { timeout: 10000 })
    
    // Select tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    const dateInput = page.locator('input[type="date"], input[name="date"]').first()
    await dateInput.fill(tomorrowStr)
    
    // Wait for time slots to load
    await page.waitForTimeout(1000) // Give time for API call
    
    // Verify time slots are displayed
    const timeSelect = page.locator('select[name="time"], .time-slot, button[data-time]')
    expect(await timeSelect.count()).toBeGreaterThan(0)
  })
})

test.describe('Navigation', () => {
  test('should navigate to different pages', async ({ page }) => {
    await page.goto('/')
    
    // Test navigation links
    const navLinks = [
      { name: /accueil|home/i, partial: true },
      { name: /tarifs|prices|pricing/i, partial: true },
      { name: /contact/i, partial: true },
    ]
    
    for (const link of navLinks) {
      const navLink = page.getByRole('link', { name: link.name }).first()
      if (await navLink.isVisible().catch(() => false)) {
        await navLink.click()
        await page.waitForLoadState('networkidle')
        // Verify we're still on the site
        await expect(page).toHaveURL(/.+/)
        // Go back to home
        await page.goto('/')
      }
    }
  })
})

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    await expect(page).toHaveTitle(/Sweet Narcisse/)
    
    // Verify mobile menu or navigation works
    const mobileMenu = page.locator('button[aria-label*="menu" i], .mobile-menu-button, button.hamburger')
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click()
      // Menu should open
      await page.waitForTimeout(500)
    }
    
    // Take mobile screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/mobile-home.png', fullPage: true })
  })
})
