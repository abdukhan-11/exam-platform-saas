import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import CollegeSelectionPage from '@/app/college/select/page'
import { render, mockRouter, mockFetch, mockFetchError, mockSessionStorage } from '../../utils/test-utils'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage(),
  writable: true,
})

describe('CollegeSelectionPage', () => {
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

  describe('Initial Render', () => {
    it('should render the page title and description', () => {
      render(<CollegeSelectionPage />)
      
      expect(screen.getByText('Welcome to ExamPlatform')).toBeInTheDocument()
      expect(screen.getByText('Enter your college username to get started with secure online examinations')).toBeInTheDocument()
    })

    it('should render the college search form', () => {
      render(<CollegeSelectionPage />)
      
      expect(screen.getByText('Find Your College')).toBeInTheDocument()
      expect(screen.getByLabelText('College Username')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Find College' })).toBeInTheDocument()
    })

    it('should render the back to home link', () => {
      render(<CollegeSelectionPage />)
      
      expect(screen.getByText('Back to Home')).toBeInTheDocument()
    })

    it('should render the register new college section', () => {
      render(<CollegeSelectionPage />)
      
      expect(screen.getByText("Don't see your college? Register a new institution")).toBeInTheDocument()
      expect(screen.getByText('Register New College')).toBeInTheDocument()
    })
  })

  describe('College Search', () => {
    it('should show validation error for empty college username', async () => {
      render(<CollegeSelectionPage />)
      
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a college username')).toBeInTheDocument()
      })
    })

    it('should show validation error for whitespace-only college username', async () => {
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      fireEvent.change(input, { target: { value: '   ' } })
      
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a college username')).toBeInTheDocument()
      })
    })

    it('should search for college on Enter key press', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      mockFetch({ success: true, college: mockCollege })
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' })
      
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

    it('should search for college on button click', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      mockFetch({ success: true, college: mockCollege })
      
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

    it('should show loading state during search', async () => {
      mockFetch({ success: true, college: { id: 'college-123', name: 'Test College' } })
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      expect(screen.getByText('Searching...')).toBeInTheDocument()
      expect(searchButton).toBeDisabled()
    })

    it('should display college information when found', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      mockFetch({ success: true, college: mockCollege })
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
        expect(screen.getByText('Choose how you want to access the platform')).toBeInTheDocument()
      })
    })

    it('should show login options when college is found', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      mockFetch({ success: true, college: mockCollege })
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Login as Admin/Teacher')).toBeInTheDocument()
        expect(screen.getByText('Login as Student')).toBeInTheDocument()
      })
    })

    it('should show error message when college is not found', async () => {
      mockFetch({ success: false, error: 'College not found' }, 404)
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'nonexistent' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('College not found')).toBeInTheDocument()
      })
    })

    it('should show error message on network failure', async () => {
      mockFetchError('Network error')
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to connect to server')).toBeInTheDocument()
      })
    })

    it('should clear previous error when new search is initiated', async () => {
      // First search fails
      mockFetch({ success: false, error: 'College not found' }, 404)
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'nonexistent' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('College not found')).toBeInTheDocument()
      })
      
      // Second search succeeds
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      mockFetch({ success: true, college: mockCollege })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.queryByText('College not found')).not.toBeInTheDocument()
        expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
      })
    })
  })

  describe('Login Choice', () => {
    const mockCollege = {
      id: 'college-123',
      name: 'Test College',
      username: 'testcollege',
      slug: 'test-college'
    }

    beforeEach(async () => {
      mockFetch({ success: true, college: mockCollege })
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
      })
    })

    it('should store college data in sessionStorage and redirect to admin login', () => {
      const adminButton = screen.getByText('Login as Admin/Teacher')
      fireEvent.click(adminButton)
      
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'selectedCollege',
        JSON.stringify(mockCollege)
      )
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?college=testcollege')
    })

    it('should store college data in sessionStorage and redirect to student login', () => {
      const studentButton = screen.getByText('Login as Student')
      fireEvent.click(studentButton)
      
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'selectedCollege',
        JSON.stringify(mockCollege)
      )
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login-student?college=testcollege')
    })
  })

  describe('Navigation', () => {
    it('should navigate back to home when back link is clicked', () => {
      render(<CollegeSelectionPage />)
      
      const backLink = screen.getByText('Back to Home')
      fireEvent.click(backLink)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })

    it('should have correct href for register new college link', () => {
      render(<CollegeSelectionPage />)
      
      const registerLink = screen.getByText('Register New College')
      expect(registerLink.closest('a')).toHaveAttribute('href', '/college/register')
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<CollegeSelectionPage />)
      
      expect(screen.getByLabelText('College Username')).toBeInTheDocument()
    })

    it('should have proper button labels', () => {
      render(<CollegeSelectionPage />)
      
      expect(screen.getByRole('button', { name: 'Find College' })).toBeInTheDocument()
    })

    it('should disable search button during loading', async () => {
      mockFetch({ success: true, college: { id: 'college-123', name: 'Test College' } })
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      expect(searchButton).toBeDisabled()
    })

    it('should have proper heading structure', () => {
      render(<CollegeSelectionPage />)
      
      expect(screen.getByRole('heading', { name: 'Welcome to ExamPlatform' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Find Your College' })).toBeInTheDocument()
    })
  })

  describe('Input Validation', () => {
    it('should trim whitespace from college username', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      mockFetch({ success: true, college: mockCollege })
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      fireEvent.change(input, { target: { value: '  testcollege  ' } })
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
})
