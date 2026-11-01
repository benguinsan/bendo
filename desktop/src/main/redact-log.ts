const URL_TOKEN_PATTERN = /([?&](?:token|access_token)=)[^&#\s]+/gi;

/** Mask URL query tokens before a line is written to the runtime log file. */
export function redactSecrets(text: string): string {
  return text.replace(URL_TOKEN_PATTERN, "$1[REDACTED]");
}
