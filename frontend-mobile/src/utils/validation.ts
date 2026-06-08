const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanText(value: string): string {
  return value.trim();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function hasText(value: string): boolean {
  return value.trim().length > 0;
}

