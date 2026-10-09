/** Electron preload API when Bendo runs inside the desktop shell. */
type BendoDesktopModelConfig = {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
};

type BendoDesktopApi = {
  platform: string;
  getAppUrl: () => Promise<string>;
  reloadBendo: () => Promise<{ ok: boolean }>;
  saveModelConfig: (
    config: BendoDesktopModelConfig
  ) => Promise<{ ok: true } | { ok: false; error: string; retryable: boolean }>;
  loadModelConfig: () => Promise<
    | { ok: true; config: BendoDesktopModelConfig }
    | { ok: true; config: null }
    | { ok: false; error: string }
  >;
};

interface Window {
  bendoDesktop?: BendoDesktopApi;
}
