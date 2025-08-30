import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChangePasswordForm from '@/components/user/ChangePasswordForm';

describe('ChangePasswordForm', () => {
  it('renders fields and submit button', () => {
    render(<ChangePasswordForm userId="u1" />);
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
  });
});


