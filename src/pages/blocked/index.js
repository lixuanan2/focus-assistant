import { applyI18n, t } from "../../lib/i18n.js";

const blockedUrl = document.querySelector("#blockedUrl");
const openOptionsButton = document.querySelector("#openOptionsButton");

function init() {
  applyI18n();
  document.title = t("blockedPageTitle");

  const params = new URLSearchParams(window.location.search);
  blockedUrl.textContent = params.get("url") || "-";
}

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

init();
