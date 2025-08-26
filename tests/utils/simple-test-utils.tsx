import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Simple render function without complex providers
export const simpleRender = (
  ui: ReactElement,
  options: Omit<RenderOptions, 'wrapper'> = {}
) => {
  return render(ui, options)
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { simpleRender as render }
