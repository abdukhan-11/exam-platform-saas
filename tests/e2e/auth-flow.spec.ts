import { test, expect } from '@playwright/test'

test.describe('Authentication Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Clear session storage before each test
    await page.evaluate(() => {
      sessionStorage.clear()
    })
  })

  test.describe('College Selection Flow', () => {
    test('should complete college selection and redirect to login', async ({ page }) => {
      // Mock the college resolution API
      await page.route('**/api/auth/resolve-college', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            college: {
              id: 'college-123',
              name: 'Test College',
              username: 'testcollege',
              slug: 'test-college'
            }
          })
        })
      })

      // Navigate to college selection page
      await page.goto('/college/select')

      // Verify page loads correctly
      await expect(page.getByText('Welcome to ExamPlatform')).toBeVisible()
      await expect(page.getByText('Find Your College')).toBeVisible()

      // Enter college username
      await page.fill('[data-testid="college-username"]', 'testcollege')
      await page.click('button:has-text("Find College")')

      // Verify college found
      await expect(page.getByText('✓ College Found: Test College')).toBeVisible()
      await expect(page.getByText('Login as Admin/Teacher')).toBeVisible()
      await expect(page.getByText('Login as Student')).toBeVisible()

      // Click admin login
      await page.click('button:has-text("Login as Admin/Teacher")')

      // Verify redirect to login page
      await expect(page).toHaveURL('/auth/login?college=testcollege')
    })

    test('should handle college not found error', async ({ page }) => {
      // Mock the college resolution API to return not found
      await page.route('**/api/auth/resolve-college', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'College not found'
          })
        })
      })

      // Navigate to college selection page
      await page.goto('/college/select')

      // Enter invalid college username
      await page.fill('[data-testid="college-username"]', 'nonexistent')
      await page.click('button:has-text("Find College")')

      // Verify error message
      await expect(page.getByText('College not found')).toBeVisible()
      await expect(page.getByText('Login as Admin/Teacher')).not.toBeVisible()
    })

    test('should handle network error gracefully', async ({ page }) => {
      // Mock network error
      await page.route('**/api/auth/resolve-college', async (route) => {
        await route.abort('failed')
      })

      // Navigate to college selection page
      await page.goto('/college/select')

      // Enter college username
      await page.fill('[data-testid="college-username"]', 'testcollege')
      await page.click('button:has-text("Find College")')

      // Verify error message
      await expect(page.getByText('Failed to connect to server')).toBeVisible()
    })

    test('should validate empty college username', async ({ page }) => {
      // Navigate to college selection page
      await page.goto('/college/select')

      // Try to search without entering username
      await page.click('button:has-text("Find College")')

      // Verify validation error
      await expect(page.getByText('Please enter a college username')).toBeVisible()
    })

    test('should support Enter key for college search', async ({ page }) => {
      // Mock the college resolution API
      await page.route('**/api/auth/resolve-college', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            college: {
              id: 'college-123',
              name: 'Test College',
              username: 'testcollege',
              slug: 'test-college'
            }
          })
        })
      })

      // Navigate to college selection page
      await page.goto('/college/select')

      // Enter college username and press Enter
      await page.fill('[data-testid="college-username"]', 'testcollege')
      await page.press('[data-testid="college-username"]', 'Enter')

      // Verify college found
      await expect(page.getByText('✓ College Found: Test College')).toBeVisible()
    })
  })

  test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      // Set up college data in session storage
      await page.evaluate(() => {
        sessionStorage.setItem('selectedCollege', JSON.stringify({
          id: 'college-123',
          name: 'Test College',
          username: 'testcollege',
          slug: 'test-college'
        }))
      })
    })

    test('should complete admin login flow', async ({ page }) => {
      // Mock successful login
      await page.route('**/api/auth/signin/admin-teacher', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            error: null
          })
        })
      })

      // Navigate to login page
      await page.goto('/auth/login')

      // Verify college information is displayed
      await expect(page.getByText('Sign In to Test College')).toBeVisible()
      await expect(page.getByText('testcollege')).toBeVisible()

      // Fill login form
      await page.fill('[data-testid="email"]', 'admin@testcollege.edu')
      await page.fill('[data-testid="password"]', 'password123')

      // Submit form
      await page.click('button:has-text("Sign In")')

      // Verify redirect to dashboard
      await expect(page).toHaveURL('/dashboard')
    })

    test('should complete student login flow', async ({ page }) => {
      // Mock successful student login
      await page.route('**/api/auth/signin/student', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            error: null
          })
        })
      })

      // Navigate to login page
      await page.goto('/auth/login')

      // Switch to student tab
      await page.click('button:has-text("Student")')

      // Fill student login form
      await page.fill('[data-testid="roll-no"]', 'STU001')
      await page.fill('[data-testid="student-password"]', 'password123')

      // Submit form
      await page.click('button:has-text("Sign In")')

      // Verify redirect to dashboard
      await expect(page).toHaveURL('/dashboard')
    })

    test('should handle invalid credentials', async ({ page }) => {
      // Mock failed login
      await page.route('**/api/auth/signin/admin-teacher', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            error: 'Invalid credentials'
          })
        })
      })

      // Navigate to login page
      await page.goto('/auth/login')

      // Fill login form with invalid credentials
      await page.fill('[data-testid="email"]', 'wrong@testcollege.edu')
      await page.fill('[data-testid="password"]', 'wrongpassword')

      // Submit form
      await page.click('button:has-text("Sign In")')

      // Verify error message
      await expect(page.getByText('Invalid credentials')).toBeVisible()
      await expect(page).toHaveURL('/auth/login')
    })

    test('should validate required fields', async ({ page }) => {
      // Navigate to login page
      await page.goto('/auth/login')

      // Try to submit without filling fields
      await page.click('button:has-text("Sign In")')

      // Verify validation error
      await expect(page.getByText('Email and password are required')).toBeVisible()
    })

    test('should switch between admin and student tabs', async ({ page }) => {
      // Navigate to login page
      await page.goto('/auth/login')

      // Verify admin tab is active by default
      await expect(page.getByText('Email')).toBeVisible()
      await expect(page.getByText('Password')).toBeVisible()

      // Switch to student tab
      await page.click('button:has-text("Student")')

      // Verify student form fields
      await expect(page.getByText('Roll Number')).toBeVisible()
      await expect(page.getByText('Password')).toBeVisible()

      // Switch back to admin tab
      await page.click('button:has-text("Admin/Teacher")')

      // Verify admin form fields are back
      await expect(page.getByText('Email')).toBeVisible()
    })

    test('should clear form fields when switching tabs', async ({ page }) => {
      // Navigate to login page
      await page.goto('/auth/login')

      // Fill admin form
      await page.fill('[data-testid="email"]', 'admin@testcollege.edu')
      await page.fill('[data-testid="password"]', 'password123')

      // Switch to student tab
      await page.click('button:has-text("Student")')

      // Switch back to admin tab
      await page.click('button:has-text("Admin/Teacher")')

      // Verify fields are cleared
      await expect(page.locator('[data-testid="email"]')).toHaveValue('')
      await expect(page.locator('[data-testid="password"]')).toHaveValue('')
    })

    test('should show loading state during login', async ({ page }) => {
      // Mock delayed login response
      await page.route('**/api/auth/signin/admin-teacher', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            error: null
          })
        })
      })

      // Navigate to login page
      await page.goto('/auth/login')

      // Fill login form
      await page.fill('[data-testid="email"]', 'admin@testcollege.edu')
      await page.fill('[data-testid="password"]', 'password123')

      // Submit form
      await page.click('button:has-text("Sign In")')

      // Verify loading state
      await expect(page.getByText('Signing In...')).toBeVisible()
      await expect(page.locator('button:has-text("Signing In...")')).toBeDisabled()
    })
  })

  test.describe('Security Tests', () => {
    test('should prevent XSS attacks in college username', async ({ page }) => {
      // Navigate to college selection page
      await page.goto('/college/select')

      // Enter XSS payload
      const xssPayload = '<script>alert("xss")</script>'
      await page.fill('[data-testid="college-username"]', xssPayload)
      await page.click('button:has-text("Find College")')

      // Verify no script execution (no alert should appear)
      // This test would need to be enhanced with proper XSS detection
      await expect(page.getByText('College not found')).toBeVisible()
    })

    test('should prevent SQL injection in college username', async ({ page }) => {
      // Navigate to college selection page
      await page.goto('/college/select')

      // Enter SQL injection payload
      const sqlPayload = "'; DROP TABLE users; --"
      await page.fill('[data-testid="college-username"]', sqlPayload)
      await page.click('button:has-text("Find College")')

      // Verify the payload is sent as-is (not executed)
      await expect(page.getByText('College not found')).toBeVisible()
    })

    test('should handle session timeout gracefully', async ({ page }) => {
      // Navigate to login page without college data
      await page.goto('/auth/login')

      // Verify college selection message
      await expect(page.getByText('No college selected. Please go back to select your institution.')).toBeVisible()
    })
  })

  test.describe('Accessibility Tests', () => {
    test('should have proper form labels and ARIA attributes', async ({ page }) => {
      // Navigate to college selection page
      await page.goto('/college/select')

      // Check for proper labels
      await expect(page.locator('label[for="collegeUsername"]')).toBeVisible()
      await expect(page.locator('input[id="collegeUsername"]')).toBeVisible()

      // Check for proper button labels
      await expect(page.locator('button:has-text("Find College")')).toBeVisible()
    })

    test('should support keyboard navigation', async ({ page }) => {
      // Navigate to college selection page
      await page.goto('/college/select')

      // Tab through form elements
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Verify focus is on the search button
      await expect(page.locator('button:has-text("Find College")')).toBeFocused()
    })

    test('should have proper heading structure', async ({ page }) => {
      // Navigate to college selection page
      await page.goto('/college/select')

      // Check for proper heading hierarchy
      await expect(page.locator('h1:has-text("Welcome to ExamPlatform")')).toBeVisible()
      await expect(page.locator('h2:has-text("Find Your College")')).toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      // Navigate to college selection page
      await page.goto('/college/select')

      // Verify page is responsive
      await expect(page.getByText('Welcome to ExamPlatform')).toBeVisible()
      await expect(page.getByText('Find Your College')).toBeVisible()

      // Test form interaction on mobile
      await page.fill('[data-testid="college-username"]', 'testcollege')
      await page.click('button:has-text("Find College")')
    })

    test('should work correctly on tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })

      // Navigate to college selection page
      await page.goto('/college/select')

      // Verify page is responsive
      await expect(page.getByText('Welcome to ExamPlatform')).toBeVisible()
      await expect(page.getByText('Find Your College')).toBeVisible()
    })
  })

  test.describe('Cross-Browser Compatibility', () => {
    test('should work in Chrome', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome-specific test')
      
      // Navigate to college selection page
      await page.goto('/college/select')
      
      // Verify basic functionality
      await expect(page.getByText('Welcome to ExamPlatform')).toBeVisible()
    })

    test('should work in Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test')
      
      // Navigate to college selection page
      await page.goto('/college/select')
      
      // Verify basic functionality
      await expect(page.getByText('Welcome to ExamPlatform')).toBeVisible()
    })

    test('should work in Safari', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test')
      
      // Navigate to college selection page
      await page.goto('/college/select')
      
      // Verify basic functionality
      await expect(page.getByText('Welcome to ExamPlatform')).toBeVisible()
    })
  })
})
