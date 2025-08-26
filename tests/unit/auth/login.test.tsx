import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import LoginPage from '@/app/auth/login/page'
import { render, mockRouter, mockNavigation, mockSessionStorage } from '../../utils/test-utils'

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

describe('LoginPage', () => {
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue(mockRouter)
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    
    // Mock sessionStorage
    const mockStorage = mockSessionStorage()
    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true,
    })
  })

  describe('College Selection State', () => {
    it('should show college selection message when no college is selected', () => {
      render(<LoginPage />)
      
      expect(screen.getByText('No college selected. Please go back to select your institution.')).toBeInTheDocument()
      expect(screen.getByText('Back to College Selection')).toBeInTheDocument()
    })

    it('should redirect to home when back button is clicked', () => {
      render(<LoginPage />)
      
      const backButton = screen.getByText('Back to College Selection')
      fireEvent.click(backButton)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
  })

  describe('With College Selected', () => {
    beforeEach(() => {
      // Mock college data in sessionStorage
      const collegeData = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege'
      }
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(collegeData))
    })

    it('should display college information', () => {
      render(<LoginPage />)
      
      expect(screen.getByText('Sign In to Test College')).toBeInTheDocument()
      expect(screen.getByText('testcollege')).toBeInTheDocument()
      expect(screen.getByText('Test College')).toBeInTheDocument()
    })

    it('should show both admin/teacher and student tabs', () => {
      render(<LoginPage />)
      
      expect(screen.getByText('Admin/Teacher')).toBeInTheDocument()
      expect(screen.getByText('Student')).toBeInTheDocument()
    })

    it('should switch between tabs correctly', () => {
      render(<LoginPage />)
      
      const studentTab = screen.getByText('Student')
      fireEvent.click(studentTab)
      
      expect(screen.getByLabelText('Roll Number')).toBeInTheDocument()
      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    })

    it('should clear form fields when switching tabs', () => {
      render(<LoginPage />)
      
      // Fill admin/teacher form
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      // Switch to student tab
      const studentTab = screen.getByText('Student')
      fireEvent.click(studentTab)
      
      // Switch back to admin/teacher tab
      const adminTab = screen.getByText('Admin/Teacher')
      fireEvent.click(adminTab)
      
      expect(screen.getByLabelText('Email')).toHaveValue('')
      expect(screen.getByLabelText('Password')).toHaveValue('')
    })
  })

  describe('Admin/Teacher Login', () => {
    beforeEach(() => {
      const collegeData = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege'
      }
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(collegeData))
    })

    it('should render admin/teacher form fields', () => {
      render(<LoginPage />)
      
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('should show validation error for missing email', async () => {
      render(<LoginPage />)
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Email and password are required')).toBeInTheDocument()
      })
    })

    it('should show validation error for missing password', async () => {
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Email and password are required')).toBeInTheDocument()
      })
    })

    it('should call signIn with correct parameters for admin/teacher', async () => {
      mockSignIn.mockResolvedValue({ ok: true, error: null })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'admin@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('admin-teacher', {
          email: 'admin@testcollege.edu',
          password: 'password123',
          collegeUsername: 'testcollege',
          redirect: false,
        })
      })
    })

    it('should show error message on failed login', async () => {
      mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'admin@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('should redirect on successful login', async () => {
      mockSignIn.mockResolvedValue({ ok: true, error: null })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'admin@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should show loading state during login', async () => {
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, error: null }), 100)))
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'admin@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Signing In...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Student Login', () => {
    beforeEach(() => {
      const collegeData = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege'
      }
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(collegeData))
    })

    it('should render student form fields when student tab is selected', () => {
      render(<LoginPage />)
      
      const studentTab = screen.getByText('Student')
      fireEvent.click(studentTab)
      
      expect(screen.getByLabelText('Roll Number')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('should show validation error for missing roll number', async () => {
      render(<LoginPage />)
      
      const studentTab = screen.getByText('Student')
      fireEvent.click(studentTab)
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Roll number and password are required')).toBeInTheDocument()
      })
    })

    it('should call signIn with correct parameters for student', async () => {
      mockSignIn.mockResolvedValue({ ok: true, error: null })
      
      render(<LoginPage />)
      
      const studentTab = screen.getByText('Student')
      fireEvent.click(studentTab)
      
      const rollNoInput = screen.getByLabelText('Roll Number')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(rollNoInput, { target: { value: 'STU001' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)
      
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

  describe('Navigation Links', () => {
    beforeEach(() => {
      const collegeData = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege'
      }
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(collegeData))
    })

    it('should show forgot password link', () => {
      render(<LoginPage />)
      
      expect(screen.getByText('Forgot your password?')).toBeInTheDocument()
    })

    it('should show sign up link', () => {
      render(<LoginPage />)
      
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
      expect(screen.getByText('Sign up')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      const collegeData = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege'
      }
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(collegeData))
    })

    it('should show error message on signIn exception', async () => {
      mockSignIn.mockRejectedValue(new Error('Network error'))
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'admin@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('An error occurred during login')).toBeInTheDocument()
      })
    })

    it('should handle malformed college data in sessionStorage', () => {
      window.sessionStorage.setItem('selectedCollege', 'invalid-json')
      
      render(<LoginPage />)
      
      expect(screen.getByText('No college selected. Please go back to select your institution.')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      const collegeData = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege'
      }
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(collegeData))
    })

    it('should have proper form labels', () => {
      render(<LoginPage />)
      
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('should have proper form labels for student form', () => {
      render(<LoginPage />)
      
      const studentTab = screen.getByText('Student')
      fireEvent.click(studentTab)
      
      expect(screen.getByLabelText('Roll Number')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('should disable form inputs during loading', async () => {
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, error: null }), 100)))
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      
      fireEvent.change(emailInput, { target: { value: 'admin@testcollege.edu' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)
      
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
    })
  })
})
