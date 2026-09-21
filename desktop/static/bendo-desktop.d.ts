export {};

declare global {
  interface Window {
    bendoDesktop?: {
      platform: string;
      getAppUrl: () => Promise<string>;
      reloadBendo: () => Promise<{ ok: boolean }>;
    };
  }
}
