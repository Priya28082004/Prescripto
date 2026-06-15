import nodemailer from 'nodemailer';
import emailModel from '../models/emailModel.js';

/**
 * Send an email notification for a support ticket and log it in the database.
 */
export const sendTicketEmail = async ({ to, subject, text, html, ticketId }) => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  let status = 'sent';

  if (!host || !user || !pass) {
    console.log(`[Email Service Mock] Sending email to ${to}`);
    console.log(`[Email Service Mock] Subject: ${subject}`);
    console.log(`[Email Service Mock] Text: ${text}`);
    
    // Log in email collection
    try {
      await emailModel.create({
        ticketId: ticketId || 'N/A',
        to,
        subject,
        body: text || html,
        status: 'sent'
      });
    } catch (dbErr) {
      console.error('[Email DB Log Error]:', dbErr);
    }
    
    return { mock: true, messageId: 'mock-id-' + Date.now() };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"Prescripto Support" <${user}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`[Email Service] Email sent: ${info.messageId}`);
    
    // Log to DB
    await emailModel.create({
      ticketId: ticketId || 'N/A',
      to,
      subject,
      body: text || html,
      status: 'sent'
    });

    return info;
  } catch (error) {
    console.error('[Email Service] Error sending email:', error);
    
    // Log failure
    try {
      await emailModel.create({
        ticketId: ticketId || 'N/A',
        to,
        subject,
        body: text || html,
        status: 'failed'
      });
    } catch (dbErr) {}

    throw error;
  }
};
