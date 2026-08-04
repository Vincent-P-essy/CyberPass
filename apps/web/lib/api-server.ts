import { cookies, headers } from "next/headers";
import type { DataResult } from "./types";
import { apiBaseUrl, demoMode } from "./api";
import { normalizeApiResponse } from "./api-normalizers";

const serverApiBaseUrl = (process.env.INTERNAL_API_URL ?? apiBaseUrl).replace(/\/$/, "");

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string
  ) {
    super(status === 401 ? "Session requise" : "Service API indisponible");
    this.name = "ApiRequestError";
  }
}

export async function apiFetch<T>(path: string, fallback: T): Promise<DataResult<T>> {
  if (demoMode) return { data: fallback, source: "demo", message: "API non configurée" };
  try {
    const cookieStore = await cookies();
    const requestHeaders = await headers();
    const forwardedCookies = ["cyberpass_access", "cyberpass_csrf", "cyberpass_organization"]
      .map((name) => cookieStore.get(name))
      .filter((cookie): cookie is { name: string; value: string } => cookie !== undefined)
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    const response = await fetch(`${serverApiBaseUrl}${path}`, {
      headers: {
        Accept: "application/json",
        ...(forwardedCookies ? { Cookie: forwardedCookies } : {}),
        ...(requestHeaders.get("user-agent")
          ? { "User-Agent": requestHeaders.get("user-agent") as string }
          : {})
      },
      cache: "no-store"
    });
    if (!response.ok) throw new ApiRequestError(response.status, path);
    const raw = (await response.json()) as unknown;
    return { data: normalizeApiResponse(path, raw) as T, source: "api" };
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(503, path);
  }
}

export async function publicApiFetch<T>(path: string): Promise<T | null> {
  if (demoMode) return null;
  try {
    const response = await fetch(`${serverApiBaseUrl}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return null;
    return normalizeApiResponse(path, await response.json()) as T;
  } catch {
    return null;
  }
}
