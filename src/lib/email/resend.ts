// src/lib/email/resend.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { VerificationEmail } from './templates/verification';
import { ResetPasswordEmail } from './templates/reset-password';
import { SharedLinkEmail } from './templates/shared-link';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? 'TutisCloud <noreply@tutiscloud.com>';

export async function sendVerificationEmail(
  to: string,
  url: string,
  userName: string,
): Promise<void> {
  const html = await render(VerificationEmail({ url, userName }));
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: 'Verify your email — TutisCloud',
    html,
  });
}

export async function sendResetPasswordEmail(
  to: string,
  url: string,
  userName: string,
): Promise<void> {
  const html = await render(ResetPasswordEmail({ url, userName }));
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: 'Reset your password — TutisCloud',
    html,
  });
}

export async function sendSharedLinkEmail(
  to: string,
  senderName: string,
  senderEmail: string,
  shareUrl: string,
  itemName?: string,
): Promise<void> {
  const html = await render(
    SharedLinkEmail({ senderName, senderEmail, shareUrl, itemName }),
  );
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `${senderName} shared a file with you on TutisCloud`,
    html,
  });
}

export async function sendContactEmail(
  to: string,
  senderName: string,
  senderEmail: string,
  message: string,
): Promise<void> {
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `New Support Message from ${senderName}`,
    text: `Name: ${senderName}\nEmail: ${senderEmail}\nMessage: ${message}`,
  });
}
