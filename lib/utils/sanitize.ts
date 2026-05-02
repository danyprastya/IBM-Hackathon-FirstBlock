/* eslint-disable @typescript-eslint/no-explicit-any */
// XSS sanitization utilities
// Sanitize user input before storing to Firestore

/**
 * Basic HTML entity encoding to prevent XSS attacks
 * Converts dangerous characters to HTML entities
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize text input by trimming and limiting length
 * Also removes null bytes and control characters
 */
export function sanitizeText(input: string, maxLength: number = 5000): string {
  return input
    .replace(/\0/g, "") // Remove null bytes
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters except newlines/tabs
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize user object before storing
 * Applies sanitization to all string fields
 */
export function sanitizeUserInput<T extends Record<string, any>>(
  input: T
): T {
  const sanitized = { ...input } as any;

  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeText(sanitized[key]);
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) =>
        typeof item === "string" ? sanitizeText(item) : item
      );
    } else if (
      typeof sanitized[key] === "object" &&
      sanitized[key] !== null
    ) {
      sanitized[key] = sanitizeUserInput(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize hex color code
 */
export function sanitizeColor(color: string): string {
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;
  if (!hexPattern.test(color)) {
    return "#6366f1"; // Default to indigo if invalid
  }
  return color.toLowerCase();
}

// Made with Bob
