import { http, setAuthToken } from "./http";

/**
 * JWT 로그인
 */
export async function login({ biz_no, password }) {
  const data = await http("/auth/login/", {
    method: "POST",
    body: { biz_no, password },
    auth: false,
  });
  console.log(data);
  const access = data?.access;
  const refresh = data?.refresh;
  const user = data?.company ?? null;

  if (!access) throw new Error("로그인 실패: access token 없음");

  setAuthToken(access);
  return { access, refresh, user };
}

/**
 * 로그아웃
 */
export async function logout() {
  setAuthToken(null);
}
