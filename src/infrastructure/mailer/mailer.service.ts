import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('mailer.from') || '"Demo SaaS" <no-reply@demo.com>';
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('mailer.host');
    const port = this.configService.get<number>('mailer.port');
    const user = this.configService.get<string>('mailer.user');
    const pass = this.configService.get<string>('mailer.pass');

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
      this.logger.log(`Mailer initialized with SMTP server: ${host}:${port}`);
    } else {
      this.logger.warn('SMTP configuration is missing. Falling back to Mock Mailer.');
    }
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.from,
          to,
          subject,
          html,
        });
        this.logger.log(`Email sent successfully to ${to}`);
      } catch (err) {
        this.logger.error(`Failed to send email to ${to}`, err);
        throw err;
      }
    } else {
      // Mock logger fallback
      this.logger.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Content: ${html}`);
    }
  }
}
