let authToken = null;

/**
 * JWT Access Token 저장/삭제
 */
export function setAuthToken(token) {
  authToken = token;
}

/**
 * 공통 HTTP 요청 함수
 */
export async function http(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json"};
  console.log(`auth & authToken:`, auth, authToken);
  authToken = localStorage.getItem("token"); // 세션/쿠키 쓰면 이 부분 제거
  if (auth && authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  console.log(`headers:`, headers);
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}${path}`,
    {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

export const apiFetch = http;
