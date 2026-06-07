import nodemailer from "nodemailer";

function getSmtpConfig() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set");
  }
  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  };
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!from) throw new Error("EMAIL_FROM or SMTP_USER must be set");

  const transporter = nodemailer.createTransport(getSmtpConfig());

  await transporter.sendMail({
    from: `RapVault <${from}>`,
    to,
    subject: "Reset your RapVault password",
    text: `Reset your RapVault password using this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">Reset your password</h2>
        <p>You requested a password reset for your RapVault account.</p>
        <p><a href="${resetUrl}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Reset password</a></p>
        <p style="color: #71717a; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
