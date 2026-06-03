import { registerAs } from '@nestjs/config';

export interface MailerConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

export default registerAs('mailer', (): MailerConfig => ({
  host: process.env.MAIL_HOST || undefined,
  port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : undefined,
  user: process.env.MAIL_USER || undefined,
  pass: process.env.MAIL_PASSWORD || undefined,
  from: process.env.MAIL_FROM || '"Demo SaaS" <no-reply@demo.com>',
}));
