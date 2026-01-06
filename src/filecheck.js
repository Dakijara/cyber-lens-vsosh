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

function formatBytes(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = num;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function arrayBufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

async function sha256File(file) {
  const MAX_SIZE = 200*1024*1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`Файл слишком большой для обработки в браузере: ${formatBytes(file.size)} (лимит ${formatBytes(MAX_SIZE)}).`);
  }

  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return arrayBufferToHex(digest);
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
    result.type === "hash" ? "HASH" :
    result.type === "domain" ? "DOMAIN" :
    result.type === "url" ? "URL" : String(result.type || "RESULT");

  const metaLines = [];
  if (result.meta && typeof result.meta === "object") {
    if (result.meta.fileName) metaLines.push(`Файл: ${result.meta.fileName}`);
    if (Number.isFinite(result.meta.fileSize)) metaLines.push(`Размер: ${formatBytes(result.meta.fileSize)}`);
  }

  txt.textContent =
    `${kind}: ${result.input}\n` +
    (metaLines.length ? (metaLines.join("\n") + "\n") : "") +
    `Вердикт: ${result.label}\n` +
    `Zone: ${result.zone ?? "N/A"}\n` +
    `Время: ${result.ts ?? ""}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadThemeFromStorage();
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.theme) applyTheme(changes.theme.newValue);
  });

  document.getElementById("backToPopup").addEventListener("click", async (e) => {
    e.preventDefault();
    await browser.runtime.openOptionsPage();
  });

  const fileInput = document.getElementById("fileInput");
  const fileInfo = document.getElementById("fileInfo");
  const hashBtn = document.getElementById("hashBtn");
  const checkBtn = document.getElementById("checkBtn");
  const shaOut = document.getElementById("sha256Out");

  let selectedFile = null;
  let computedSha256 = "";

  // Подтягиваем последний результат
  try {
    const last = await send({ type: "GET_LAST_RESULT" });
    renderResult(last);
  } catch {
    // ignore
  }

  fileInput.addEventListener("change", () => {
    const f = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    selectedFile = f;
    computedSha256 = "";
    shaOut.value = "";

    if (!selectedFile) {
      fileInfo.textContent = "Файл не выбран";
      hashBtn.disabled = true;
      checkBtn.disabled = true;
      return;
    }

    fileInfo.textContent = `${selectedFile.name} (${formatBytes(selectedFile.size)})`;
    hashBtn.disabled = false;
    checkBtn.disabled = true;
  });

  hashBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    try {
      setStatus("Рассчёт SHA-256...");
      computedSha256 = await sha256File(selectedFile);
      shaOut.value = computedSha256;
      setStatus("SHA-256 готов.");
      checkBtn.disabled = false;
    } catch (e) {
      setStatus("");
      renderResult({ error: true, message: String((e && e.message) || e) });
    }
  });

  checkBtn.addEventListener("click", async () => {
    if (!selectedFile || !computedSha256) return;

    try {
      setStatus("Отправление хэша на проверку...");
      const res = await send({
        type: "CHECK_HASH",
        hash: computedSha256,
        meta: {
          origin: "file",
          fileName: selectedFile.name,
          fileSize: selectedFile.size
        }
      });

      setStatus("");
      renderResult(res);
    } catch (e) {
      setStatus("");
      renderResult({ error: true, message: String((e && e.message) || e) });
    }
  });
});
