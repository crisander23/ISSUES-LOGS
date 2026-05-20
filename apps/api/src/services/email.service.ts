import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { SmtpEncryption } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { decrypt } from '../utils/crypto';

export type EmailType =
  | 'verify-email'
  | 'forgot-password'
  | 'invite'
  | 'issue-created'
  | 'issue-assigned'
  | 'issue-resolved'
  | 'issue-closed'
  | 'smtp-test';

interface SendEmailInput {
  organizationId?: string;
  to: string;
  type: EmailType;
  subject: string;
  heading: string;
  preview: string;
  body: string;
  action?: {
    label: string;
    href: string;
  };
}

function baseTemplate(input: SendEmailInput): string {
  const actionHtml = input.action
    ? `<p style="margin:24px 0"><a href="${input.action.href}" style="background:#2f6ef7;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px;font-size:13px;font-weight:600;display:inline-block">${input.action.label}</a></p>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${input.subject}</title>
  </head>
  <body style="margin:0;background:#f7f7f5;font-family:Arial,sans-serif;color:#1a1a18">
    <span style="display:none">${input.preview}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;padding:32px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border:1px solid #e3e3e0;border-radius:10px">
            <tr>
              <td style="padding:28px 28px 8px">
                <div style="font-size:13px;color:#8a8a86;font-weight:700;letter-spacing:.04em;text-transform:uppercase">2DOC Issues Log</div>
                <h1 style="font-size:22px;line-height:1.25;margin:14px 0 8px">${input.heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;font-size:14px;line-height:1.6;color:#4a4a47">
                ${input.body}
                ${actionHtml}
                <p style="margin-top:28px;color:#8a8a86;font-size:12px">This message was sent by 2DOC Issues Log.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function createTransportFromConfig(config: {
  host: string;
  port: number;
  encryption: SmtpEncryption | string;
  username: string;
  password: string;
}): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.encryption === 'SSL',
    auth: {
      user: config.username,
      pass: config.password,
    },
    requireTLS: config.encryption === 'TLS',
  });
}

async function getTransport(organizationId?: string) {
  if (organizationId) {
    const smtp = await prisma.smtpConfig.findUnique({ where: { organizationId } });
    if (smtp) {
      return {
        from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
        transporter: createTransportFromConfig({
          host: smtp.host,
          port: smtp.port,
          encryption: smtp.encryption,
          username: smtp.username,
          password: decrypt(smtp.passwordEncrypted),
        }),
      };
    }
  }

  return {
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
    transporter: createTransportFromConfig({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      encryption: env.SMTP_ENCRYPTION,
      username: env.SMTP_USER,
      password: env.SMTP_PASS,
    }),
  };
}

export async function sendEmail(input: SendEmailInput) {
  const { from, transporter } = await getTransport(input.organizationId);

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: baseTemplate(input),
  });
}

export async function sendBestEffortEmail(input: SendEmailInput) {
  try {
    await sendEmail(input);
  } catch (error) {
    console.warn(`Email send failed for ${input.type}:`, error);
  }
}
