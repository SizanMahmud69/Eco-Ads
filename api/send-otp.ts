import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp, username } = req.body;

  // Configuration check
  const smtpUser = process.env.VITE_SMTP_USER || 'pabnamart.contact@gmail.com';
  const smtpPass = process.env.VITE_SMTP_PASS;

  if (!smtpPass) {
    console.error("SMTP Password not set in environment variables");
    return res.status(500).json({ 
      error: "Email service not configured. Please ensure VITE_SMTP_PASS is set in Vercel environment variables." 
    });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  const mailOptions = {
    from: `"Eco Ads Verification" <${smtpUser}>`,
    to: email,
    subject: `Your Verification Code: ${otp}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #059669; text-align: center;">Eco Ads</h2>
        <p>Hello <strong>${username || 'User'}</strong>,</p>
        <p>Thank you for joining Eco Ads! Your account verification code is:</p>
        <div style="background: #f0fdf4; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
          <h1 style="font-size: 40px; letter-spacing: 12px; margin: 0; color: #065f46;">${otp}</h1>
        </div>
        <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">Developer: Sizan Mahmud | Eco Ads Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Email send error:", error);
    return res.status(500).json({ 
      error: "Failed to send email. Check SMTP credentials.",
      details: error.message 
    });
  }
}
