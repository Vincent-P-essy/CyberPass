import { normalizeApiResponse } from "./api-normalizers";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
export const demoMode = apiBaseUrl.length === 0;

export interface MutationResult<T = unknown> {
  ok: boolean;
  persisted: boolean;
  data?: T;
  message: string;
}

export async function apiMutation<T>(
  path: string,
  options: RequestInit
): Promise<MutationResult<T>> {
  if (demoMode) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      ok: true,
      persisted: false,
      message: "Aperçu validé en mode démonstration — aucune donnée n’a été enregistrée."
    };
  }

  try {
    const csrfToken =
      typeof document === "undefined"
        ? undefined
        : document.cookie
            .split("; ")
            .find((cookie) => cookie.startsWith("cyberpass_csrf="))
            ?.split("=")
            .slice(1)
            .join("=");
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        Accept: "application/json",
        ...(csrfToken ? { "X-CSRF-Token": decodeURIComponent(csrfToken) } : {}),
        ...options.headers
      }
    });
    if (!response.ok) {
      return { ok: false, persisted: false, message: "La demande n’a pas pu aboutir." };
    }
    const hasJson = response.headers.get("content-type")?.includes("application/json");
    return {
      ok: true,
      persisted: true,
      data: hasJson ? (normalizeApiResponse(path, await response.json()) as T) : undefined,
      message: "Modifications enregistrées."
    };
  } catch {
    return {
      ok: false,
      persisted: false,
      message: "Impossible de joindre l’API. Vérifiez la configuration puis réessayez."
    };
  }
}
