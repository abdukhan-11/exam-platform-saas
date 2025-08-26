import React from 'react'
import { screen } from '@testing-library/react'
import { render } from '../utils/simple-test-utils'

// Simple test component
const TestComponent = () => {
  return <div>Hello World</div>
}

describe('Simple Test', () => {
  it('should render a simple component', () => {
    render(<TestComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should pass basic assertions', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toContain('hello')
    expect(true).toBeTruthy()
  })
})
