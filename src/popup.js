// /src/popup.js

async function send(message) {
  return await browser.runtime.sendMessage(message);
}

function setStatus(text) {
  const el = document.getElementById("statusLine");
  el.textContent = text || "";
}

function renderResult(result) {
  const box = document.getElementById("resultBox");
  const txt = document.getElementById("resultText");

  if (!result) {
    txt.textContent = "Нет данных";
    box.classList.remove("ok", "bad", "unk");
    return;
  }

  if (result.error) {
    txt.textContent = `Ошибка: ${result.message || "неизвестно"}`;
    box.classList.remove("ok", "bad");
    box.classList.add("unk");
    return;
  }

  const verdictClass =
    result.verdict === "safe" ? "ok" :
    result.verdict === "dangerous" ? "bad" : "unk";

  box.classList.remove("ok", "bad", "unk");
  box.classList.add(verdictClass);

  txt.textContent =
    `${result.type === "url" ? "URL" : "HASH"}: ${result.input}\n` +
    `Вердикт: ${result.label}\n` +
    `Zone: ${result.zone ?? "N/A"}\n` +
    `Время: ${result.ts ?? ""}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("openOptions").addEventListener("click", async (e) => {
    e.preventDefault();
    await browser.runtime.openOptionsPage();
  });

  // Показать последний результат
  try {
    const last = await send({ type: "GET_LAST_RESULT" });
    renderResult(last);
  } catch {
    renderResult({ error: true, message: "Не удалось получить последний результат." });
  }

  document.getElementById("checkUrlBtn").addEventListener("click", async () => {
    const url = document.getElementById("urlInput").value;
    setStatus("Проверяю URL...");
    const res = await send({ type: "CHECK_URL", url });
    setStatus("");
    renderResult(res?.error ? res : res);
  });

  document.getElementById("checkHashBtn").addEventListener("click", async () => {
    const hash = document.getElementById("hashInput").value;
    setStatus("Проверяю хэш...");
    const res = await send({ type: "CHECK_HASH", hash });
    setStatus("");
    renderResult(res?.error ? res : res);
  });
});
