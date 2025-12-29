// /src/utils.js

export function normalizeUrl(input) {
  if (!input) return "";
  const s = String(input).trim();

  // Если пользователь выделил просто домен без схемы — добавим https://
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)) return `https://${s}`;

  // Если начинается с //example.com
  if (s.startsWith("//")) return `https:${s}`;

  return s;
}

export function isProbablyUrl(input) {
  const s = String(input || "").trim();
  if (!s) return false;
  try {
    const u = new URL(normalizeUrl(s));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isProbablyHash(input) {
  const s = String(input || "").trim().toLowerCase();
  // MD5(32), SHA1(40), SHA256(64)
  return /^[a-f0-9]{32}$/.test(s) || /^[a-f0-9]{40}$/.test(s) || /^[a-f0-9]{64}$/.test(s);
}

// Приводим ответ OpenTIP к вашему формату: safe/dangerous/unknown
export function classifyOpentip(data) {
  // Пытаемся найти "Zone" в разных вариантах структур
  const zone =
    data?.Zone ??
    data?.zone ??
    data?.Data?.Zone ??
    data?.data?.Zone ??
    data?.data?.zone ??
    null;

  const zoneStr = zone ? String(zone).toLowerCase() : "";

  if (zoneStr === "red") return { verdict: "dangerous", label: "Опасно", zone: "Red" };
  if (zoneStr === "green") return { verdict: "safe", label: "Безопасно", zone: "Green" };

  // Иногда встречаются "yellow/grey/gray" или просто отсутствие данных
  if (zoneStr === "yellow") return { verdict: "unknown", label: "Подозрительно/неоднозначно", zone: "Yellow" };
  if (zoneStr === "grey" || zoneStr === "gray") return { verdict: "unknown", label: "Неизвестно", zone: "Grey" };

  // Фолбэк: если вообще нет Zone — считаем “неизвестно”
  return { verdict: "unknown", label: "Неизвестно", zone: zone ?? "N/A" };
}

export function nowIso() {
  return new Date().toISOString();
}
