import parseTimeToMs from "./time";

const PUB_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBEbqTDNIY3wo-9dKVOmJ4pDqz1u7EDszLVajygCJ_cZz24mqSvcjQXmxf3AZCM5a1E9Ek3OWCyTZ6";

export const GIDS = {
  start: 108312925,
  finish: 1421679544,
  categories: [
    { key: "10K Umum Putra", gid: 1086522990 },
    { key: "10K Umum Putri", gid: 43400385 },
    { key: "10K TNI & POLRI Putra", gid: 1348751512 },
    { key: "10K Master Putra", gid: 1631566068 },
    { key: "10K Pelajar Putra", gid: 14027759 },
    { key: "5K FUN RUN", gid: 1779885351 }
  ]
};

const headerAliases: Record<string, string[]> = {
  epc: ["epc", "uid", "tag", "rfid", "chip epc", "epc code"],
  bib: ["bib", "no bib", "bib number", "race bib", "nomor bib", "no. bib"],
  name: ["nama lengkap", "full name", "name", "nama", "participant name"],
  gender: ["jenis kelamin", "gender", "sex", "jk"],
  category: ["kategori", "category", "kelas", "class"],
  times: ["times", "time", "timestamp", "start time", "finish time", "jam"]
};

function norm(s: string) {
  return s.toLowerCase().trim();
}

function findColIndex(headers: string[], key: keyof typeof headerAliases): number {
  const aliases = headerAliases[key].map(norm);
  const hs = headers.map(norm);
  for (let i = 0; i < hs.length; i++) {
    const h = hs[i];
    if (aliases.some(a => h === a || h.includes(a))) return i;
  }
  return -1;
}

async function fetchGViz(gid: number): Promise<any[][]> {
  const url = `${PUB_BASE}/gviz/tq?gid=${gid}&tqx=out:json`;
  const res = await fetch(url);
  const text = await res.text();

  const match = text.match(/google\.visualization\.Query\.setResponse\\(([\s\S]*)\\);/);
  if (!match) throw new Error("GViz parse failed");

  const json = JSON.parse(match[1]);
  const rows = json.table.rows as any[];
  const cols = json.table.cols as any[];

  const headers = cols.map(c => c.label || c.id || "");
  const data: any[][] = [headers];
  rows.forEach(r => {
    const row = r.c.map((cell: any) => (cell ? cell.v : ""));
    data.push(row);
  });
  return data;
}

async function fetchCSV(gid: number): Promise<any[][]> {
  const url = `${PUB_BASE}/pub?gid=${gid}&single=true&output=csv`;
  const res = await fetch(url);
  const csv = await res.text();
  const lines = csv.split(/\\r?\\n/).filter(Boolean);
  return lines.map(l =>
    l.split(",").map(x => x.replace(/^"|"$/g, "").trim())
  );
}

export async function fetchSheet(gid: number): Promise<any[][]> {
  try {
    return await fetchGViz(gid);
  } catch {
    return await fetchCSV(gid);
  }
}

export type MasterParticipant = {
  epc: string;
  bib: string;
  name: string;
  gender: string;
  category: string;
  sourceCategoryKey: string;
};

export async function loadMasterParticipants(): Promise<{
  all: MasterParticipant[];
  byCategoryKey: Record<string, MasterParticipant[]>;
  byEpc: Map<string, MasterParticipant>;
}> {
  const byEpc = new Map<string, MasterParticipant>();
  const byCategoryKey: Record<string, MasterParticipant[]> = {};

  for (const cat of GIDS.categories) {
    const grid = await fetchSheet(cat.gid);
    const headers = grid[0].map(String);

    const epcIdx = findColIndex(headers, "epc");
    const bibIdx = findColIndex(headers, "bib");
    const nameIdx = findColIndex(headers, "name");
    const genderIdx = findColIndex(headers, "gender");
    const categoryIdx = findColIndex(headers, "category");

    const rows = grid.slice(1);
    const arr: MasterParticipant[] = [];

    rows.forEach(r => {
      const epc = epcIdx >= 0 ? String(r[epcIdx] ?? "").trim() : "";
      if (!epc) return;

      const p: MasterParticipant = {
        epc,
        bib: bibIdx >= 0 ? String(r[bibIdx] ?? "").trim() : "",
        name: nameIdx >= 0 ? String(r[nameIdx] ?? "").trim() : "",
        gender: genderIdx >= 0 ? String(r[genderIdx] ?? "").trim() : "",
        category: categoryIdx >= 0 ? String(r[categoryIdx] ?? "").trim() : cat.key,
        sourceCategoryKey: cat.key
      };

      if (!byEpc.has(epc)) byEpc.set(epc, p);
      arr.push(p);
    });

    byCategoryKey[cat.key] = arr;
  }

  return {
    all: Array.from(byEpc.values()),
    byCategoryKey,
    byEpc
  };
}

export type TimeEntry = { ms: number | null; raw: string };

export async function loadTimesMap(gid: number): Promise<Map<string, TimeEntry>> {
  const grid = await fetchSheet(gid);
  const headers = grid[0].map(String);

  const epcIdx = findColIndex(headers, "epc");
  const timesIdx = findColIndex(headers, "times");

  const map = new Map<string, TimeEntry>();

  grid.slice(1).forEach(r => {
    const epc = epcIdx >= 0 ? String(r[epcIdx] ?? "").trim() : "";
    if (!epc) return;

    const rawVal = timesIdx >= 0 ? r[timesIdx] : "";
    const rawStr = String(rawVal ?? "").trim();

    const parsed = parseTimeToMs(rawStr);
    map.set(epc, { ms: parsed.ms, raw: rawStr });
  });

  return map;
}
