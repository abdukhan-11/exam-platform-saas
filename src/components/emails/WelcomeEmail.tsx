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

interface WelcomeEmailProps {
  userName: string;
  collegeName: string;
  role: string;
  loginUrl: string;
}

export const WelcomeEmail = ({
  userName,
  collegeName,
  role,
  loginUrl,
}: WelcomeEmailProps) => {
  const previewText = `Welcome to ${collegeName}! Your account is ready.`;

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
              alt={collegeName}
              style={logo}
            />
          </Section>

          <Heading style={h1}>Welcome to {collegeName}!</Heading>

          <Text style={text}>
            Hello {userName},
          </Text>

          <Text style={text}>
            Your account has been successfully created and you&apos;re now a{' '}
            <strong>{role}</strong> at <strong>{collegeName}</strong>.
          </Text>

          <Text style={text}>
            You can now access your account and start using the platform:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={loginUrl}>
              Access Your Account
            </Button>
          </Section>

          <Text style={text}>
            <strong>What's next?</strong>
          </Text>

          <Text style={text}>
            • Complete your profile setup
            <br />
            • Explore the dashboard and available features
            <br />
            • Review your role permissions and responsibilities
            <br />
            • Contact your administrator if you need assistance
          </Text>

          <Text style={text}>
            If you have any questions or need help getting started, don&apos;t hesitate to reach out to your administrator.
          </Text>

          <Text style={footer}>
            Welcome aboard!<br />
            The {collegeName} Team
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
  backgroundColor: '#007ee6',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '48px',
  textAlign: 'center' as const,
};
