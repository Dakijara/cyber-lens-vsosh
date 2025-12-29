// /src/background.js

import { getSettings, setLastResult, getLastResult } from "./storage.js";
import { checkUrl, checkHash } from "./api.js";
import { normalizeUrl, isProbablyUrl, isProbablyHash, nowIso } from "./utils.js";

const MENU_ID_CHECK_SELECTION = "cyberlens_check_selection";
const MENU_ID_CHECK_LINK = "cyberlens_check_link";

async function ensureMenus() {
  // На всякий случай убираем старые
  try { await browser.contextMenus.removeAll(); } catch {}

  browser.contextMenus.create({
    id: MENU_ID_CHECK_SELECTION,
    title: "КиберЛинза: проверить выделенное как URL",
    contexts: ["selection"]
  });

  browser.contextMenus.create({
    id: MENU_ID_CHECK_LINK,
    title: "КиберЛинза: проверить ссылку",
    contexts: ["link"]
  });
}

browser.runtime.onInstalled.addListener(() => {
  ensureMenus();
});

browser.runtime.onStartup?.addListener(() => {
  ensureMenus();
});

browser.contextMenus.onClicked.addListener(async (info) => {
  try {
    const settings = await getSettings();
    const apiKey = settings.apiKey;

    if (info.menuItemId === MENU_ID_CHECK_LINK && info.linkUrl) {
      const url = normalizeUrl(info.linkUrl);
      const result = await checkUrl(url, apiKey);
      await saveAndNotify(result);
      return;
    }

    if (info.menuItemId === MENU_ID_CHECK_SELECTION && info.selectionText) {
      const text = String(info.selectionText).trim();
      const url = normalizeUrl(text);

      if (!isProbablyUrl(url)) {
        await notify("КиберЛинза", "Выделенный текст не похож на URL. Откройте popup и проверьте вручную.");
        return;
      }

      const result = await checkUrl(url, apiKey);
      await saveAndNotify(result);
      return;
    }
  } catch (e) {
    await notify("КиберЛинза: ошибка", String(e?.message || e));
  }
});

browser.runtime.onMessage.addListener(async (msg) => {
  // Сообщения от popup/options
  try {
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "CHECK_URL") {
      const settings = await getSettings();
      const url = normalizeUrl(msg.url || "");
      if (!isProbablyUrl(url)) throw new Error("Некорректный URL.");
      const result = await checkUrl(url, settings.apiKey);
      await saveAndNotify(result, false);
      return result;
    }

    if (msg.type === "CHECK_HASH") {
      const settings = await getSettings();
      const hash = String(msg.hash || "").trim();
      if (!isProbablyHash(hash)) throw new Error("Хэш должен быть MD5(32) / SHA1(40) / SHA256(64) в hex.");
      const result = await checkHash(hash, settings.apiKey);
      await saveAndNotify(result, false);
      return result;
    }

    if (msg.type === "GET_LAST_RESULT") {
      return await getLastResult();
    }

    if (msg.type === "PING") {
      return { ok: true, ts: nowIso() };
    }
  } catch (e) {
    return { error: true, message: String(e?.message || e) };
  }
});

async function saveAndNotify(result, showNotification = true) {
  const stored = {
    ...result,
    ts: nowIso()
  };
  await setLastResult(stored);

  if (showNotification) {
    const title = "КиберЛинза";
    const message = formatVerdictMessage(result);
    await notify(title, message);
  }
}

function formatVerdictMessage(result) {
  const prefix = result.type === "url" ? "URL" : "HASH";
  const zone = result.zone ? ` (Zone: ${result.zone})` : "";
  return `${prefix}: ${result.input}\nВердикт: ${result.label}${zone}`;
}

async function notify(title, message) {
  try {
    await browser.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title,
      message
    });
  } catch {
    // notifications могут быть отключены — тогда просто молча игнорируем
  }
}
