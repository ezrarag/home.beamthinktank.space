const POST_AUTH_REDIRECT_KEY = "beam:postAuthRedirect";

export function rememberPostAuthRedirect(path: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, path);
}

export function consumePostAuthRedirect(): string | null {
  if (typeof window === "undefined") return null;
  const path = window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  if (path) {
    window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  }
  return path;
}

export function clearPostAuthRedirect() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
}
