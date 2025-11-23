import React, { useMemo, useState } from "react";
import LeaderboardTable, { LeaderRow } from "./LeaderboardTable";
import { exportLeaderboardCSV } from "../lib/csv";

export default function CategorySection({
  categoryKey,
  rows
}: {
  categoryKey: string;
  rows: LeaderRow[];
}) {
  const [expanded, setExpanded] = useState(false);

  const top10 = useMemo(() => rows.filter(r => r.rank <= 10), [rows]);

  const exportAll = () =>
    exportLeaderboardCSV(rows, `${categoryKey.replace(/\s+/g, "_")}_full.csv`);

  const exportTop10 = () =>
    exportLeaderboardCSV(top10, `${categoryKey.replace(/\s+/g, "_")}_top10.csv`);

  return (
    <div className="category-wrap">
      <div className="card f1-top10">
        <div className="header-row">
          <div>
            <h2 className="section-title">
              {categoryKey} — Top 10
            </h2>
            <div className="subtle">Official winners preview</div>
          </div>

          <div className="tools">
            <button className="btn ghost" onClick={exportTop10}>
              Export Top 10 CSV
            </button>
            <button className="btn" onClick={exportAll}>
              Export Full CSV
            </button>
            <button
              className="btn toggle"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? "Hide Full Standings" : "View Full Standings"}
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="f1-table compact">
            <thead>
              <tr>
                <th className="col-rank">POS</th>
                <th className="col-bib">BIB</th>
                <th>NAME</th>
                <th className="col-time">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {top10.map(r => (
                <tr key={r.epc} className="row-hover top10-row">
                  <td className="pos-cell">
                    <span className={`pos-pill pos-${r.rank <= 3 ? r.rank : "n"}`}>
                      {r.rank}
                    </span>
                  </td>
                  <td className="mono">{r.bib || "-"}</td>
                  <td className="name-cell">{r.name || "-"}</td>
                  <td className="mono strong">{r.totalTimeDisplay}</td>
                </tr>
              ))}
              {top10.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    No valid EPC matched finish/start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {expanded && (
        <LeaderboardTable
          title={`Full Standings — ${categoryKey}`}
          rows={rows}
          showTop10Badge
        />
      )}
    </div>
  );
}
