import React, { useState } from "react";

export default function ApiConnectionTest({ apiBaseUrl }) {
  const [status, setStatus] = useState("idle"); // idle | testing | ok | fail
  const [detail, setDetail] = useState("");

  const test = async () => {
    setStatus("testing");
    setDetail("");
    try {
      const res = await fetch(`${apiBaseUrl}/health`, { method: "GET" });
      if (res.ok) {
        setStatus("ok");
        setDetail(`${apiBaseUrl}/health → ${res.status} OK`);
      } else {
        setStatus("fail");
        setDetail(`${apiBaseUrl}/health → ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      setStatus("fail");
      setDetail(`연결 실패: ${e.message}`);
    }
  };

  return (
    <div className="production-api-test-card">
      <div className="production-api-test-row">
        <span className="production-api-test-title">API 연결 테스트</span>
        <span className="production-api-test-url">{apiBaseUrl}</span>
        <button
          type="button"
          onClick={test}
          disabled={status === "testing"}
          className="production-btn production-btn-dark production-api-test-btn"
        >
          {status === "testing" ? "테스트 중..." : "연결 테스트하기"}
        </button>
      </div>
      {detail && (
        <div className={`production-api-test-detail ${status === "ok" ? "is-ok" : "is-fail"}`}>
          {status === "ok" ? "✅ " : "❌ "}
          {detail}
        </div>
      )}
    </div>
  );
}
