import nodemailer from 'nodemailer';
import sgTransport from 'nodemailer-sendgrid-transport';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;
    const apiKey = process.env.SENDGRID_API_KEY || '';
    if (!apiKey) {
      // Fallback to console transport if no key configured
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      return this.transporter;
    }
    this.transporter = nodemailer.createTransport(sgTransport({ auth: { api_key: apiKey } } as any));
    return this.transporter;
  }

  public static async sendInvitationEmail(toEmail: string, tempPassword: string): Promise<void> {
    console.log('[EmailService] sendInvitationEmail called for:', toEmail);
    const transporter = this.getTransporter();
    const from = process.env.EMAIL_FROM || 'CampusConnect <no-reply@campusconnect.local>';
    const subject = 'CampusConnect Invitation: Your Temporary Password';
    const text = `Welcome to CampusConnect!\n\nPlease log in using your college email address as your username. Your temporary password is: ${tempPassword}\n\nAfter logging in, change your password from your Profile page.`;
    const brandColor = '#0d6efd';
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#212529;background:#f7f9fc;padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:8px;box-shadow:0 0.5rem 1rem rgba(0,0,0,.05);">
          <tr>
            <td style="padding:24px 24px 0 24px;">
              <h2 style="margin:0 0 8px 0;color:${brandColor};">Welcome to CampusConnect</h2>
              <p style="margin:0;color:#6c757d;">Please log in using your college email address as your username.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 0 24px;">
              <p style="margin:0 0 12px 0;">Your temporary password is shown below. After logging in, change it from your Profile page.</p>
              <div style="background:#f1f3f5;border:1px solid #dee2e6;border-radius:6px;padding:12px 16px;display:inline-block;font-weight:600;letter-spacing:0.5px;">${tempPassword}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <a href="/login.html" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;">Sign in to CampusConnect</a>
            </td>
          </tr>
        </table>
      </div>`;
    const usingMock = !process.env.SENDGRID_API_KEY;
    console.log(`[EmailService] Transport mode: ${usingMock ? 'MOCK (jsonTransport)' : 'SendGrid'}`);
    await transporter.sendMail({ to: toEmail, from, subject, text, html });
  }
}



