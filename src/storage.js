// /src/storage.js
// Хранение настроек в browser.storage.local.
// Важно: ключ API не хардкодим в коде/репозитории.

const DEFAULT_SETTINGS = {
  apiKey: "",
  language: "ru",
  theme: "light"
};

export async function getSettings() {
  const data = await browser.storage.local.get(DEFAULT_SETTINGS);
  return {
    apiKey: String(data.apiKey || ""),
    language: String(data.language || "ru"),
    theme: String(data.theme || "light")
  };
}

export async function setSettings(partial) {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await browser.storage.local.set(next);
  return next;
}

export async function clearApiKey() {
  await browser.storage.local.set({ apiKey: "" });
}

export async function getLastResult() {
  const data = await browser.storage.local.get({ lastResult: null });
  return data.lastResult ?? null;
}

export async function setLastResult(result) {
  await browser.storage.local.set({ lastResult: result });
}
