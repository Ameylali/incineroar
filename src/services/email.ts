import axios from 'axios';

import { EmailSendError, MissingConfigError } from '../utils/errors';

interface EmailConfig {
  apiKey: string;
}

interface SendEmailParams {
  to: string;
  from: string;
  subject: string;
  body: string;
}

export default class EmailService {
  private config: EmailConfig;

  constructor() {
    if (!process.env.SENDWITH_API_KEY) {
      throw new MissingConfigError('SENDWITH_API_KEY');
    }
    this.config = {
      apiKey: process.env.SENDWITH_API_KEY,
    };
  }

  async sendEmail({ to, from, subject, body }: SendEmailParams) {
    try {
      const response = await axios.post(
        'https://app.sendwith.email/api/send',
        {
          message: {
            to: [{ email: to }],
            from: { email: from },
            subject,
            body,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        },
      );

      return response.data as unknown;
    } catch (error) {
      throw new EmailSendError(error);
    }
  }
}
