import React, { useEffect, useMemo, useState } from "react";
import CategorySection from "./components/CategorySection";
import LeaderboardTable, { LeaderRow } from "./components/LeaderboardTable";
import { GIDS, loadMasterParticipants, loadTimesMap } from "./lib/sheets";
import { extractTimeOfDay, formatDuration } from "./lib/time";

type LoadState =
  | { status: "loading"; msg: string }
  | { status: "error"; msg: string }
  | { status: "ready" };

export default function App() {
  const [state, setState] = useState<LoadState>({
    status: "loading",
    msg: "Memuat data spreadsheet…"
  });

  const [overall, setOverall] = useState<LeaderRow[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, LeaderRow[]>>({});
  const [activeTab, setActiveTab] = useState<string>("Overall");

  // Debug info for missing EPCs
  const [debug, setDebug] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setState({ status: "loading", msg: "Load master peserta (kategori)…" });
        const master = await loadMasterParticipants();

        setState({ status: "loading", msg: "Load start & finish time…" });
        const startMap = await loadTimesMap(GIDS.start);
        const finishMap = await loadTimesMap(GIDS.finish);

        // EPC sets for diagnostics
        const masterEpcs = new Set(master.all.map(p => p.epc));
        const startEpcs = new Set(Array.from(startMap.keys()));
        const finishEpcs = new Set(Array.from(finishMap.keys()));

        const missingInMaster = Array.from(finishEpcs).filter(epc => !masterEpcs.has(epc));
        const missingStart = Array.from(finishEpcs).filter(epc => !startEpcs.has(epc));
        const missingFinish = Array.from(masterEpcs).filter(epc => !finishEpcs.has(epc));

        const invalidTotals: string[] = [];

        const rows: LeaderRow[] = [];
        master.all.forEach(p => {
          const finishEntry = finishMap.get(p.epc);
          const startEntry = startMap.get(p.epc);

          if (!finishEntry?.ms) return;
          if (!startEntry?.ms) return;

          const total = finishEntry.ms - startEntry.ms;
          if (!Number.isFinite(total) || total < 0) {
            invalidTotals.push(p.epc);
            return;
          }

          rows.push({
            rank: 0,
            bib: p.bib,
            name: p.name,
            gender: p.gender,
            category: p.category || p.sourceCategoryKey,
            sourceCategoryKey: p.sourceCategoryKey,
            finishTimeRaw: extractTimeOfDay(finishEntry.raw),
            totalTimeMs: total,
            totalTimeDisplay: formatDuration(total),
            epc: p.epc
          });
        });

        const overallSorted = [...rows]
          .sort((a, b) => a.totalTimeMs - b.totalTimeMs)
          .map((r, i) => ({ ...r, rank: i + 1 }));

        const catMap: Record<string, LeaderRow[]> = {};
        for (const cat of GIDS.categories) {
          const catRows = overallSorted
            .filter(r => r.sourceCategoryKey === cat.key)
            .sort((a, b) => a.totalTimeMs - b.totalTimeMs)
            .map((r, i) => ({ ...r, rank: i + 1 }));
          catMap[cat.key] = catRows;
        }

        setOverall(overallSorted);
        setByCategory(catMap);
        setDebug({
          counts: {
            master: masterEpcs.size,
            start: startEpcs.size,
            finish: finishEpcs.size,
            displayedOverall: overallSorted.length
          },
          missingInMaster,
          missingStart,
          missingFinish,
          invalidTotals
        });
        setState({ status: "ready" });
      } catch (e: any) {
        setState({
          status: "error",
          msg: e?.message || "Gagal load data"
        });
      }
    })();
  }, []);

  const tabs = useMemo(() => {
    return ["Overall", ...GIDS.categories.map(c => c.key)];
  }, []);

  if (state.status === "loading") {
    return (
      <div className="page">
        <h1 className="app-title">Race Leaderboard</h1>
        <div className="card">{state.msg}</div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="page">
        <h1 className="app-title">Race Leaderboard</h1>
        <div className="card">
          <div className="error-title">Error</div>
          <div>{state.msg}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="app-title">Race Leaderboard</h1>

      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t}
            className={`tab ${activeTab === t ? "active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === "Overall" && (
        <LeaderboardTable
          title="Overall Result (All Categories)"
          rows={overall}
        />
      )}

      {activeTab !== "Overall" && (
        <CategorySection
          categoryKey={activeTab}
          rows={byCategory[activeTab] || []}
        />
      )}

      {/* Debug Panel */}
      {debug && (
        <div className="card debug-panel" style={{ marginTop: 12 }}>
          <h2 className="section-title">Debug Panel (why some rows not shown)</h2>
          <div className="debug-grid">
            <div className="debug-item">
              <b>Counts</b>
              <pre>{JSON.stringify(debug.counts, null, 2)}</pre>
            </div>
            <div className="debug-item">
              <b>Finish EPC not in Master</b>
              <pre>{JSON.stringify(debug.missingInMaster, null, 2)}</pre>
            </div>
            <div className="debug-item">
              <b>Finish EPC missing Start</b>
              <pre>{JSON.stringify(debug.missingStart, null, 2)}</pre>
            </div>
            <div className="debug-item">
              <b>Master EPC missing Finish</b>
              <pre>{JSON.stringify(debug.missingFinish, null, 2)}</pre>
            </div>
            <div className="debug-item">
              <b>Invalid Total (negative/NaN)</b>
              <pre>{JSON.stringify(debug.invalidTotals, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
