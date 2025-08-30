import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  expiresAt: Date;
}

export const PasswordResetEmail = ({
  userName,
  resetUrl,
  expiresAt,
}: PasswordResetEmailProps) => {
  const previewText = 'Reset your password';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src={`${process.env.NEXTAUTH_URL}/logo.png`}
              width="120"
              height="40"
              alt="Exam SaaS"
              style={logo}
            />
          </Section>

          <Heading style={h1}>Password Reset Request</Heading>

          <Text style={text}>
            Hello {userName},
          </Text>

          <Text style={text}>
            We received a request to reset your password. If you made this request, click the button below to reset your password:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
          </Section>

          <Text style={text}>
            Or copy and paste this link into your browser:
          </Text>
          <Text style={link}>{resetUrl}</Text>

          <Text style={text}>
            <strong>Important:</strong> This password reset link will expire on{' '}
            {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString()}.
          </Text>

          <Text style={text}>
            If you didn&apos;t request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </Text>

          <Text style={text}>
            For security reasons, this link can only be used once. If you need to reset your password again, please request a new reset link.
          </Text>

          <Text style={footer}>
            If you have any questions or concerns, please contact your administrator.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const logoContainer = {
  padding: '32px 20px',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#dc3545',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const link = {
  color: '#dc3545',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  margin: '16px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '48px',
  textAlign: 'center' as const,
};
