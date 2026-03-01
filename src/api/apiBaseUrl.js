function stripTrailingSlash(url) {
  return url.replace(/\/$/, "");
}

export function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredBaseUrl && configuredBaseUrl.trim()) {
    return stripTrailingSlash(configuredBaseUrl.trim());
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocalHost = host === "localhost" || host === "127.0.0.1";
    if (isLocalHost) {
      return "http://localhost:8000";
    }
  }

  return "";
}

export function buildApiUrl(path) {
  const baseUrl = resolveApiBaseUrl();
  return `${baseUrl}${path}`;
}
