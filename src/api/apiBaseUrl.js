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

  throw new Error(
    "VITE_API_BASE_URL이 설정되지 않았습니다. 배포 환경에서는 백엔드 주소를 반드시 설정해야 합니다.",
  );
}

export function buildApiUrl(path) {
  const baseUrl = resolveApiBaseUrl();
  return `${baseUrl}${path}`;
}
