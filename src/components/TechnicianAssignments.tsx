import { useMemo, useState } from "react";
import { calculateTechnicianCommissions, type TechnicianAssignment } from "../lib/payroll";

type TechnicianOption = { id: string; name: string; defaultCommissionPercent?: number };
type Props = {
  laborFee: number;
  technicians: TechnicianOption[];
  value: TechnicianAssignment[];
  onChange: (assignments: TechnicianAssignment[]) => void;
  disabled?: boolean;
};

const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount || 0);

/** Reusable editor for assigning more than one technician to a service ticket. */
export default function TechnicianAssignments({
  laborFee,
  technicians,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  const assignedIds = useMemo(() => new Set(value.map((v) => v.technicianId)), [value]);
  const commissionRows = useMemo(() => {
    try {
      return { rows: calculateTechnicianCommissions(Math.max(0, Number(laborFee) || 0), value), totalPercent: value.reduce((s, v) => s + v.commissionPercent, 0), error: "" };
    } catch (e) {
      return { rows: [], totalPercent: value.reduce((s, v) => s + (Number(v.commissionPercent) || 0), 0), error: e instanceof Error ? e.message : "Komisi tidak valid." };
    }
  }, [laborFee, value]);

  function addTechnician() {
    const option = technicians.find((t) => t.id === selectedId);
    if (!option) { setError("Pilih teknisi terlebih dahulu."); return; }
    if (assignedIds.has(option.id)) { setError("Teknisi ini sudah ditugaskan pada tiket."); return; }
    const percent = Math.max(0, Math.min(100, Number(option.defaultCommissionPercent) || 0));
    const next = [...value, { technicianId: option.id, technicianName: option.name, commissionPercent: percent }];
    if (next.reduce((s, a) => s + a.commissionPercent, 0) > 100) {
      setError("Total persentase komisi tidak boleh melebihi 100%.");
      return;
    }
    onChange(next);
    setSelectedId("");
    setError("");
  }

  function updatePercent(id: string, percentText: string) {
    const percent = Number(percentText);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setError("Persentase setiap teknisi harus di antara 0 dan 100.");
      return;
    }
    const next = value.map((a) => a.technicianId === id ? { ...a, commissionPercent: percent } : a);
    if (next.reduce((s, a) => s + a.commissionPercent, 0) > 100) {
      setError("Total persentase komisi tidak boleh melebihi 100%.");
      return;
    }
    onChange(next);
    setError("");
  }

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div>
        <h3 className="font-semibold">Penugasan teknisi</h3>
        <p className="text-sm text-slate-500">Komisi dihitung dari biaya jasa saja, tidak termasuk spare part.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select className="min-w-0 flex-1 rounded-lg border p-2" value={selectedId} disabled={disabled} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Pilih teknisi…</option>
          {technicians.filter((t) => !assignedIds.has(t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="button" className="rounded-lg border px-3 py-2" onClick={addTechnician} disabled={disabled || !selectedId}>Tambah teknisi</button>
      </div>
      {value.length === 0 ? <p className="text-sm text-slate-500">Belum ada teknisi ditugaskan.</p> : (
        <div className="space-y-2">
          {value.map((a) => {
            const row = commissionRows.rows.find((r) => r.technicianId === a.technicianId);
            return <div key={a.technicianId} className="grid grid-cols-1 items-center gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_110px_150px_auto]">
              <span className="font-medium">{a.technicianName}</span>
              <label className="text-sm">Komisi %
                <input className="mt-1 w-full rounded border p-2" type="number" min="0" max="100" step="0.01" value={a.commissionPercent} disabled={disabled} onChange={(e) => updatePercent(a.technicianId, e.target.value)} />
              </label>
              <div className="text-sm"><span className="text-slate-500">Nilai komisi</span><strong className="block">{money(row?.commissionAmount || 0)}</strong></div>
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" disabled={disabled} onClick={() => { onChange(value.filter((item) => item.technicianId !== a.technicianId)); setError(""); }}>Hapus</button>
            </div>;
          })}
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-2 border-t pt-3 text-sm">
        <span>Total persentase komisi: <strong>{commissionRows.totalPercent.toLocaleString("id-ID")}%</strong></span>
        <span>Total komisi: <strong>{money(commissionRows.rows.reduce((s, r) => s + r.commissionAmount, 0))}</strong></span>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {commissionRows.error && <p role="alert" className="text-sm text-red-700">{commissionRows.error}</p>}
    </section>
  );
}
