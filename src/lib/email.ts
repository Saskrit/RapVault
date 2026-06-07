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

type ResetEmailOptions = {
  googleOnly?: boolean;
};

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  options: ResetEmailOptions = {},
) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!from) throw new Error("EMAIL_FROM or SMTP_USER must be set");

  const transporter = nodemailer.createTransport(getSmtpConfig());

  const intro = options.googleOnly
    ? "You signed up with Google. Use the link below to set a password so you can also sign in with email, or keep using Google sign-in."
    : "You requested a password reset for your RapVault account.";

  const googleNote = options.googleOnly
    ? "\n\nYou can still sign in with Google anytime."
    : "";

  await transporter.sendMail({
    from: `RapVault <${from}>`,
    to,
    subject: options.googleOnly
      ? "Set a password for your RapVault account"
      : "Reset your RapVault password",
    text: `${intro}\n\n${resetUrl}\n\nThis link expires in 1 hour.${googleNote}\n\nIf you didn't request this, ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">${options.googleOnly ? "Set a password" : "Reset your password"}</h2>
        <p>${intro}</p>
        <p><a href="${resetUrl}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">${options.googleOnly ? "Set password" : "Reset password"}</a></p>
        ${options.googleOnly ? '<p style="color: #71717a; font-size: 14px;">You can still sign in with Google anytime.</p>' : ""}
        <p style="color: #71717a; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
