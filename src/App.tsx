import React, { useEffect, useMemo, useState } from "react";

/**
 * Longevity Ledger – minimal, compile-safe version
 * - Two profiles: Paul, Claire
 * - Tabs: dashboard, bloods, imaging, vitals, fitness, meds, notes, importExport
 * - LocalStorage per-profile
 * - Export / Import JSON, Reset
 */

// ---- Profiles ----
const PROFILES = ["Paul", "Claire"] as const;
type Profile = typeof PROFILES[number];
const storageKey = (p: Profile) => `longevity-ledger-${p}`;

// ---- Tabs ----
const TABS = [
  "dashboard",
  "bloods",
  "imaging",
  "vitals",
  "fitness",
  "meds",
  "notes",
  "importExport",
] as const;
type Tab = typeof TABS[number];

// ---- Data types (kept lightweight to avoid build issues) ----
type ID = string;
type ISODate = string; // YYYY-MM-DD

type BloodPanel = {
  id: ID;
  date: ISODate;
  apoB?: number;
  ldl?: number;
  hdl?: number;
  tg?: number;
  a1c?: number;
  notes?: string;
};

type ImagingStudy = {
  id: ID;
  date: ISODate;
  type: string; // CAC / DEXA / MRI / etc
  site?: string;
  resultSummary?: string;
  numericResult?: number; // e.g. CAC score
};

type Vitals = {
  id: ID;
  date: ISODate;
  weightKg?: number;
  heightCm?: number;
  systolic?: number;
  diastolic?: number;
  restingHR?: number;
  notes?: string;
};

type FitnessTest = {
  id: ID;
  date: ISODate;
  vo2max?: number;
  strengthNotes?: string;
  notes?: string;
};

type MedOrSupp = {
  id: ID;
  date: ISODate;
  kind: "Medication" | "Supplement";
  name: string;
  dose?: string;
  notes?: string;
};

type Note = {
  id: ID;
  date: ISODate;
  text: string;
};

type Ledger = {
  bloods: BloodPanel[];
  imaging: ImagingStudy[];
  vitals: Vitals[];
  fitness: FitnessTest[];
  meds: MedOrSupp[];
  notes: Note[];
};

const EMPTY: Ledger = {
  bloods: [],
  imaging: [],
  vitals: [],
  fitness: [],
  meds: [],
  notes: [],
};

// ---- Utils ----
const uid = () => Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0, 10);

