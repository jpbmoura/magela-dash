import { eq } from "drizzle-orm";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { contaAzulConnection } from "../../drizzle/schema";

export const AUTH_BASE = "https://auth.contaazul.com";

export function basicAuthHeader(): string {
  const credentials = Buffer.from(
    `${ENV.contaAzulClientId}:${ENV.contaAzulClientSecret}`
  ).toString("base64");
  return `Basic ${credentials}`;
}

export function getAuthorizationUrl(): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: ENV.contaAzulClientId,
    redirect_uri: ENV.contaAzulRedirectUri,
    scope: "openid profile aws.cognito.signin.user.admin",
    state: "conta-azul-oauth",
  });
  return `${AUTH_BASE}/login?${params}`;
}

export async function exchangeCodeForToken(code: string) {
  const res = await fetch(`${AUTH_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: ENV.contaAzulRedirectUri,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[ContaAzul] Token exchange failed:", res.status, body);
    throw new Error("Falha ao trocar código por token do Conta Azul");
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }>;
}

export async function saveConnection(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  const now = new Date();

  const existing = await getActiveConnection();
  if (existing) {
    await db
      .update(contaAzulConnection)
      .set({
        status: "connected",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: expiresAt,
        connectedAt: now,
      })
      .where(eq(contaAzulConnection.id, existing.id));
    return;
  }

  await db.insert(contaAzulConnection).values({
    status: "connected",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenExpiresAt: expiresAt,
    connectedAt: now,
  });
}

export async function getActiveConnection() {
  const db = await getDb();
  if (!db) return null;

  const [conn] = await db
    .select()
    .from(contaAzulConnection)
    .where(eq(contaAzulConnection.status, "connected"))
    .limit(1);
  return conn ?? null;
}

export async function getConnectionStatus() {
  const db = await getDb();
  if (!db) return { connected: false, lastSyncAt: null };

  const [conn] = await db.select().from(contaAzulConnection).limit(1);
  if (!conn) return { connected: false, lastSyncAt: null };

  return {
    connected: conn.status === "connected",
    status: conn.status,
    connectedAt: conn.connectedAt,
    lastSyncAt: conn.lastSyncAt,
    tokenExpiresAt: conn.tokenExpiresAt,
  };
}

export async function updateConnectionTokens(
  id: number,
  data: {
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(contaAzulConnection)
    .set(data)
    .where(eq(contaAzulConnection.id, id));
}

export async function updateLastSyncAt() {
  const db = await getDb();
  if (!db) return;

  const conn = await getActiveConnection();
  if (!conn) return;

  await db
    .update(contaAzulConnection)
    .set({ lastSyncAt: new Date() })
    .where(eq(contaAzulConnection.id, conn.id));
}

export async function disconnect() {
  const db = await getDb();
  if (!db) return;

  const conn = await getActiveConnection();
  if (!conn) return;

  await db
    .update(contaAzulConnection)
    .set({
      status: "disconnected",
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
    })
    .where(eq(contaAzulConnection.id, conn.id));
}
