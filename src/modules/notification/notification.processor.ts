import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailerService } from '../../infrastructure/mailer/mailer.service';

@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);

    switch (job.name) {
      case 'send-email': {
        const { to, subject, html } = job.data;
        await this.mailerService.sendMail(to, subject, html);
        break;
      }
      default: {
        this.logger.warn(`Unknown job name: ${job.name}`);
        break;
      }
    }
  }
}
