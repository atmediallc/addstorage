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

interface SharedLinkEmailProps {
  senderName: string;
  senderEmail: string;
  shareUrl: string;
  itemName?: string;
  appUrl?: string;
}

export function SharedLinkEmail({
  senderName,
  senderEmail,
  shareUrl,
  itemName,
  appUrl = 'https://tutiscloud.com',
}: SharedLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {senderName} shared {itemName ? `"${itemName}"` : 'a file'} with you
        on TutisCloud
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New shared link</Heading>
          <Text style={text}>
            <strong>{senderName}</strong> ({senderEmail}) shared{' '}
            {itemName ? <strong>&ldquo;{itemName}&rdquo;</strong> : 'a file'}{' '}
            with you via TutisCloud.
          </Text>
          <Button href={shareUrl} style={button}>
            Open shared item
          </Button>
          <Text style={text}>
            Or copy this link:{' '}
            <Link href={shareUrl} style={link}>
              {shareUrl}
            </Link>
          </Text>
          <Text style={footer}>
            This link was sent by TutisCloud. If you don&apos;t recognize{' '}
            {senderName}, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f5f5f5',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '600px',
};

const h1 = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '16px',
};

const text = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#4a4a4a',
  marginBottom: '16px',
};

const button = {
  display: 'inline-block',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: '600',
  marginBottom: '16px',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const footer = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#9ca3af',
  marginTop: '32px',
};
