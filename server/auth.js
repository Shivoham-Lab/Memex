import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/** Read env vars lazily so dotenv can load first */
function getSecretKey() { return process.env.MEMEX_SECRET_KEY; }
function getPassword() { return process.env.MEMEX_PASSWORD; }

/** Validate that MEMEX_SECRET_KEY is set */
export function validateSecretKey() {
  if (!getSecretKey() || getSecretKey().length < 32) {
    console.error('\nERROR: MEMEX_SECRET_KEY is not set or too short (min 32 chars).');
    console.error('Set it in .env: MEMEX_SECRET_KEY=' + crypto.randomBytes(32).toString('hex'));
    process.exit(1);
  }
}

/** Check if password authentication is enabled */
export function isAuthEnabled() {
  return !!getPassword();
}

/** Verify password and return JWT token */
export function authenticate(password) {
  if (!getPassword()) return { token: generateToken(), noAuth: true };
  if (password !== getPassword()) return null;
  return { token: generateToken() };
}

/** Generate JWT session token (7 day expiry) */
function generateToken() {
  return jwt.sign({ type: 'session' }, getSecretKey(), { expiresIn: '7d' });
}

/** Express middleware — verifies JWT session cookie */
export function sessionAuth(req, res, next) {
  if (!getPassword()) return next();

  const token = req.cookies?.memex_session;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    jwt.verify(token, getSecretKey());
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

/** MCP endpoints are open — Cloudflare Tunnel URL is private and unguessable */
export function verifyMCPSecret(req) {
  return true;
}
