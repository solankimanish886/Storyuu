/**
 * Email service — stubbed in Phase 0.
 * Master Prompt §3 lists SendGrid / Nodemailer; selected via EMAIL_PROVIDER.
 * The template list comes from §6.9.2 of the Screen Spec.
 */
import { logger } from '../config/logger.js';

export type EmailTemplate =
  | 'verification'
  | 'password_reset'
  | 'subscription_receipt'
  | 'subscription_failed'
  | 'subscription_cancelled'
  | 'episode_released'
  | 'vote_results'
  | 'comp_granted'
  | 'account_suspended';

export interface SendEmailInput {
  to: string;
  template: EmailTemplate;
  variables: Record<string, string | number>;
}

export interface EmailService {
  send(input: SendEmailInput): Promise<{ messageId: string }>;
}

class StubEmailService implements EmailService {
  async send(input: SendEmailInput): Promise<{ messageId: string }> {
    logger.info(
      { to: input.to, template: input.template, variables: input.variables },
      'stub email: send (printed instead of delivered)',
    );
    return { messageId: `stub-${Date.now()}` };
  }
}

export const emailService: EmailService = new StubEmailService();
