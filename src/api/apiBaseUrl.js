function stripTrailingSlash(url) {
  return url.replace(/\/$/, "");
}

function isAbsoluteHttpUrl(url) {
  return /^https?:\/\//i.test(url);
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

function shouldUseConfiguredBaseUrlInBrowser(configuredBaseUrl) {
  if (!configuredBaseUrl || typeof window === "undefined") {
    return false;
  }

  const { hostname, origin } = window.location;
  if (isLocalHost(hostname)) {
    return true;
  }

  // 프로덕션에서는 Netlify 리다이렉트(/api/*)를 기본값으로 사용합니다.
  // 환경변수에 Render 절대 URL이 남아 있으면 CORS가 발생하므로 같은 오리진일 때만 허용합니다.
  if (isAbsoluteHttpUrl(configuredBaseUrl)) {
    try {
      return new URL(configuredBaseUrl).origin === origin;
    } catch {
      return false;
    }
  }

  return true;
}

export function resolveApiBaseUrl() {
  const configuredBaseUrl = getConfiguredBaseUrl();
  if (configuredBaseUrl && shouldUseConfiguredBaseUrlInBrowser(configuredBaseUrl)) {
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
