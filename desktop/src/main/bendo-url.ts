/** Default local Bendo (Docker / Next). Override with BENDO_APP_URL. */
export function getBendoAppUrl(): string {
  return process.env.BENDO_APP_URL?.trim() || "http://127.0.0.1:3000";
}

// export function isSmokeMode(): boolean {
//   return process.env.DESKTOP_SMOKE === "1";
// }
