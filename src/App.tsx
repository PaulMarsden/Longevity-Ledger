import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

type ID = string;
type ISODate = string; // YYYY-MM-DD

type BloodPanel = {
  id: ID;
  date: ISODate;
  lab?: string;
  apoB?: number; // mg/dL
  ldl?: number; // mg/dL
  hdl?: number; // mg/dL
  tg?: number; // mg/dL
  lpa?: number; // nmol/L
  hscrp?: number; // mg/L
  a1c?: number; // %
  fastingGlucose?: number; // mg/dL
  fastingInsulin?: number; // uIU/mL
  alt?: number; ast?: number; creatinine?: number; egfr?: number; uric?: number;
  tsh?: number; ft4?: number;
  vitaminD?: number; // ng/mL
  ferritin?: number; b12?: number; folate?: number;
  notes?: string;
};

type ImagingStudy = {
  id: ID;
  date: ISODate;
  type: "CAC" | "Full body MRI" | "DEXA" | "Carotid ultrasound" | "Colonoscopy" | "Other";
  resultSummary?: string;
  numericResult?: number; // eg CAC Agatston score
  site?: string;
};

type Vitals = {
  id: ID;
  date: ISODate;
  weightKg?: number;
  waistCm?: number;
  heightCm?: number;
  systolic?: number;
  diastolic?: number;
  restingHR?: number;
  hrv?: number;
};

type FitnessTest = {
  id: ID;
  date: ISODate;
  vo2max?: number;
  gripLeft?: number;
  gripRight?: number;
  sitToStand1min?: number;
  zone2MinsPerWeek?: number;
  vigorousMinsPerWeek?: number;
};

type MedOrSupp = {
  id: ID;
  date: ISODate;
  kind: "Medication" | "Supplement";
  name: string;
  dose?: string;
  notes?: string;
};

type Note = { id: ID; date: ISODate; text: string };

type Ledger = {
  bloods: BloodPanel[];
  imaging: ImagingStudy[];
  vitals: Vitals[];
  fitness: FitnessTest[];
  meds: MedOrSupp[];
  notes: Note[];
};

const EMPTY: Ledger = { bloods: [], imaging: [], vitals: [], fitness: [], meds: [], notes: [] };

// ---------- Profiles (Paul / Claire) ----------
const PROFILES = ["Paul", "Claire"] as const;
type Profile = typeof PROFILES[number];
const storageKey = (p: Profile) => `longevity-ledger-${p}`;

// ---------- Helpers ----------
const KEY = "longevity-ledger"; // kept only for legacy import/export filename
const uid = () => Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0, 10);
function numberOrEmpty(v?: number) { return v ?? undefined; }
function mmHg(bp?: number) { return bp === undefined ? "--" : String(bp); }
function mgdl(v?: number) { return v === undefined ? "--" : v.toFixed(0); }

