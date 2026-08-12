/*
  JWT handling — Rules.md Section 4: token storage and role checks live here only,
  never scattered across components.

  The token is kept in a cookie so that middleware.ts can read it during routing.
  Authorization itself is always enforced by the backend (Architecture.md Section 7);
  anything decoded on the client is used for navigation and UI state only.
*/

export const TOKEN_COOKIE = "ac_token";

export type Role = "seller" | "admin";

export type TokenClaims = {
  user_id: string;
  role: Role;
  exp: number;
};

function decodeBase64Url(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  // Handle non-ASCII characters in claims (e.g. seller names).
  return decodeURIComponent(
    Array.from(binary, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
  );
}

/** Reads claims without verifying the signature. Routing/UI only — never authorization. */
export function readClaims(token: string | undefined | null): TokenClaims | null {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as TokenClaims;
    if (!claims.user_id || !claims.role) return null;
    if (claims.exp && claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export function hasRole(claims: TokenClaims | null, role: Role): boolean {
  return claims?.role === role;
}

/** Landing route after login, per the role in the token. */
export function homeForRole(role: Role): string {
  return role === "admin" ? "/admin/dashboard" : "/seller/dashboard";
}

// --- Browser-side token storage ---

export function getTokenFromBrowser(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setTokenInBrowser(token: string, maxAgeSeconds: number): void {
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

export function clearTokenInBrowser(): void {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
