function setStatus(text) {
  document.getElementById("status").textContent = text || "";
}

function applyTheme(theme) {
  const t = (theme === "dark") ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
}

async function getLocalSettings() {
  const data = await browser.storage.local.get({
    apiKey: "",
    language: "ru",
    theme: "light"
  });
  return data;
}

async function setLocalSettings(patch) {
  await browser.storage.local.set(patch);
}

async function send(message) {
  return await browser.runtime.sendMessage(message);
}

document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyEl = document.getElementById("apiKey");
  const langEl = document.getElementById("language");
  const themeEl = document.getElementById("theme");

  const s = await getLocalSettings();
  apiKeyEl.value = s.apiKey || "";
  langEl.value = s.language || "ru";
  themeEl.value = s.theme || "light";
  applyTheme(s.theme);

  themeEl.addEventListener("change", async () => {
    applyTheme(themeEl.value);
    await setLocalSettings({ theme: themeEl.value });
  });

  document.getElementById("saveBtn").addEventListener("click", async () => {
    await setLocalSettings({
      apiKey: apiKeyEl.value.trim(),
      language: langEl.value,
      theme: themeEl.value
    });
    setStatus("Сохранено.");
  });

  document.getElementById("testBtn").addEventListener("click", async () => {
    setStatus("Проверка API-ключа...");
    await setLocalSettings({ apiKey: apiKeyEl.value.trim() });

    const testSha256Empty =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    const res = await send({ type: "CHECK_HASH", hash: testSha256Empty });

    if (res && res.error) {
      setStatus("2 — некорректный API-ключ");
      return;
    }
    setStatus("1 — корректный API-ключ");
  });
});