export default function LongevityLedgerApp() {
  // active profile
  const [profile, setProfile] = useState<Profile>("Paul");

  // profile-scoped DB
  const [db, setDb] = useState<Ledger>(EMPTY);

  function loadFor(p: Profile): Ledger {
    try {
      const raw = localStorage.getItem(storageKey(p));
      return raw ? (JSON.parse(raw) as Ledger) : EMPTY;
    } catch {
      return EMPTY;
    }
  }
  function saveFor(p: Profile, data: Ledger) {
    localStorage.setItem(storageKey(p), JSON.stringify(data));
  }

  // load when profile changes
  useEffect(() => {
    setDb(loadFor(profile));
  }, [profile]);

  // save when data/profile changes
  useEffect(() => {
    saveFor(profile, db);
  }, [db, profile]);

  const latestBlood = useMemo(
    () => [...db.bloods].sort((a, b) => a.date.localeCompare(b.date)).at(-1),
    [db]
  );
  const latestVitals = useMemo(
    () => [...db.vitals].sort((a, b) => a.date.localeCompare(b.date)).at(-1),
    [db]
  );
  const bloodTrend = useMemo(
    () =>
      [...db.bloods]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((b) => ({ date: b.date, ApoB: b.apoB, LDL: b.ldl, A1c: b.a1c })),
    [db]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Longevity Ledger</h1>

          <div className="flex items-center gap-3">
            <nav className="flex gap-2 text-sm">
              {[
                ["dashboard", "Dashboard"],
                ["bloods", "Bloods"],
                ["imaging", "Imaging"],
                ["vitals", "Vitals"],
                ["fitness", "Fitness"],
                ["meds", "Meds"],
                ["notes", "Notes"],
                ["importExport", "Import or Export"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key as any)}
                  className={`px-3 py-1.5 rounded-full border ${
                    tab === key
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* Profile selector */}
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value as Profile)}
              className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm"
              title="Select profile"
            >
              {PROFILES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "dashboard" && (
          <Dashboard
            latestBlood={latestBlood}
            latestVitals={latestVitals}
            bloodTrend={bloodTrend}
          />
        )}
        {tab === "bloods" && <Bloods db={db} setDb={setDb} />}
        {tab === "imaging" && <Imaging db={db} setDb={setDb} />}
        {tab === "vitals" && <VitalsTab db={db} setDb={setDb} />}
        {tab === "fitness" && <FitnessTab db={db} setDb={setDb} />}
        {tab === "meds" && <MedsTab db={db} setDb={setDb} />}
        {tab === "notes" && <NotesTab db={db} setDb={setDb} />}
        {tab === "importExport" && <ImportExport db={db} setDb={setDb} profile={profile} />}
      </main>
    </div>
  );

  // local UI state for which tab is open
  function setTab(v: any) {
    _setTab(v);
  }
}

// local tab state (kept outside component to avoid re-declare in TSX literal above)
const _initTab: "dashboard" | "bloods" | "imaging" | "vitals" | "fitness" | "meds" | "notes" | "importExport" = "dashboard";
let _tabState = _initTab;
let _tabListeners: ((v: typeof _initTab) => void)[] = [];
function _setTab(v: typeof _initTab) {
  _tabState = v;
  _tabListeners.forEach((fn) => fn(v));
}
function useTabState() {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((n) => n + 1);
    _tabListeners.push(cb);
    return () => {
      _tabListeners = _tabListeners.filter((f) => f !== cb);
    };
  }, []);
  // @ts-ignore
  return _tabState as typeof _initTab;
}
const tab = useTabState();

// ---------- Reusable UI bits ----------
function Tile({ label, value, help }: { label: string; value: string | number; help?: string }) {
  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {help && <div className="text-xs text-slate-400 mt-1">{help}</div>}
    </div>
  );
}

function Dashboard({
  latestBlood,
  latestVitals,
  bloodTrend,
}: {
  latestBlood?: BloodPanel;
  latestVitals?: Vitals;
  bloodTrend: any[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="ApoB" value={mgdl(latestBlood?.apoB)} help="Target: under 80, or under 60 if high risk" />
        <Tile label="LDL-C" value={mgdl(latestBlood?.ldl)} help="Target: under 100, tighter if risk is higher" />
        <Tile label="HbA1c" value={latestBlood?.a1c === undefined ? "--" : latestBlood.a1c.toFixed(2)} help="Aim under 5.5%" />
        <Tile label="Blood Pressure" value={`${mmHg(latestVitals?.systolic)}/${mmHg(latestVitals?.diastolic)}`} help="Home avg, aim <120/80" />
      </div>

      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="text-sm font-medium mb-3">Trends: ApoB, LDL, HbA1c</div>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bloodTrend} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ApoB" dot={false} />
              <Line type="monotone" dataKey="LDL" dot={false} />
              <Line type="monotone" dataKey="A1c" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-sm text-slate-600">
        Tip: record home blood pressure weekly, add blood panels quarterly, add imaging as completed.
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      {children}
    </label>
  );
}
function Input(props: any) {
  return <input {...props} className={`px-3 py-2 rounded-xl border border-slate-300 bg-white ${props.className || ""}`} />;
}
function Textarea(props: any) {
  return <textarea {...props} className={`px-3 py-2 rounded-xl border border-slate-300 bg-white ${props.className || ""}`} />;
}
function Section({ title, children }: { title: string; children: any }) {
  return (
    <section className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm mb-4">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}
function Row({ children }: { children: any }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{children}</div>;
}
function Button(props: any) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-xl border ${
        props.variant === "primary" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300 hover:bg-slate-100"
      } ${props.className || ""}`}
    />
  );
}

function Bloods({ db, setDb }: { db: Ledger; setDb: React.Dispatch<React.SetStateAction<Ledger>> }) {
  const [form, setForm] = useState<BloodPanel>({ id: uid(), date: today() });
  const add = () => {
    setDb((p) => ({ ...p, bloods: [...p.bloods, form] }));
    setForm({ id: uid(), date: today() });
  };
  const del = (id: ID) => setDb((p) => ({ ...p, bloods: p.bloods.filter((b) => b.id !== id) }));
  return (
    <div className="space-y-4">
      <Section title="Add blood panel">
        <Row>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Lab or provider">
            <Input value={form.lab || ""} onChange={(e) => setForm({ ...form, lab: e.target.value })} placeholder="Name" />
          </Field>
          <Field label="Notes">
            <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </Field>
        </Row>
        <Row>
          <Field label="ApoB mg/dL">
            <Input type="number" value={form.apoB ?? ""} onChange={(e) => setForm({ ...form, apoB: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="LDL mg/dL">
            <Input type="number" value={form.ldl ?? ""} onChange={(e) => setForm({ ...form, ldl: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="HDL mg/dL">
            <Input type="number" value={form.hdl ?? ""} onChange={(e) => setForm({ ...form, hdl: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
        </Row>
        <Row>
          <Field label="Triglycerides mg/dL">
            <Input type="number" value={form.tg ?? ""} onChange={(e) => setForm({ ...form, tg: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Lp(a) nmol/L">
            <Input type="number" value={form.lpa ?? ""} onChange={(e) => setForm({ ...form, lpa: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="hs-CRP mg/L">
            <Input type="number" value={form.hscrp ?? ""} onChange={(e) => setForm({ ...form, hscrp: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
        </Row>
        <Row>
          <Field label="HbA1c %">
            <Input type="number" step="0.01" value={form.a1c ?? ""} onChange={(e) => setForm({ ...form, a1c: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Fasting glucose mg/dL">
            <Input
              type="number"
              value={form.fastingGlucose ?? ""}
              onChange={(e) => setForm({ ...form, fastingGlucose: numberOrEmpty(parseFloat(e.target.value)) })}
            />
          </Field>
          <Field label="Fasting insulin uIU/mL">
            <Input
              type="number"
              value={form.fastingInsulin ?? ""}
              onChange={(e) => setForm({ ...form, fastingInsulin: numberOrEmpty(parseFloat(e.target.value)) })}
            />
          </Field>
        </Row>
        <Row>
          <Field label="ALT">
            <Input type="number" value={form.alt ?? ""} onChange={(e) => setForm({ ...form, alt: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="AST">
            <Input type="number" value={form.ast ?? ""} onChange={(e) => setForm({ ...form, ast: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Creatinine">
            <Input
              type="number"
              value={form.creatinine ?? ""}
              onChange={(e) => setForm({ ...form, creatinine: numberOrEmpty(parseFloat(e.target.value)) })}
            />
          </Field>
        </Row>
        <Row>
          <Field label="eGFR">
            <Input type="number" value={form.egfr ?? ""} onChange={(e) => setForm({ ...form, egfr: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Uric acid">
            <Input type="number" value={form.uric ?? ""} onChange={(e) => setForm({ ...form, uric: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Vitamin D ng/mL">
            <Input
              type="number"
              value={form.vitaminD ?? ""}
              onChange={(e) => setForm({ ...form, vitaminD: numberOrEmpty(parseFloat(e.target.value)) })}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Ferritin">
            <Input type="number" value={form.ferritin ?? ""} onChange={(e) => setForm({ ...form, ferritin: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="B12">
            <Input type="number" value={form.b12 ?? ""} onChange={(e) => setForm({ ...form, b12: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Folate">
            <Input type="number" value={form.folate ?? ""} onChange={(e) => setForm({ ...form, folate: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
        </Row>
        <div className="mt-3 flex gap-2">
          <Button variant="primary" onClick={add}>
            Save panel
          </Button>
        </div>
      </Section>

      <Section title="History">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Lab</th>
                <th className="py-2 pr-4">ApoB</th>
                <th className="py-2 pr-4">LDL</th>
                <th className="py-2 pr-4">A1c</th>
                <th className="py-2 pr-4">hs-CRP</th>
                <th className="py-2 pr-4">Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...db.bloods].sort((a, b) => b.date.localeCompare(a.date)).map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="py-2 pr-4 whitespace-nowrap">{b.date}</td>
                  <td className="py-2 pr-4">{b.lab}</td>
                  <td className="py-2 pr-4">{b.apoB ?? ""}</td>
                  <td className="py-2 pr-4">{b.ldl ?? ""}</td>
                  <td className="py-2 pr-4">{b.a1c ?? ""}</td>
                  <td className="py-2 pr-4">{b.hscrp ?? ""}</td>
                  <td className="py-2 pr-4">{b.notes}</td>
                  <td className="py-2 pr-4 text-right">
                    <Button onClick={() => setDb((p) => ({ ...p, bloods: p.bloods.filter((x) => x.id !== b.id) }))}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Imaging({ db, setDb }: { db: Ledger; setDb: React.Dispatch<React.SetStateAction<Ledger>> }) {
  const [form, setForm] = useState<ImagingStudy>({ id: uid(), date: today(), type: "CAC" });
  const add = () => {
    setDb((p) => ({ ...p, imaging: [...p.imaging, form] }));
    setForm({ id: uid(), date: today(), type: "CAC" });
  };
  const del = (id: ID) => setDb((p) => ({ ...p, imaging: p.imaging.filter((b) => b.id !== id) }));
  return (
    <div className="space-y-4">
      <Section title="Add imaging or procedure">
        <Row>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Type">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
            >
              {["CAC", "Full body MRI", "DEXA", "Carotid ultrasound", "Colonoscopy", "Other"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Numeric result (optional)">
            <Input
              type="number"
              value={form.numericResult ?? ""}
              onChange={(e) => setForm({ ...form, numericResult: numberOrEmpty(parseFloat(e.target.value)) })}
            />
          </Field>
        </Row>
        <Field label="Result summary">
          <Textarea value={form.resultSummary || ""} onChange={(e) => setForm({ ...form, resultSummary: e.target.value })} placeholder="Key findings" />
        </Field>
        <div className="mt-3">
          <Button variant="primary" onClick={add}>
            Save imaging
          </Button>
        </div>
      </Section>
      <Section title="History">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Result</th>
                <th className="py-2 pr-4">Summary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...db.imaging].sort((a, b) => b.date.localeCompare(a.date)).map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="py-2 pr-4 whitespace-nowrap">{b.date}</td>
                  <td className="py-2 pr-4">{b.type}</td>
                  <td className="py-2 pr-4">{b.numericResult ?? ""}</td>
                  <td className="py-2 pr-4">{b.resultSummary}</td>
                  <td className="py-2 pr-4 text-right">
                    <Button onClick={() => del(b.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function VitalsTab({ db, setDb }: { db: Ledger; setDb: React.Dispatch<React.SetStateAction<Ledger>> }) {
  const [form, setForm] = useState<Vitals>({ id: uid(), date: today() });
  const add = () => {
    setDb((p) => ({ ...p, vitals: [...p.vitals, form] }));
    setForm({ id: uid(), date: today() });
  };
  const del = (id: ID) => setDb((p) => ({ ...p, vitals: p.vitals.filter((b) => b.id !== id) }));
  return (
    <div className="space-y-4">
      <Section title="Add vitals">
        <Row>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Weight kg">
            <Input type="number" value={form.weightKg ?? ""} onChange={(e) => setForm({ ...form, weightKg: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Waist cm">
            <Input type="number" value={form.waistCm ?? ""} onChange={(e) => setForm({ ...form, waistCm: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
        </Row>
        <Row>
          <Field label="Height cm">
            <Input type="number" value={form.heightCm ?? ""} onChange={(e) => setForm({ ...form, heightCm: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Systolic">
            <Input type="number" value={form.systolic ?? ""} onChange={(e) => setForm({ ...form, systolic: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Diastolic">
            <Input type="number" value={form.diastolic ?? ""} onChange={(e) => setForm({ ...form, diastolic: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
        </Row>
        <Row>
          <Field label="Resting HR">
            <Input type="number" value={form.restingHR ?? ""} onChange={(e) => setForm({ ...form, restingHR: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="HRV ms">
            <Input type="number" value={form.hrv ?? ""} onChange={(e) => setForm({ ...form, hrv: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
        </Row>
        <div className="mt-3">
          <Button variant="primary" onClick={add}>
            Save vitals
          </Button>
        </div>
      </Section>

      <Section title="History">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Weight</th>
                <th className="py-2 pr-4">Waist</th>
                <th className="py-2 pr-4">BP</th>
                <th className="py-2 pr-4">RHR</th>
                <th className="py-2 pr-4">HRV</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...db.vitals].sort((a, b) => b.date.localeCompare(a.date)).map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="py-2 pr-4 whitespace-nowrap">{b.date}</td>
                  <td className="py-2 pr-4">{b.weightKg ?? ""}</td>
                  <td className="py-2 pr-4">{b.waistCm ?? ""}</td>
                  <td className="py-2 pr-4">
                    {b.systolic ?? ""}/{b.diastolic ?? ""}
                  </td>
                  <td className="py-2 pr-4">{b.restingHR ?? ""}</td>
                  <td className="py-2 pr-4">{b.hrv ?? ""}</td>
                  <td className="py-2 pr-4 text-right">
                    <Button onClick={() => del(b.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function FitnessTab({ db, setDb }: { db: Ledger; setDb: React.Dispatch<React.SetStateAction<Ledger>> }) {
  const [form, setForm] = useState<FitnessTest>({ id: uid(), date: today() });
  const add = () => {
    setDb((p) => ({ ...p, fitness: [...p.fitness, form] }));
    setForm({ id: uid(), date: today() });
  };
  const del = (id: ID) => setDb((p) => ({ ...p, fitness: p.fitness.filter((b) => b.id !== id) }));
  return (
    <div className="space-y-4">
      <Section title="Add fitness test or weekly volume">
        <Row>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="VO2max mL/kg/min">
            <Input type="number" value={form.vo2max ?? ""} onChange={(e) => setForm({ ...form, vo2max: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Sit to stand 1 min reps">
            <Input
              type="number"
              value={form.sitToStand1min ?? ""}
              onChange={(e) => setForm({ ...form, sitToStand1min: numberOrEmpty(parseFloat(e.target.value)) })}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Grip left kg">
            <Input type="number" value={form.gripLeft ?? ""} onChange={(e) => setForm({ ...form, gripLeft: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Grip right kg">
            <Input type="number" value={form.gripRight ?? ""} onChange={(e) => setForm({ ...form, gripRight: numberOrEmpty(parseFloat(e.target.value)) })} />
          </Field>
          <Field label="Zone 2 minutes per week">
            <Input
              type="number"
              value={form.zone2MinsPerWeek ?? ""}
              onChange={(e) => setForm({ ...form, zone2MinsPerWeek: numberOrEmpty(parseFloat(e.target.value)) })}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Vigorous minutes per week">
            <Input
              type="number"
              value={form.vigorousMinsPerWeek ?? ""}
              onChange={(e) => setForm({ ...form, vigorousMinsPerWeek: numberOrEmpty(parseFloat(e.target.value)) })}
            />
          </Field>
        </Row>
        <div className="mt-3">
          <Button variant="primary" onClick={add}>
            Save fitness
          </Button>
        </div>
      </Section>
      <Section title="History">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">VO2max</th>
                <th className="py-2 pr-4">Sit to stand</th>
                <th className="py-2 pr-4">Grip L</th>
                <th className="py-2 pr-4">Grip R</th>
                <th className="py-2 pr-4">Z2 min</th>
                <th className="py-2 pr-4">Vig min</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...db.fitness].sort((a, b) => b.date.localeCompare(a.date)).map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="py-2 pr-4 whitespace-nowrap">{b.date}</td>
                  <td className="py-2 pr-4">{b.vo2max ?? ""}</td>
                  <td className="py-2 pr-4">{b.sitToStand1min ?? ""}</td>
                  <td className="py-2 pr-4">{b.gripLeft ?? ""}</td>
                  <td className="py-2 pr-4">{b.gripRight ?? ""}</td>
                  <td className="py-2 pr-4">{b.zone2MinsPerWeek ?? ""}</td>
                  <td className="py-2 pr-4">{b.vigorousMinsPerWeek ?? ""}</td>
                  <td className="py-2 pr-4 text-right">
                    <Button onClick={() => del(b.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function MedsTab({ db, setDb }: { db: Ledger; setDb: React.Dispatch<React.SetStateAction<Ledger>> }) {
  const [form, setForm] = useState<MedOrSupp>({ id: uid(), date: today(), kind: "Medication", name: "" });
  const add = () => {
    if (!form.name.trim()) return;
    setDb((p) => ({ ...p, meds: [...p.meds, form] }));
    setForm({ id: uid(), date: today(), kind: form.kind, name: "" });
  };
  const del = (id: ID) => setDb((p) => ({ ...p, meds: p.meds.filter((b) => b.id !== id) }));
  return (
    <div className="space-y-4">
      <Section title="Add medication or supplement">
        <Row>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Type">
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as any })}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
            >
              <option>Medication</option>
              <option>Supplement</option>
            </select>
          </Field>
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="eg Rosuvastatin 5 mg" />
          </Field>
        </Row>
        <Row>
          <Field label="Dose or schedule">
            <Input value={form.dose || ""} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="eg nightly" />
          </Field>
          <Field label="Notes">
            <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </Field>
        </Row>
        <div className="mt-3">
          <Button variant="primary" onClick={add}>
            Save item
          </Button>
        </div>
      </Section>
      <Section title="Current list">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Dose</th>
                <th className="py-2 pr-4">Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...db.meds].sort((a, b) => b.date.localeCompare(a.date)).map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="py-2 pr-4 whitespace-nowrap">{b.date}</td>
                  <td className="py-2 pr-4">{b.kind}</td>
                  <td className="py-2 pr-4">{b.name}</td>
                  <td className="py-2 pr-4">{b.dose}</td>
                  <td className="py-2 pr-4">{b.notes}</td>
                  <td className="py-2 pr-4 text-right">
                    <Button onClick={() => del(b.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function NotesTab({ db, setDb }: { db: Ledger; setDb: React.Dispatch<React.SetStateAction<Ledger>> }) {
  const [form, setForm] = useState<Note>({ id: uid(), date: today(), text: "" });
  const add = () => {
    if (!form.text.trim()) return;
    setDb((p) => ({ ...p, notes: [...p.notes, form] }));
    setForm({ id: uid(), date: today(), text: "" });
  };
  const del = (id: ID) => setDb((p) => ({ ...p, notes: p.notes.filter((b) => b.id !== id) }));
  return (
    <div className="space-y-4">
      <Section title="Add note or protocol change">
        <Row>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Note">
            <Textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Key decisions, protocol changes, questions for doctor"
            />
          </Field>
        </Row>
        <div className="mt-3">
          <Button variant="primary" onClick={add}>
            Save note
          </Button>
        </div>
      </Section>
      <Section title="History">
        <ul className="space-y-2">
          {[...db.notes].sort((a, b) => b.date.localeCompare(a.date)).map((n) => (
            <li key={n.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">{n.date}</div>
                <div className="mt-1 whitespace-pre-wrap">{n.text}</div>
              </div>
              <Button onClick={() => del(n.id)}>Delete</Button>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function ImportExport({ db, setDb, profile }: { db: Ledger; setDb: React.Dispatch<React.SetStateAction<Ledger>>; profile: Profile }) {
  const [raw, setRaw] = useState(JSON.stringify(db, null, 2));
  const download = () => {
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `longevity-ledger-${profile}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        setDb(obj);
        setRaw(JSON.stringify(obj, null, 2));
      } catch {
        alert("Invalid file");
      }
    };
    reader.readAsText(f);
  };
  useEffect(() => {
    setRaw(JSON.stringify(db, null, 2));
  }, [db]);
  return (
    <div className="space-y-4">
      <Section title={`Export or import data (${profile})`}>
        <div className="flex gap-2">
          <Button variant="primary" onClick={download}>
            Export JSON
          </Button>
          <label className="px-4 py-2 rounded-xl border bg-white border-slate-300 hover:bg-slate-100 cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" onChange={upload} className="hidden" />
          </label>
        </div>
        <div className="mt-3">
          <Textarea rows={12} value={raw} onChange={(e) => setRaw(e.target.value)} />
        </div>
      </Section>
      <Section title={`Reset (${profile})`}>
        <Button
          onClick={() => {
            if (confirm(`Clear all data for ${profile}?`)) setDb(EMPTY);
          }}
        >
          Clear all
        </Button>
      </Section>
    </div>
  );
}
