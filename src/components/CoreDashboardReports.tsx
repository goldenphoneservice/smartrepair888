import type { ReactNode } from "react";

export type CoreDashboardMetrics = {
  activeServices: number;
  completedServices: number;
  salesTotal: number;
  purchasesTotal: number;
  expensesTotal: number;
  inventoryValue: number;
  payrollTotal: number;
  payrollUnpaid: number;
  technicianCommission: number;
  cashNet: number;
  grossProfitEstimate: number;
};

type Props = {
  metrics: CoreDashboardMetrics;
  onNavigate?: (module: string) => void;
};

const money = (n: number) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(Number.isFinite(n) ? n : 0);

function MetricCard({ title, value, note, onClick }: {
  title: string;
  value: string;
  note: string;
  onClick?: () => void;
}) {
  const content: ReactNode = <>
    <span className="text-sm text-slate-500">{title}</span>
    <strong className="mt-2 block text-xl font-semibold">{value}</strong>
    <span className="mt-1 block text-xs text-slate-500">{note}</span>
  </>;
  return onClick
    ? <button type="button" onClick={onClick} className="rounded-xl border p-4 text-left transition hover:shadow-sm">{content}</button>
    : <article className="rounded-xl border p-4">{content}</article>;
}

/**
 * Presentation-only dashboard component. The parent must calculate metrics from
 * tenant-filtered records and pass the active tenant's values.
 */
export default function CoreDashboardReports({ metrics, onNavigate }: Props) {
  const cards = [
    { title: "Servis aktif", value: String(metrics.activeServices), note: "Tiket yang belum selesai", module: "Servis HP" },
    { title: "Servis selesai", value: String(metrics.completedServices), note: "Jumlah tiket selesai", module: "Servis HP" },
    { title: "Omzet penjualan", value: money(metrics.salesTotal), note: "Total penjualan periode laporan", module: "Penjualan" },
    { title: "Pembelian", value: money(metrics.purchasesTotal), note: "Total pembelian tercatat", module: "Pembelian" },
    { title: "Pengeluaran", value: money(metrics.expensesTotal), note: "Biaya operasional tercatat", module: "Pengeluaran" },
    { title: "Nilai stok", value: money(metrics.inventoryValue), note: "Estimasi stok × harga modal", module: "Inventori" },
    { title: "Komisi teknisi", value: money(metrics.technicianCommission), note: "Komisi dari biaya jasa saja", module: "Servis HP" },
    { title: "Total payroll", value: money(metrics.payrollTotal), note: "Gaji + komisi + bonus − potongan", module: "Payroll" },
    { title: "Payroll belum dibayar", value: money(metrics.payrollUnpaid), note: "Kewajiban payroll tersisa", module: "Payroll" },
    { title: "Arus kas bersih", value: money(metrics.cashNet), note: "Penjualan − pembelian − pengeluaran", module: "Akuntansi" },
    { title: "Estimasi laba sederhana", value: money(metrics.grossProfitEstimate), note: "Bukan laporan akuntansi final", module: "Akuntansi" },
  ];
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Dashboard Inti</h2>
        <p className="text-sm text-slate-500">Ringkasan operasional, stok, keuangan, dan payroll untuk workspace aktif.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <MetricCard key={card.title} {...card} onClick={onNavigate ? () => onNavigate(card.module) : undefined} />)}
      </div>
      <p className="text-xs text-slate-500">Angka ini hanya akurat jika transaksi tercatat lengkap. Arus kas dan laba pada kartu ini merupakan indikator ringkas, bukan pengganti rekonsiliasi bank, jurnal akuntansi, atau laporan pajak.</p>
    </section>
  );
}
