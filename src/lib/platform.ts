/** Small helpers for Apple devices (iPhone, iPad, Mac) where browser behaviour differs. */

export function isBrowser() {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

export function isIOS() {
  if (!isBrowser()) return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Macintosh but has touch points.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isSafari() {
  if (!isBrowser()) return false;
  const ua = navigator.userAgent;
  return /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
}

export function isApple() {
  if (!isBrowser()) return false;
  return isIOS() || /Mac/.test(navigator.platform ?? navigator.userAgent);
}

export function isStandalone() {
  if (!isBrowser()) return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches === true || nav.standalone === true;
}

export function supportsCameraStream() {
  return isBrowser() && typeof navigator.mediaDevices?.getUserMedia === "function";
}
