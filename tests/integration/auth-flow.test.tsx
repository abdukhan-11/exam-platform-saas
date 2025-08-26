import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/auth/login/page'
import CollegeSelectionPage from '@/app/college/select/page'
import { render, mockRouter, mockFetch, mockSessionStorage } from '../utils/test-utils'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: jest.fn(),
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

describe('Authentication Flow Integration Tests', () => {
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue(mockRouter)
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })
    
    // Mock sessionStorage
    const mockStorage = mockSessionStorage()
    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true,
    })
  })

  describe('Complete Authentication Flow', () => {
    it('should complete full authentication flow from college selection to login', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }

      // Mock college resolution
      mockFetch({ success: true, college: mockCollege })
      
      // Mock successful login
      mockSignIn.mockResolvedValue({ ok: true, error: null })

      // Start with college selection
      render(<CollegeSelectionPage />)
      
      // Search for college
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
      
      // Verify college data is stored and navigation occurs
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'selectedCollege',
        JSON.stringify(mockCollege)
      )
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?college=testcollege')
      
      // Now test the login page with college data
      render(<LoginPage />)
      
      // Verify college information is displayed
      expect(screen.getByText('Sign In to Test College')).toBeInTheDocument()
      expect(screen.getByText('testcollege')).toBeInTheDocument()
      
      // Fill login form
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'admin@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      // Submit login
      const loginButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(loginButton)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('admin-teacher', {
          email: 'admin@testcollege.edu',
          password: 'password123',
          collegeUsername: 'testcollege',
          redirect: false,
        })
      })
      
      // Verify redirect to dashboard
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })

    it('should handle student authentication flow', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }

      // Mock college resolution
      mockFetch({ success: true, college: mockCollege })
      
      // Mock successful student login
      mockSignIn.mockResolvedValue({ ok: true, error: null })

      // Start with college selection
      render(<CollegeSelectionPage />)
      
      // Search for college
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
      })
      
      // Choose student login
      const studentButton = screen.getByText('Login as Student')
      fireEvent.click(studentButton)
      
      // Verify navigation to student login
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login-student?college=testcollege')
      
      // Test student login page (simulated)
      render(<LoginPage />)
      
      // Switch to student tab
      const studentTab = screen.getByText('Student')
      fireEvent.click(studentTab)
      
      // Fill student login form
      const rollNoInput = screen.getByLabelText('Roll Number')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(rollNoInput, { target: { value: 'STU001' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      // Submit login
      const loginButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(loginButton)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('student', {
          rollNo: 'STU001',
          password: 'password123',
          collegeUsername: 'testcollege',
          redirect: false,
        })
      })
    })
  })

  describe('Error Handling in Flow', () => {
    it('should handle college not found error', async () => {
      // Mock college not found
      mockFetch({ success: false, error: 'College not found' }, 404)
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'nonexistent' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('College not found')).toBeInTheDocument()
      })
      
      // Verify no login options are shown
      expect(screen.queryByText('Login as Admin/Teacher')).not.toBeInTheDocument()
      expect(screen.queryByText('Login as Student')).not.toBeInTheDocument()
    })

    it('should handle login failure after successful college selection', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }

      // Mock college resolution
      mockFetch({ success: true, college: mockCollege })
      
      // Mock failed login
      mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' })

      // Start with college selection
      render(<CollegeSelectionPage />)
      
      // Search for college
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
      
      // Now test the login page with college data
      render(<LoginPage />)
      
      // Fill login form with invalid credentials
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'wrong@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      
      // Submit login
      const loginButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(loginButton)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
      
      // Verify no redirect occurred
      expect(mockRouter.push).not.toHaveBeenCalledWith('/dashboard')
    })

    it('should handle network error during college search', async () => {
      // Mock network error
      mockFetch({ success: false, error: 'Network error' }, 500)
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to connect to server')).toBeInTheDocument()
      })
    })
  })

  describe('Session Management', () => {
    it('should maintain college context across page navigation', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }

      // Mock college resolution
      mockFetch({ success: true, college: mockCollege })
      
      // Start with college selection
      render(<CollegeSelectionPage />)
      
      // Search for college
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
      
      // Verify college data is stored
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'selectedCollege',
        JSON.stringify(mockCollege)
      )
      
      // Simulate page refresh by re-rendering login page
      render(<LoginPage />)
      
      // Verify college information is still displayed
      expect(screen.getByText('Sign In to Test College')).toBeInTheDocument()
      expect(screen.getByText('testcollege')).toBeInTheDocument()
    })

    it('should handle missing college context gracefully', () => {
      // Don't set any college data in sessionStorage
      render(<LoginPage />)
      
      // Should show college selection message
      expect(screen.getByText('No college selected. Please go back to select your institution.')).toBeInTheDocument()
      expect(screen.getByText('Back to College Selection')).toBeInTheDocument()
    })
  })

  describe('Form State Management', () => {
    it('should clear form fields when switching between tabs', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }

      // Mock college resolution
      mockFetch({ success: true, college: mockCollege })
      
      // Start with college selection
      render(<CollegeSelectionPage />)
      
      // Search for college
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
      
      // Fill admin form
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'admin@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      // Switch to student tab
      const studentTab = screen.getByText('Student')
      fireEvent.click(studentTab)
      
      // Switch back to admin tab
      const adminTab = screen.getByText('Admin/Teacher')
      fireEvent.click(adminTab)
      
      // Verify fields are cleared
      expect(screen.getByLabelText('Email')).toHaveValue('')
      expect(screen.getByLabelText('Password')).toHaveValue('')
    })
  })

  describe('Loading States', () => {
    it('should show loading state during college search', async () => {
      // Mock delayed response
      mockFetch({ success: true, college: { id: 'college-123', name: 'Test College' } })
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      // Should show loading state
      expect(screen.getByText('Searching...')).toBeInTheDocument()
      expect(searchButton).toBeDisabled()
    })

    it('should show loading state during login', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }

      // Mock college resolution
      mockFetch({ success: true, college: mockCollege })
      
      // Mock delayed login response
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, error: null }), 100)))
      
      // Start with college selection
      render(<CollegeSelectionPage />)
      
      // Search for college
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
      
      // Fill login form
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'admin@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      // Submit login
      const loginButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(loginButton)
      
      // Should show loading state
      expect(screen.getByText('Signing In...')).toBeInTheDocument()
      expect(loginButton).toBeDisabled()
    })
  })
})
