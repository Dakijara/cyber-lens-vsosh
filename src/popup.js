async function send(message) {
  return await browser.runtime.sendMessage(message);
}

function setStatus(text) {
  const el = document.getElementById("statusLine");
  el.textContent = text || "";
}

function applyTheme(theme) {
  const t = (theme === "dark") ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
}

async function loadThemeFromStorage() {
  const data = await browser.storage.local.get({ theme: "light" });
  applyTheme(data.theme);
}

function renderResult(result) {
  const box = document.getElementById("resultBox");
  const txt = document.getElementById("resultText");

  box.classList.remove("ok", "bad", "unk", "filled");

  if (!result) {
    txt.textContent = "Нет данных";
    return;
  }

  if (result.error) {
    box.classList.add("unk", "filled");
    txt.textContent = `Ошибка: ${result.message || "неизвестно"}`;
    return;
  }

  const verdictClass =
    result.verdict === "safe" ? "ok" :
    result.verdict === "dangerous" ? "bad" : "unk";

  box.classList.add(verdictClass, "filled");

  const kind =
    result.type === "url" ? "URL" :
    result.type === "hash" ? "HASH" :
    result.type === "domain" ? "DOMAIN" : String(result.type || "RESULT");

  const metaLines = [];
  if (result.meta && typeof result.meta === "object") {
    if (result.meta.fileName) metaLines.push(`Файл: ${result.meta.fileName}`);
    if (Number.isFinite(result.meta.fileSize)) metaLines.push(`Размер: ${result.meta.fileSize} байт`);
  }

  txt.textContent =
    `${kind}: ${result.input}\n` +
    (metaLines.length ? (metaLines.join("\n") + "\n") : "") +
    `Вердикт: ${result.label}\n` +
    `Zone: ${result.zone ?? "N/A"}\n` +
    `Время: ${result.ts ?? ""}`;
}

function openQuickOverlay() {
  const ov = document.getElementById("quickOverlay");
  ov.classList.add("isOpen");
  ov.setAttribute("aria-hidden", "false");
}

function closeQuickOverlay() {
  const ov = document.getElementById("quickOverlay");
  ov.classList.remove("isOpen");
  ov.setAttribute("aria-hidden", "true");
}

function setQsStatus(text) {
  const el = document.getElementById("qsStatus");
  el.textContent = text || "";
}

async function loadQuickSettingsToOverlay() {
  const data = await browser.storage.local.get({
    apiKey: "",
    language: "ru",
    theme: "light"
  });

  document.getElementById("qsApiKey").value = data.apiKey || "";
  document.getElementById("qsLanguage").value = data.language || "ru";
  document.getElementById("qsTheme").value = data.theme || "light";
  setQsStatus("");
}

async function saveQuickSettingsFromOverlay() {
  const apiKey = document.getElementById("qsApiKey").value.trim();
  const language = document.getElementById("qsLanguage").value;
  const theme = document.getElementById("qsTheme").value;

  await browser.storage.local.set({ apiKey, language, theme });
  setQsStatus("Сохранено.");
}

async function testApiKeyFromOverlay() {
  setQsStatus("Проверка ключа...");

  const apiKey = document.getElementById("qsApiKey").value.trim();
  await browser.storage.local.set({ apiKey });

  const testSha256Empty =
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  const res = await send({ type: "CHECK_HASH", hash: testSha256Empty });

  if (res && res.error) {
    if (res.status === 401) {
      setQsStatus("2 — некорректный API-ключ (HTTP 401).");
    } else {
      setQsStatus(`Не удалось проверить ключ: ${res.message}${res.status ? ` (HTTP ${res.status})` : ""}`);
    }
    return;
  }

  setQsStatus("1 — корректный API-ключ (доступ к API подтвержден).");
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadThemeFromStorage();

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.theme) applyTheme(changes.theme.newValue);
  });

  const openOptionsEl = document.getElementById("openOptions");
if (openOptionsEl) {
  openOptionsEl.addEventListener("click", async (e) => {
    e.preventDefault();
    await browser.runtime.openOptionsPage();
  });
}

  document.getElementById("openQuickSettings").addEventListener("click", async () => {
    await loadQuickSettingsToOverlay();
    openQuickOverlay();
  });

  document.getElementById("quickClose").addEventListener("click", closeQuickOverlay);
  document.getElementById("quickBackdrop").addEventListener("click", closeQuickOverlay);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeQuickOverlay();
  });

  document.getElementById("qsTheme").addEventListener("change", async () => {
    const theme = document.getElementById("qsTheme").value;
    await browser.storage.local.set({ theme });
  });

  document.getElementById("qsLanguage").addEventListener("change", async () => {
    const language = document.getElementById("qsLanguage").value;
    await browser.storage.local.set({ language });
  });

  document.getElementById("qsSave").addEventListener("click", saveQuickSettingsFromOverlay);
  document.getElementById("qsTestKey").addEventListener("click", testApiKeyFromOverlay);

  document.getElementById("qsMoreOptions").addEventListener("click", async (e) => {
    e.preventDefault();
    closeQuickOverlay();
    await browser.runtime.openOptionsPage();
  });

  document.getElementById("openFileCheckBtn").addEventListener("click", async () => {
    const url = browser.runtime.getURL("filecheck.html");
    await browser.tabs.create({ url });
  });

  try {
    const last = await send({ type: "GET_LAST_RESULT" });
    renderResult(last);
  } catch {
    renderResult({ error: true, message: "Не удалось получить последний результат." });
  }

  document.getElementById("checkUrlBtn").addEventListener("click", async () => {
    const url = document.getElementById("urlInput").value;
    setStatus("Проверяю...");
    const res = await send({ type: "CHECK_URL", url });
    setStatus("");
    renderResult(res);
  });

  document.getElementById("checkHashBtn").addEventListener("click", async () => {
    const hash = document.getElementById("hashInput").value;
    setStatus("Проверяю...");
    const res = await send({ type: "CHECK_HASH", hash });
    setStatus("");
    renderResult(res);
  });
});
