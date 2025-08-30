import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarUploader from '@/components/user/AvatarUploader';

describe('AvatarUploader', () => {
  it('renders upload button and placeholder', () => {
    render(<AvatarUploader userId="u1" />);
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
    expect(screen.getByText('No Image')).toBeInTheDocument();
  });
});


