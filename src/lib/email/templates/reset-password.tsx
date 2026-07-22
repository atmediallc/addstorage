// src/lib/email/templates/reset-password.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
} from '@react-email/components';

interface ResetPasswordEmailProps {
  url: string;
  userName: string;
}

export function ResetPasswordEmail({
  url,
  userName,
}: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your TutisCloud password</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Reset your password</Heading>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            We received a request to reset the password for your TutisCloud
            account. Click the button below to choose a new password.
          </Text>
          <Button href={url} style={button}>
            Reset Password
          </Button>
          <Text style={text}>
            If the button doesn&apos;t work, copy and paste this link into your
            browser:
          </Text>
          <Link href={url} style={link}>
            {url}
          </Link>
          <Text style={footer}>
            This link expires in 1 hour. If you didn&apos;t request a password
            reset, you can safely ignore this email — your password will remain
            unchanged.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container: React.CSSProperties = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const heading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '16px',
};

const text: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
  marginBottom: '16px',
};

const button: React.CSSProperties = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  padding: '12px 24px',
  marginBottom: '16px',
};

const link: React.CSSProperties = {
  fontSize: '14px',
  color: '#2563eb',
  textDecoration: 'underline',
  wordBreak: 'break-all',
};

const footer: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#9ca3af',
  marginTop: '32px',
};
