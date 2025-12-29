// /src/api.js

import { classifyOpentip } from "./utils.js";

const BASE = "https://opentip.kaspersky.com/api/v1";

// Универсальный fetch с ключом
async function opentipFetch(path, apiKey) {
  if (!apiKey) {
    throw new Error("Не задан API-ключ. Откройте настройки расширения и вставьте ключ OpenTIP.");
  }

  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "accept": "application/json"
    }
  });

  // OpenTIP часто возвращает JSON. Если вернёт текст — обработаем.
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(`Ошибка OpenTIP: ${msg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function checkUrl(url, apiKey) {
  const encoded = encodeURIComponent(url);
  const data = await opentipFetch(`/search/url?request=${encoded}`, apiKey);
  const cls = classifyOpentip(data);

  return {
    type: "url",
    input: url,
    verdict: cls.verdict,
    label: cls.label,
    zone: cls.zone,
    raw: data
  };
}

export async function checkHash(hash, apiKey) {
  const encoded = encodeURIComponent(hash);
  const data = await opentipFetch(`/search/hash?request=${encoded}`, apiKey);
  const cls = classifyOpentip(data);

  return {
    type: "hash",
    input: hash,
    verdict: cls.verdict,
    label: cls.label,
    zone: cls.zone,
    raw: data
  };
}