// ---- UI bits (tiny helpers) ----
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded ${
        active ? "bg-black text-white" : "bg-gray-200"
      }`}
      style={{ marginRight: 6, marginBottom: 6 }}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <div>{children}</div>
      <hr style={{ marginTop: 16 }} />
    </section>
  );
}

// ---- Main App ----
export default function App() {
  const [profile, setProfile] = useState<Profile>("Paul");
  const [tab, setTab] = useState<Tab>("dashboard");

  // load data from storage for the current profile
  const [db, setDb] = useState<Ledger>(EMPTY);
  useEffect(() => {
    const raw = localStorage.getItem(storageKey(profile));
    setDb(raw ? (JSON.parse(raw) as Ledger) : EMPTY);
  }, [profile]);

  // persist on change
  useEffect(() => {
    localStorage.setItem(storageKey(profile), JSON.stringify(db));
  }, [profile, db]);

  const summary = useMemo(() => {
    // a few basic rollups for the dashboard
    const recentBlood = db.bloods.at(-1);
    return {
      lastApoB: recentBlood?.apoB ?? null,
      lastLDL: recentBlood?.ldl ?? null,
      lastA1c: recentBlood?.a1c ?? null,
      entries: {
        bloods: db.bloods.length,
        imaging: db.imaging.length,
        vitals: db.vitals.length,
        fitness: db.fitness.length,
        meds: db.meds.length,
        notes: db.notes.length,
      },
    };
  }, [db]);

  // ---- simple adders to make testing easy ----
  const addBlood = () => {
    const panel: BloodPanel = {
      id: uid(),
      date: today(),
      apoB: 85,
      ldl: 95,
      a1c: 5.3,
      notes: "example",
    };
    setDb((d) => ({ ...d, bloods: [...d.bloods, panel] }));
  };

  const addNote = () => {
    const n: Note = { id: uid(), date: today(), text: "Example note" };
    setDb((d) => ({ ...d, notes: [...d.notes, n] }));
  };

  // ---- Import / Export / Reset ----
  const [raw, setRaw] = useState("");
  const exportJson = () => setRaw(JSON.stringify(db, null, 2));
  const importJson = () => {
    try {
      const parsed = JSON.parse(raw) as Ledger;
      setDb(parsed);
      alert("Imported JSON for " + profile);
    } catch (e) {
      alert("Invalid JSON");
    }
  };
  const resetAll = () => {
    if (confirm(`Clear all data for ${profile}?`)) setDb(EMPTY);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
        Longevity Ledger
      </h1>

      {/* Profile selector */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ marginRight: 8, fontWeight: 600 }}>Profile:</span>
        {PROFILES.map((p) => (
          <TabButton key={p} active={profile === p} onClick={() => setProfile(p)}>
            {p}
          </TabButton>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 8 }}>
        {TABS.map((t) => (
          <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
            {t}
          </TabButton>
        ))}
      </div>

      {/* Views */}
      {tab === "dashboard" && (
        <div>
          <Section title="At-a-glance">
            <div>Last ApoB: {summary.lastApoB ?? "—"}</div>
            <div>Last LDL: {summary.lastLDL ?? "—"}</div>
            <div>Last A1c: {summary.lastA1c ?? "—"}</div>
          </Section>
          <Section title="Entries">
            <div>Bloods: {summary.entries.bloods}</div>
            <div>Imaging: {summary.entries.imaging}</div>
            <div>Vitals: {summary.entries.vitals}</div>
            <div>Fitness: {summary.entries.fitness}</div>
            <div>Meds/Supps: {summary.entries.meds}</div>
            <div>Notes: {summary.entries.notes}</div>
          </Section>
          <Section title="Quick add (demo)">
            <button className="px-3 py-1 bg-black text-white rounded" onClick={addBlood}>
              Add blood panel
            </button>
            <button
              className="px-3 py-1 bg-gray-200 rounded"
              style={{ marginLeft: 8 }}
              onClick={addNote}
            >
              Add note
            </button>
          </Section>
        </div>
      )}

      {tab === "bloods" && (
        <Section title="Blood panels">
          {db.bloods.length === 0 && <div>No blood panels yet.</div>}
          {db.bloods.map((b) => (
            <div key={b.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div>{b.date}</div>
              <div>ApoB: {b.apoB ?? "—"} | LDL: {b.ldl ?? "—"} | A1c: {b.a1c ?? "—"}</div>
              <div>{b.notes}</div>
            </div>
          ))}
        </Section>
      )}

      {tab === "imaging" && (
        <Section title="Imaging">
          {db.imaging.length === 0 && <div>No imaging records yet.</div>}
          {db.imaging.map((im) => (
            <div key={im.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div>{im.date} — {im.type}</div>
              <div>{im.resultSummary}</div>
            </div>
          ))}
        </Section>
      )}

      {tab === "vitals" && (
        <Section title="Vitals">
          {db.vitals.length === 0 && <div>No vitals yet.</div>}
          {db.vitals.map((v) => (
            <div key={v.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div>{v.date} — BP: {v.systolic ?? "—"}/{v.diastolic ?? "—"}; HR: {v.restingHR ?? "—"}</div>
            </div>
          ))}
        </Section>
      )}

      {tab === "fitness" && (
        <Section title="Fitness">
          {db.fitness.length === 0 && <div>No fitness entries yet.</div>}
          {db.fitness.map((f) => (
            <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div>{f.date} — VO2max: {f.vo2max ?? "—"}</div>
              <div>{f.strengthNotes}</div>
            </div>
          ))}
        </Section>
      )}

      {tab === "meds" && (
        <Section title="Medications / Supplements">
          {db.meds.length === 0 && <div>No medications/supplements yet.</div>}
          {db.meds.map((m) => (
            <div key={m.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div>{m.date} — {m.kind}: {m.name} {m.dose ? `(${m.dose})` : ""}</div>
            </div>
          ))}
        </Section>
      )}

      {tab === "notes" && (
        <Section title="Notes">
          {db.notes.length === 0 && <div>No notes yet.</div>}
          {db.notes.map((n) => (
            <div key={n.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div>{n.date}</div>
              <div>{n.text}</div>
            </div>
          ))}
        </Section>
      )}

      {tab === "importExport" && (
        <>
          <Section title={`Export / Import JSON (${profile})`}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button className="px-3 py-1 bg-black text-white rounded" onClick={exportJson}>
                Export JSON
              </button>
              <button className="px-3 py-1 bg-gray-200 rounded" onClick={importJson}>
                Import JSON
              </button>
            </div>
            <textarea
              rows={12}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              style={{ width: "100%", fontFamily: "monospace" }}
            />
          </Section>

          <Section title={`Reset (${profile})`}>
            <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={resetAll}>
              Clear all
            </button>
          </Section>
        </>
      )}
    </div>
  );
}
