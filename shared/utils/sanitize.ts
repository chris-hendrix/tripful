/**
 * Strips C0/C1 control characters from a string, preserving common whitespace
 * (newline, carriage return, tab). Removes null bytes, escape sequences, and
 * other invisible control characters that could cause display or security issues.
 *
 * C0 range: U+0000–U+001F (except \t \n \r)
 * C1 range: U+007F–U+009F
 */
export function stripControlChars(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
}
