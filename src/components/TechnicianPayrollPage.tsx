import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { requireSupabase } from "../lib/supabase";

type StoredRecord = {
  id: string;
  module_key: string;
  data: Record<string, unknown>;
  created_at: string;
};

type PayrollRecord = {
  id: string;
  technician: string;
  period: string;
  base_salary: number;
  commission_total: number;
  bonus: number;
  deductions: number;
  total: number;
  status: "Belum dibayar" | "Dibayar";
  paid_at?: string;
};

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
const asNumber = (v: unknown) => Math.max(0, Number(v) || 0);
const monthNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Payroll records are stored as app_records in the current tenant workspace.
 * Commission totals are read only from service records' technician_commissions,
 * whose commission amounts must be calculated from labor fee only.
 */
export default function TechnicianPayrollPage({ tenantId }: { tenantId: string | null }) {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [services, setServices] = useState<Record<string, unknown>[]>([]);
  const [technician, setTechnician] = useState("");
  const [period, setPeriod] = useState(monthNow());
  const [baseSalary, setBaseSalary] = useState("0");
  const [bonus, setBonus] = useState("0");
  const [deductions, setDeductions] = useState("0");
  const [status, setStatus] = useState<"Belum dibayar" | "Dibayar">("Belum dibayar");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!tenantId) {
      setRecords([]);
      setServices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const client = requireSupabase();
      const [payrollResult, serviceResult] = await Promise.all([
        client.from("app_records").select("id,module_key,data,created_at").eq("tenant_id", tenantId).eq("module_key", "Payroll").order("created_at", { ascending: false }),
        client.from("app_records").select("id,module_key,data,created_at").eq("tenant_id", tenantId).eq("module_key", "Servis HP").order("created_at", { ascending: false }),
      ]);
      if (payrollResult.error) throw payrollResult.error;
      if (serviceResult.error) throw serviceResult.error;
      setRecords((payrollResult.data || []).map((r: StoredRecord) => ({ id: r.id, ...(r.data as Omit<PayrollRecord, "id">) } as PayrollRecord)));
      setServices((serviceResult.data || []).map((r: StoredRecord) => r.data || {}));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Data payroll tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  const commissionTotal = useMemo(() => services
    .filter((service) => String(service.input_date || service.created_at || "").slice(0, 7) === period)
    .reduce((sum, service) => {
      const assignments = Array.isArray(service.technician_commissions) ? service.technician_commissions as Record<string, unknown>[] : [];
      return sum + assignments.filter((a) => String(a.technicianName || a.technician_name || "") === technician)
        .reduce((n, a) => n + asNumber(a.commissionAmount ?? a.commission_amount), 0);
    }, 0), [services, period, technician]);

  const draftTotal = asNumber(baseSalary) + commissionTotal + asNumber(bonus) - asNumber(deductions);
  const visible = records.filter((r) => r.period === period);
  const totalPayroll = visible.reduce((sum, r) => sum + Number(r.total || 0), 0);
  const unpaid = visible.filter((r) => r.status !== "Dibayar").reduce((sum, r) => sum + Number(r.total || 0), 0);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!tenantId) { setError("Workspace toko belum tersedia."); return; }
    if (!technician.trim()) { setError("Nama teknisi wajib diisi."); return; }
    if (draftTotal < 0) { setError("Total payroll tidak boleh negatif. Periksa potongan."); return; }
    if (records.some((r) => r.technician.toLowerCase() === technician.trim().toLowerCase() && r.period === period)) {
      setError("Payroll teknisi untuk periode ini sudah ada. Ubah catatan yang ada agar tidak terjadi pembayaran ganda.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const client = requireSupabase();
      const { data: auth } = await client.auth.getUser();
      const payload: Omit<PayrollRecord, "id"> = {
        technician: technician.trim(), period,
        base_salary: asNumber(baseSalary), commission_total: commissionTotal,
        bonus: asNumber(bonus), deductions: asNumber(deductions), total: draftTotal,
        status, ...(status === "Dibayar" ? { paid_at: new Date().toISOString() } : {}),
      };
      const { error: insertError } = await client.from("app_records").insert({
        tenant_id: tenantId, module_key: "Payroll", data: payload, created_by: auth.user?.id,
      });
      if (insertError) throw insertError;
      setNotice("Payroll tersimpan pada workspace aktif.");
      setTechnician(""); setBaseSalary("0"); setBonus("0"); setDeductions("0"); setStatus("Belum dibayar");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payroll gagal disimpan.");
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-xl border p-4"><p className="text-sm text-slate-500">Payroll periode ini</p><strong className="mt-1 block text-xl">{money(totalPayroll)}</strong></article>
        <article className="rounded-xl border p-4"><p className="text-sm text-slate-500">Belum dibayar</p><strong className="mt-1 block text-xl">{money(unpaid)}</strong></article>
        <article className="rounded-xl border p-4"><p className="text-sm text-slate-500">Catatan payroll</p><strong className="mt-1 block text-xl">{visible.length}</strong></article>
      </div>
      <form className="space-y-4 rounded-xl border p-4" onSubmit={save}>
        <h2 className="text-lg font-semibold">Buat payroll teknisi</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">Periode
            <input className="mt-1 w-full rounded-lg border p-2" type="month" required value={period} onChange={(e) => setPeriod(e.target.value)} />
          </label>
          <label className="block text-sm">Nama teknisi
            <input className="mt-1 w-full rounded-lg border p-2" required value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="Nama teknisi sesuai penugasan servis" />
          </label>
          <label className="block text-sm">Gaji pokok (Rp)
            <input className="mt-1 w-full rounded-lg border p-2" type="number" min="0" required value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} />
          </label>
          <label className="block text-sm">Bonus (Rp)
            <input className="mt-1 w-full rounded-lg border p-2" type="number" min="0" value={bonus} onChange={(e) => setBonus(e.target.value)} />
          </label>
          <label className="block text-sm">Potongan (Rp)
            <input className="mt-1 w-full rounded-lg border p-2" type="number" min="0" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
          </label>
          <label className="block text-sm">Status pembayaran
            <select className="mt-1 w-full rounded-lg border p-2" value={status} onChange={(e) => setStatus(e.target.value as "Belum dibayar" | "Dibayar")}>
              <option>Belum dibayar</option><option>Dibayar</option>
            </select>
          </label>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between"><span>Komisi jasa periode ini</span><strong>{money(commissionTotal)}</strong></div>
          <div className="mt-1 flex justify-between"><span>Total payroll</span><strong>{money(draftTotal)}</strong></div>
          <p className="mt-2 text-xs text-slate-500">Komisi hanya dibaca dari penugasan yang tersimpan pada tiket servis dan tidak mencakup harga spare part.</p>
        </div>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50" disabled={busy || !tenantId}>{busy ? "Menyimpan…" : "Simpan payroll"}</button>
      </form>
      {error && <p role="alert" className="rounded-lg border border-red-200 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border p-3 text-sm">{notice}</p>}
      <section className="overflow-x-auto rounded-xl border">
        <div className="p-4"><h2 className="font-semibold">Daftar payroll</h2><p className="text-sm text-slate-500">{loading ? "Memuat data…" : `${visible.length} catatan pada periode ${period}`}</p></div>
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead><tr className="border-y bg-slate-50"><th className="p-3">Teknisi</th><th className="p-3">Periode</th><th className="p-3 text-right">Gaji pokok</th><th className="p-3 text-right">Komisi</th><th className="p-3 text-right">Bonus</th><th className="p-3 text-right">Potongan</th><th className="p-3 text-right">Total</th><th className="p-3">Status</th></tr></thead>
          <tbody>{visible.length === 0 ? <tr><td className="p-5 text-center text-slate-500" colSpan={8}>Belum ada payroll untuk periode ini.</td></tr> : visible.map((r) => <tr key={r.id} className="border-b last:border-0"><td className="p-3 font-medium">{r.technician}</td><td className="p-3">{r.period}</td><td className="p-3 text-right">{money(r.base_salary)}</td><td className="p-3 text-right">{money(r.commission_total)}</td><td className="p-3 text-right">{money(r.bonus)}</td><td className="p-3 text-right">{money(r.deductions)}</td><td className="p-3 text-right font-semibold">{money(r.total)}</td><td className="p-3">{r.status}</td></tr>)}</tbody>
        </table>
      </section>
    </section>
  );
}
