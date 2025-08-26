import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/auth/login/page'
import CollegeSelectionPage from '@/app/college/select/page'
import { render, mockRouter, mockFetch, mockSessionStorage, createMaliciousInput } from '../../utils/test-utils'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage(),
  writable: true,
})

describe('Authentication Security Tests', () => {
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue(mockRouter)
    
    // Mock sessionStorage
    const mockStorage = mockSessionStorage()
    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true,
    })
  })

  describe('Input Validation and Sanitization', () => {
    const maliciousInputs = createMaliciousInput()

    it('should prevent XSS attacks in college username field', async () => {
      mockFetch({ success: false, error: 'College not found' }, 404)
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: maliciousInputs.xss } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('College not found')).toBeInTheDocument()
      })
      
      // Verify no script execution
      expect(document.querySelector('script')).toBeNull()
    })

    it('should prevent SQL injection in college username field', async () => {
      mockFetch({ success: false, error: 'College not found' }, 404)
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: maliciousInputs.sqlInjection } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/resolve-college', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ collegeUsername: maliciousInputs.sqlInjection }),
        })
      })
    })

    it('should prevent XSS attacks in email field', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }

      mockFetch({ success: true, college: mockCollege })
      
      // Start with college selection
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
      })
      
      // Choose admin login
      const adminButton = screen.getByText('Login as Admin/Teacher')
      fireEvent.click(adminButton)
      
      // Now test the login page
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: maliciousInputs.xss } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      const loginButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(loginButton)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('admin-teacher', {
          email: maliciousInputs.xss,
          password: 'password123',
          collegeUsername: 'testcollege',
          redirect: false,
        })
      })
      
      // Verify no script execution
      expect(document.querySelector('script')).toBeNull()
    })

    it('should prevent command injection in roll number field', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }

      mockFetch({ success: true, college: mockCollege })
      
      // Start with college selection
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
      })
      
      // Choose admin login
      const adminButton = screen.getByText('Login as Admin/Teacher')
      fireEvent.click(adminButton)
      
      // Now test the login page
      render(<LoginPage />)
      
      // Switch to student tab
      const studentTab = screen.getByText('Student')
      fireEvent.click(studentTab)
      
      const rollNoInput = screen.getByLabelText('Roll Number')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(rollNoInput, { target: { value: maliciousInputs.commandInjection } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      const loginButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(loginButton)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('student', {
          rollNo: maliciousInputs.commandInjection,
          password: 'password123',
          collegeUsername: 'testcollege',
          redirect: false,
        })
      })
    })
  })

  describe('Rate Limiting and Brute Force Protection', () => {
    it('should handle multiple rapid login attempts', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }

      mockFetch({ success: true, college: mockCollege })
      mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' })
      
      // Start with college selection
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
      })
      
      // Choose admin login
      const adminButton = screen.getByText('Login as Admin/Teacher')
      fireEvent.click(adminButton)
      
      // Now test the login page
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'admin@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      
      const loginButton = screen.getByRole('button', { name: 'Sign In' })
      
      // Attempt multiple rapid logins
      for (let i = 0; i < 5; i++) {
        fireEvent.click(loginButton)
        await waitFor(() => {
          expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
        })
      }
      
      // Verify all attempts were made
      expect(mockSignIn).toHaveBeenCalledTimes(5)
    })

    it('should handle multiple rapid college searches', async () => {
      mockFetch({ success: false, error: 'College not found' }, 404)
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      // Attempt multiple rapid searches
      for (let i = 0; i < 5; i++) {
        fireEvent.change(input, { target: { value: `college${i}` } })
        fireEvent.click(searchButton)
        await waitFor(() => {
          expect(screen.getByText('College not found')).toBeInTheDocument()
        })
      }
      
      // Verify all searches were made
      expect(global.fetch).toHaveBeenCalledTimes(5)
    })
  })

  describe('Session Security', () => {
    it('should not expose sensitive data in sessionStorage', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college',
        // Sensitive data that should not be stored
        adminPassword: 'secret123',
        apiKey: 'sk-1234567890'
      }

      mockFetch({ success: true, college: mockCollege })
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
      })
      
      // Choose admin login
      const adminButton = screen.getByText('Login as Admin/Teacher')
      fireEvent.click(adminButton)
      
      // Verify only safe data is stored
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'selectedCollege',
        JSON.stringify(mockCollege)
      )
      
      // Check that sensitive data is not in the stored string
      const storedData = JSON.stringify(mockCollege)
      expect(storedData).not.toContain('adminPassword')
      expect(storedData).not.toContain('apiKey')
    })

    it('should clear session data on logout', () => {
      // Simulate having college data in sessionStorage
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(mockCollege))
      
      render(<LoginPage />)
      
      // Verify college data is present
      expect(screen.getByText('Sign In to Test College')).toBeInTheDocument()
      
      // Simulate logout by clearing sessionStorage
      window.sessionStorage.removeItem('selectedCollege')
      
      // Re-render to simulate page refresh after logout
      render(<LoginPage />)
      
      // Should show college selection message
      expect(screen.getByText('No college selected. Please go back to select your institution.')).toBeInTheDocument()
    })
  })

  describe('CSRF Protection', () => {
    it('should include proper headers in API requests', async () => {
      mockFetch({ success: false, error: 'College not found' }, 404)
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/resolve-college', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ collegeUsername: 'testcollege' }),
        })
      })
    })
  })

  describe('Input Length Validation', () => {
    it('should handle extremely long college usernames', async () => {
      const longUsername = 'a'.repeat(1000)
      
      mockFetch({ success: false, error: 'College not found' }, 404)
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: longUsername } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/resolve-college', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ collegeUsername: longUsername }),
        })
      })
    })

    it('should handle extremely long email addresses', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }

      mockFetch({ success: true, college: mockCollege })
      mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' })
      
      // Start with college selection
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
      })
      
      // Choose admin login
      const adminButton = screen.getByText('Login as Admin/Teacher')
      fireEvent.click(adminButton)
      
      // Now test the login page
      render(<LoginPage />)
      
      const longEmail = 'a'.repeat(100) + '@example.com'
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: longEmail } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      const loginButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(loginButton)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('admin-teacher', {
          email: longEmail,
          password: 'password123',
          collegeUsername: 'testcollege',
          redirect: false,
        })
      })
    })
  })

  describe('Authentication Bypass Attempts', () => {
    it('should not allow direct access to login without college selection', () => {
      // Don't set any college data in sessionStorage
      render(<LoginPage />)
      
      // Should show college selection message
      expect(screen.getByText('No college selected. Please go back to select your institution.')).toBeInTheDocument()
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
    })

    it('should validate college context before allowing login', async () => {
      // Set invalid college data
      window.sessionStorage.setItem('selectedCollege', 'invalid-json')
      
      render(<LoginPage />)
      
      // Should show college selection message
      expect(screen.getByText('No college selected. Please go back to select your institution.')).toBeInTheDocument()
    })
  })

  describe('Error Information Disclosure', () => {
    it('should not reveal sensitive information in error messages', async () => {
      mockFetch({ success: false, error: 'Database connection failed' }, 500)
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        // Should show generic error message, not database details
        expect(screen.getByText('Failed to connect to server')).toBeInTheDocument()
        expect(screen.queryByText('Database connection failed')).not.toBeInTheDocument()
      })
    })

    it('should not reveal user existence in login errors', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }

      mockFetch({ success: true, college: mockCollege })
      mockSignIn.mockResolvedValue({ ok: false, error: 'User not found' })
      
      // Start with college selection
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
      })
      
      // Choose admin login
      const adminButton = screen.getByText('Login as Admin/Teacher')
      fireEvent.click(adminButton)
      
      // Now test the login page
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'nonexistent@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      const loginButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(loginButton)
      
      await waitFor(() => {
        // Should show generic error message, not user existence info
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
        expect(screen.queryByText('User not found')).not.toBeInTheDocument()
      })
    })
  })
})
