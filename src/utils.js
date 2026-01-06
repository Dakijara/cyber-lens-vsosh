window.CyberlensUtils = (function () {
  function normalizeUrl(input) {
    if (!input) return "";
    const s = String(input).trim();

    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)) return `https://${s}`;
    if (s.startsWith("//")) return `https:${s}`;
    return s;
  }

  function isProbablyUrl(input) {
    const s = String(input || "").trim();
    if (!s) return false;
    try {
      const u = new URL(normalizeUrl(s));
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  function isProbablyHash(input) {
    const s = String(input || "").trim().toLowerCase();
    return /^[a-f0-9]{32}$/.test(s) || /^[a-f0-9]{40}$/.test(s) || /^[a-f0-9]{64}$/.test(s);
  }

  function classifyOpentip(data) {
    const zone =
      (data && (data.Zone || data.zone)) ||
      (data && data.Data && (data.Data.Zone || data.Data.zone)) ||
      (data && data.data && (data.data.Zone || data.data.zone)) ||
      null;

    const zoneStr = zone ? String(zone).toLowerCase() : "";

    if (zoneStr === "red") return { verdict: "dangerous", label: "Опасно", zone: "Red" };
    if (zoneStr === "green") return { verdict: "safe", label: "Безопасно", zone: "Green" };
    if (zoneStr === "yellow") return { verdict: "unknown", label: "Подозрительно/неоднозначно", zone: "Yellow" };
    if (zoneStr === "grey" || zoneStr === "gray") return { verdict: "unknown", label: "Неизвестно", zone: "Grey" };

    return { verdict: "unknown", label: "Неизвестно", zone: zone || "N/A" };
  }

  function nowIso() {
    return new Date().toISOString();
  }

  return {
    normalizeUrl,
    isProbablyUrl,
    isProbablyHash,
    classifyOpentip,
    nowIso
  };
})();
