const MENU_ID_CHECK_SELECTION = "cyberlens_check_selection";
const MENU_ID_CHECK_LINK = "cyberlens_check_link";

function ensureMenus() {
  try { browser.contextMenus.removeAll(); } catch {}

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

browser.runtime.onStartup && browser.runtime.onStartup.addListener(() => {
  ensureMenus();
});

browser.contextMenus.onClicked.addListener(async (info) => {
  try {
    const settings = await window.CyberlensStorage.getSettings();
    const apiKey = settings.apiKey;

    if (info.menuItemId === MENU_ID_CHECK_LINK && info.linkUrl) {
      const url = window.CyberlensUtils.normalizeUrl(info.linkUrl);
      const result = await window.CyberlensAPI.checkUrl(url, apiKey);
      await saveAndNotify(result, true);
      return;
    }

    if (info.menuItemId === MENU_ID_CHECK_SELECTION && info.selectionText) {
      const text = String(info.selectionText).trim();
      const url = window.CyberlensUtils.normalizeUrl(text);

      if (!window.CyberlensUtils.isProbablyUrl(url)) {
        await notify("КиберЛинза", "Выделенный текст не похож на URL. Откройте popup и проверьте вручную.");
        return;
      }

      const result = await window.CyberlensAPI.checkUrl(url, apiKey);
      await saveAndNotify(result, true);
      return;
    }
  } catch (e) {
    await notify("КиберЛинза: ошибка", String((e && e.message) || e));
  }
});

browser.runtime.onMessage.addListener(async (msg) => {
  try {
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "CHECK_URL") {
      const settings = await window.CyberlensStorage.getSettings();
      const url = window.CyberlensUtils.normalizeUrl(msg.url || "");
      if (!window.CyberlensUtils.isProbablyUrl(url)) throw new Error("Некорректный URL.");
      const result = await window.CyberlensAPI.checkUrl(url, settings.apiKey);
      await saveAndNotify(result, false);
      return result;
    }

    if (msg.type === "CHECK_HASH") {
      const settings = await window.CyberlensStorage.getSettings();
      const hash = String(msg.hash || "").trim().toLowerCase();

      if (!window.CyberlensUtils.isProbablyHash(hash)) {
        throw new Error("Хэш должен быть MD5(32) / SHA1(40) / SHA256(64) в hex.");
      }

      const result = await window.CyberlensAPI.checkHash(hash, settings.apiKey);

      // Если пришли meta-данные (например, о файле) — аккуратно добавим
      if (msg.meta && typeof msg.meta === "object") {
        const fileName = msg.meta.fileName ? String(msg.meta.fileName).slice(0, 260) : "";
        const fileSize = Number.isFinite(msg.meta.fileSize) ? Number(msg.meta.fileSize) : null;

        result.meta = {
          origin: msg.meta.origin ? String(msg.meta.origin).slice(0, 32) : "unknown",
          fileName,
          fileSize
        };
      }

      await saveAndNotify(result, false);
      return result;
    }

    if (msg.type === "GET_LAST_RESULT") {
      return await window.CyberlensStorage.getLastResult();
    }

    if (msg.type === "PING") {
      return { ok: true, ts: window.CyberlensUtils.nowIso() };
    }
  } catch (e) {
    return {
      error: true,
      message: String((e && e.message) || e),
      status: e && e.status ? e.status : undefined,
      requestUrl: e && e.url ? e.url : undefined
    };
  }
});

async function saveAndNotify(result, showNotification) {
  const stored = Object.assign({}, result, { ts: window.CyberlensUtils.nowIso() });
  await window.CyberlensStorage.setLastResult(stored);

  if (showNotification) {
    await notify("КиберЛинза", formatVerdictMessage(stored));
  }
}

function formatVerdictMessage(result) {
  const prefix =
    result.type === "url" ? "URL" :
    result.type === "hash" ? "HASH" :
    result.type === "domain" ? "DOMAIN" : "RESULT";

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
    // если уведомления запрещены — игнорируем
  }
}
