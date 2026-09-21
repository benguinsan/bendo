const urlEl = document.getElementById("url");
const reasonEl = document.getElementById("reason");
const retryBtn = document.getElementById("retry");

const params = new URLSearchParams(window.location.search);
const reason = params.get("reason");
if (reasonEl && reason) {
  reasonEl.textContent = reason;
}

const api = window.bendoDesktop;

if (api?.getAppUrl && urlEl) {
  void api.getAppUrl().then((url) => {
    urlEl.textContent = url;
  });
}

if (retryBtn && api?.reloadBendo) {
  retryBtn.addEventListener("click", () => {
    retryBtn.disabled = true;
    retryBtn.textContent = "Checking…";
    void api.reloadBendo().finally(() => {
      retryBtn.disabled = false;
      retryBtn.textContent = "Retry";
    });
  });
}
