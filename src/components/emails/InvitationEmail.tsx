import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface InvitationEmailProps {
  inviterName: string;
  inviterEmail: string;
  collegeName: string;
  role: string;
  invitationUrl: string;
  expiresAt: Date;
}

export const InvitationEmail = ({
  inviterName,
  inviterEmail,
  collegeName,
  role,
  invitationUrl,
  expiresAt,
}: InvitationEmailProps) => {
  const previewText = `You've been invited to join ${collegeName} as a ${role}`;

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

          <Heading style={h1}>You&apos;re Invited!</Heading>

          <Text style={text}>
            Hello,
          </Text>

          <Text style={text}>
            <strong>{inviterName}</strong> ({inviterEmail}) has invited you to join{' '}
            <strong>{collegeName}</strong> as a <strong>{role}</strong>.
          </Text>

          <Text style={text}>
            Click the button below to accept this invitation and create your account:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={invitationUrl}>
              Accept Invitation
            </Button>
          </Section>

          <Text style={text}>
            Or copy and paste this link into your browser:
          </Text>
          <Text style={link}>{invitationUrl}</Text>

          <Text style={text}>
            <strong>Important:</strong> This invitation will expire on{' '}
            {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString()}.
          </Text>

          <Text style={text}>
            If you didn't expect this invitation, you can safely ignore this email.
          </Text>

          <Text style={footer}>
            This email was sent by {collegeName}. If you have any questions, please contact your administrator.
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

const link = {
  color: '#007ee6',
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
