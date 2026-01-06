window.CyberlensStorage = (function () {
  const DEFAULT_SETTINGS = {
    apiKey: "",
    language: "ru",
    theme: "light"
  };

  async function getSettings() {
    const data = await browser.storage.local.get(DEFAULT_SETTINGS);
    return {
      apiKey: String(data.apiKey || ""),
      language: String(data.language || "ru"),
      theme: String(data.theme || "light")
    };
  }

  async function setSettings(partial) {
    const current = await getSettings();
    const next = Object.assign({}, current, partial || {});
    await browser.storage.local.set(next);
    return next;
  }

  async function getLastResult() {
    const data = await browser.storage.local.get({ lastResult: null });
    return data.lastResult || null;
  }

  async function setLastResult(result) {
    await browser.storage.local.set({ lastResult: result });
  }

  return {
    getSettings,
    setSettings,
    getLastResult,
    setLastResult
  };
})();
