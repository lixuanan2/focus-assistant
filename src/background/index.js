import { createBackgroundController } from "./controller.js";

const controller = createBackgroundController();

chrome.runtime.onInstalled.addListener(() => {
  void controller.handleInstalled();
});

chrome.runtime.onStartup.addListener(() => {
  void controller.loadState();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  void controller.handleStorageChanged(changes, areaName);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void controller.handleTabUpdated(tabId, changeInfo, tab);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  void controller.handleAlarm(alarm);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void controller.handleMessage(message)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));

  return true;
});
