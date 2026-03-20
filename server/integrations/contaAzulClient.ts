import {
  getActiveConnection,
  updateConnectionTokens,
  AUTH_BASE,
  basicAuthHeader,
} from "./contaAzulAuth";

const API_BASE = "https://api-v2.contaazul.com";

async function refreshTokenIfNeeded(): Promise<string> {
  const conn = await getActiveConnection();
  if (!conn || !conn.accessToken) {
    throw new Error("Conta Azul não conectada");
  }

  if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) > new Date()) {
    return conn.accessToken;
  }

  if (!conn.refreshToken) {
    throw new Error("Refresh token não disponível. Reconecte ao Conta Azul.");
  }

  const res = await fetch(`${AUTH_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conn.refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[ContaAzul] Token refresh failed:", res.status, body);
    throw new Error("Falha ao renovar token do Conta Azul");
  }

  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);

  await updateConnectionTokens(conn.id, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: expiresAt,
  });

  return data.access_token;
}

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 100;

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function contaAzulGet<T = any>(
  path: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  const token = await refreshTokenIfNeeded();
  await throttle();

  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (res.status === 429) {
    console.warn("[ContaAzul] Rate limited, retrying in 2s...");
    await new Promise((r) => setTimeout(r, 2000));
    return contaAzulGet(path, params);
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`[ContaAzul] GET ${path} failed:`, res.status, body);
    throw new Error(`Conta Azul API error: ${res.status}`);
  }

  return res.json();
}

export async function contaAzulPost<T = any>(
  path: string,
  data: any
): Promise<T> {
  const token = await refreshTokenIfNeeded();
  await throttle();

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 429) {
    console.warn("[ContaAzul] Rate limited, retrying in 2s...");
    await new Promise((r) => setTimeout(r, 2000));
    return contaAzulPost(path, data);
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`[ContaAzul] POST ${path} failed:`, res.status, body);
    throw new Error(`Conta Azul API error: ${res.status}`);
  }

  return res.json();
}
