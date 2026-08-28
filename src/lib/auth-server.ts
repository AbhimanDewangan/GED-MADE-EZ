import { SignJWT, jwtVerify } from "jose";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function getEnv(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const authConfig = {
  googleClientId: getEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: getEnv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:3000/api/auth/google/callback"
  ),
  jwtSecret: getEnv("JWT_SECRET", "change-this-jwt-secret-in-production"),
  jwtExpireHours: Number(getEnv("JWT_EXPIRE_HOURS", "168")),
  frontendUrl: getEnv("FRONTEND_URL", "http://localhost:3000"),
};

export function googleOAuthConfigured(): boolean {
  return Boolean(authConfig.googleClientId && authConfig.googleClientSecret);
}

function getJwtKey() {
  return new TextEncoder().encode(authConfig.jwtSecret);
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

export async function createOAuthState(): Promise<string> {
  return new SignJWT({ purpose: "login" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getJwtKey());
}

export async function verifyOAuthState(state: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(state, getJwtKey());
    return payload.purpose === "login";
  } catch {
    return false;
  }
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: authConfig.googleClientId,
    redirect_uri: authConfig.googleRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForGoogleUser(code: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture: string;
  email_verified?: boolean;
}> {
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: authConfig.googleClientId,
      client_secret: authConfig.googleClientSecret,
      redirect_uri: authConfig.googleRedirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to exchange Google authorization code.");
  }

  const tokens = (await tokenResponse.json()) as { access_token?: string };
  if (!tokens.access_token) {
    throw new Error("Google did not return an access token.");
  }

  const userResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userResponse.ok) {
    throw new Error("Failed to fetch Google user profile.");
  }

  return userResponse.json();
}

export async function createAccessToken(user: {
  sub: string;
  email: string;
  name: string;
  picture: string;
}): Promise<string> {
  const email = normalizeEmail(user.email);
  if (!email) {
    throw new Error("Google account has no email address.");
  }

  return new SignJWT({
    sub: user.sub,
    email,
    name: user.name || email.split("@")[0],
    picture: user.picture || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${authConfig.jwtExpireHours}h`)
    .sign(getJwtKey());
}

export async function decodeAccessToken(token: string): Promise<AppUser> {
  const { payload } = await jwtVerify(token, getJwtKey());
  const email = normalizeEmail(payload.email as string);
  if (!email) {
    throw new Error("Invalid session token.");
  }

  return {
    id: String(payload.sub || ""),
    email,
    name: String(payload.name || email.split("@")[0]),
    picture: String(payload.picture || ""),
  };
}

export function userToAppUser(user: AppUser) {
  return {
    uid: user.id,
    email: user.email,
    displayName: user.name,
    photoURL: user.picture || null,
  };
}
