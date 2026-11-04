import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "daybook_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return value;
}

function sign(payload) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a, b) {
  const x = createHash("sha256").update(String(a)).digest();
  const y = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(x, y);
}

export function passwordMatches(input) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD is not set");
  return safeEqual(input, expected);
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export function isAuthenticated(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (!safeEqual(signature, sign(expires))) return false;
  return Number(expires) > Date.now() / 1000;
}

function cookieFlags(req) {
  const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function setSession(req, res) {
  const expires = String(Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS);
  res.setHeader("Set-Cookie", `${COOKIE}=${expires}.${sign(expires)}; Max-Age=${MAX_AGE_SECONDS}; ${cookieFlags(req)}`);
}

export function clearSession(req, res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; ${cookieFlags(req)}`);
}
