function stripTrailingSlash(url) {
  return url.replace(/\/$/, "");
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getConfiguredBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!configuredBaseUrl || !configuredBaseUrl.trim()) {
    return null;
  }
  return stripTrailingSlash(configuredBaseUrl.trim());
}

export function resolveApiBaseUrl() {
  const configuredBaseUrl = getConfiguredBaseUrl();
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window === "undefined") {
    return "http://localhost:8000";
  }

  const { hostname } = window.location;
  if (isLocalHost(hostname)) {
    return "http://localhost:8000";
  }

  // 프로덕션: Netlify 프록시를 통해 같은 도메인에서 API 호출 (CORS 불필요)
  // netlify.toml의 redirect 규칙이 /api/* → Render 백엔드로 전달
  return "";
}

export function buildApiUrl(path) {
  const baseUrl = resolveApiBaseUrl();
  return `${baseUrl}${path}`;
}
