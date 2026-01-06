window.CyberlensAPI = (function () {
  const BASE = "https://opentip.kaspersky.com/api/v1";

  function pickMessageFromBody(data) {
    if (!data) return "";
    return (
      data.message ||
      data.error ||
      data.Message ||
      data.Error ||
      data.detail ||
      data.raw ||
      ""
    );
  }

  async function opentipFetch(path, apiKey) {
    if (!apiKey) {
      throw new Error("Не задан API-ключ. Откройте настройки расширения и вставьте ключ OpenTIP.");
    }

    const url = `${BASE}${path}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
        "accept": "application/json"
      }
    });

    const text = await res.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    // 404 = нет данных → считаем "Grey/Неизвестно"
    if (res.status === 404) {
      return { Zone: "Grey", _notFound: true, _httpStatus: 404 };
    }

    if (!res.ok) {
      const msg = pickMessageFromBody(data);
      const suffix = msg ? ` | Ответ: ${String(msg).slice(0, 400)}` : "";
      const err = new Error(`Ошибка OpenTIP: HTTP ${res.status}${suffix}`);
      err.status = res.status;
      err.data = data;
      err.url = url;
      throw err;
    }

    return data;
  }

  async function checkDomain(domain, apiKey) {
    const d = String(domain || "").trim().toLowerCase();
    const encoded = encodeURIComponent(d);
    const data = await opentipFetch(`/search/domain?request=${encoded}`, apiKey);
    const cls = window.CyberlensUtils.classifyOpentip(data);

    return {
      type: "domain",
      input: d,
      verdict: cls.verdict,
      label: cls.label,
      zone: cls.zone,
      raw: data
    };
  }

  async function checkUrl(url, apiKey) {
    // В режиме "1 запрос" мы проверяем только домен (host).
    // Это устойчиво и не вызывает 400 на /search/url.
    let host = "";

    try {
      const u = new URL(url);
      host = u.host;
    } catch {
      // если передали не URL, а домен — используем как есть
      host = String(url || "").trim();
    }

    if (!host) {
      throw new Error("Пустой URL/домен.");
    }

    return await checkDomain(host, apiKey);
  }

  async function checkHash(hash, apiKey) {
    const encoded = encodeURIComponent(hash);
    const data = await opentipFetch(`/search/hash?request=${encoded}`, apiKey);
    const cls = window.CyberlensUtils.classifyOpentip(data);

    return {
      type: "hash",
      input: hash,
      verdict: cls.verdict,
      label: cls.label,
      zone: cls.zone,
      raw: data
    };
  }

  return {
    checkUrl,
    checkHash
  };
})();
