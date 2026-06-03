import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue('notification')
    private readonly notificationQueue: Queue,
  ) {}

  async queueEmail(to: string, subject: string, html: string) {
    this.logger.log(`Queueing email to ${to} with subject "${subject}"`);
    await this.notificationQueue.add(
      'send-email',
      { to, subject, html },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `http://localhost:3000/api/v1/auth/verify?token=${token}`;
    const html = `
      <h1>Verify your Email</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
    `;
    await this.queueEmail(email, 'Verify Your Email Address', html);
  }

  async sendForgotPasswordEmail(email: string, token: string) {
    const resetUrl = `http://localhost:3000/api/v1/auth/reset-password?token=${token}`;
    const html = `
      <h1>Reset Your Password</h1>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
    `;
    await this.queueEmail(email, 'Reset Your Password', html);
  }
}
