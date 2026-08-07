import { SignJWT, jwtVerify } from "jose";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

const ISSUER = "RapVault";
const SETUP_TTL = "10m";
const LOGIN_TTL = "5m";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export function generateTotpSecret() {
  return generateSecret();
}

export function buildOtpauthUri(accountLabel: string, secret: string) {
  return generateURI({
    issuer: ISSUER,
    label: accountLabel,
    secret,
  });
}

export async function buildTotpQrDataUrl(otpauthUrl: string) {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: {
      dark: "#18181b",
      light: "#ffffff",
    },
  });
}

export function verifyTotp(secret: string, token: string) {
  const code = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  try {
    const result = verifySync({ secret, token: code });
    return Boolean(result?.valid);
  } catch {
    return false;
  }
}

export function normalizeTotpCode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "").slice(0, 6);
}

export async function createTotpSetupToken(userId: string, secret: string) {
  return new SignJWT({
    purpose: "totp_setup",
    userId,
    secret,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(SETUP_TTL)
    .sign(getSecret());
}

export async function verifyTotpSetupToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "totp_setup") return null;
    if (typeof payload.userId !== "string" || typeof payload.secret !== "string") {
      return null;
    }
    return { userId: payload.userId, secret: payload.secret };
  } catch {
    return null;
  }
}

export async function createTotpLoginToken(userId: string) {
  return new SignJWT({
    purpose: "totp_login",
    userId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(LOGIN_TTL)
    .sign(getSecret());
}

export async function verifyTotpLoginToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "totp_login") return null;
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
