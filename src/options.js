// /src/options.js

import { getSettings, setSettings } from "./storage.js";

async function send(message) {
  return await browser.runtime.sendMessage(message);
}

function setStatus(text) {
  document.getElementById("status").textContent = text || "";
}

document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyEl = document.getElementById("apiKey");
  const langEl = document.getElementById("language");
  const themeEl = document.getElementById("theme");

  const settings = await getSettings();
  apiKeyEl.value = settings.apiKey;
  langEl.value = settings.language;
  themeEl.value = settings.theme;

  document.getElementById("saveBtn").addEventListener("click", async () => {
    await setSettings({
      apiKey: apiKeyEl.value.trim(),
      language: langEl.value,
      theme: themeEl.value
    });
    setStatus("Сохранено.");
  });

  document.getElementById("testBtn").addEventListener("click", async () => {
    // Простейшая проверка: пробуем пингнуть фоновый скрипт и сделать тестовый запрос по URL
    setStatus("Проверяю ключ...");

    await setSettings({ apiKey: apiKeyEl.value.trim() });

    const res = await send({ type: "CHECK_URL", url: "https://example.com" });
    if (res?.error) {
      setStatus(`Ошибка: ${res.message}`);
    } else {
      setStatus(`Успешно. Вердикт для example.com: ${res.label} (Zone: ${res.zone ?? "N/A"})`);
    }
  });
});
