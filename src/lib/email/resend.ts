// src/lib/email/resend.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { VerificationEmail } from './templates/verification';
import { ResetPasswordEmail } from './templates/reset-password';

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
