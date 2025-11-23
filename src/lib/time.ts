export type ParsedTime = {
  ms: number | null;
  isDateTime: boolean;
};

export function parseTimeToMs(raw: any): ParsedTime {
  if (raw == null) return { ms: null, isDateTime: false };
  let s = String(raw).trim();
  if (!s) return { ms: null, isDateTime: false };

  if (/^\d{13}$/.test(s)) {
    return { ms: Number(s), isDateTime: true };
  }

  const isoCandidate =
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(s) ? s.replace(" ", "T") : s;

  const epoch = Date.parse(isoCandidate);
  if (!Number.isNaN(epoch)) {
    return { ms: epoch, isDateTime: true };
  }

  const parts = s.split(":").map(p => p.trim());
  if (parts.length >= 2 && parts.length <= 3) {
    let h = 0, m = 0, sec = 0, ms = 0;

    if (parts.length === 3) {
      h = Number(parts[0]) || 0;
      m = Number(parts[1]) || 0;
      const secParts = parts[2].split(".");
      sec = Number(secParts[0]) || 0;
      ms = secParts[1]
        ? Number(secParts[1].padEnd(3, "0").slice(0, 3))
        : 0;
    } else {
      m = Number(parts[0]) || 0;
      const secParts = parts[1].split(".");
      sec = Number(secParts[0]) || 0;
      ms = secParts[1]
        ? Number(secParts[1].padEnd(3, "0").slice(0, 3))
        : 0;
    }

    const total = (((h * 60 + m) * 60 + sec) * 1000) + ms;
    return { ms: total, isDateTime: false };
  }

  return { ms: null, isDateTime: false };
}

export function extractTimeOfDay(raw: any): string {
  if (raw == null) return "-";
  const s = String(raw).trim();
  if (!s) return "-";

  const m = s.match(/(\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)/);
  if (m) {
    let t = m[1];
    if (t.includes(".")) {
      const [hhmmss, frac] = t.split(".");
      t = `${hhmmss}.${frac.padEnd(3, "0").slice(0, 3)}`;
    } else {
      t = `${t}.000`;
    }
    return t;
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?/.test(s)) {
    return s.includes(".") ? s : `${s}.000`;
  }

  return s;
}

export function formatDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "-";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default parseTimeToMs;
