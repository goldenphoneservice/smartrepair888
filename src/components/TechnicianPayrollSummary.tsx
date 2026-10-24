import React from "react";

export type TechnicianPayrollRow = {
  id: string;
  name: string;
  baseSalary: number;
  commissionTotal: number;
  bonus: number;
  deductions: number;
  paid: boolean;
};

type Props = {
  rows: TechnicianPayrollRow[];
  currency?: string;
};

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

export default function TechnicianPayrollSummary({
  rows,
  currency = "IDR",
}: Props) {
  const totalPayable = rows.reduce(
    (sum, row) => sum + row.baseSalary + row.commissionTotal + row.bonus - row.deductions,
    0,
  );
  const unpaid = rows
    .filter((row) => !row.paid)
    .reduce(
      (sum, row) => sum + row.baseSalary + row.commissionTotal + row.bonus - row.deductions,
      0,
    );

  return (
    <section aria-labelledby="technician-payroll-heading" className="space-y-4">
      <h2 id="technician-payroll-heading" className="text-lg font-semibold">
        Ringkasan Payroll Teknisi
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <article className="rounded-xl border p-4">
          <p className="text-sm text-slate-500">Total payroll</p>
          <p className="mt-1 text-xl font-semibold">{money(totalPayable, currency)}</p>
        </article>
        <article className="rounded-xl border p-4">
          <p className="text-sm text-slate-500">Belum dibayar</p>
          <p className="mt-1 text-xl font-semibold">{money(unpaid, currency)}</p>
        </article>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-slate-600">
              <th className="p-3 font-medium">Teknisi</th>
              <th className="p-3 text-right font-medium">Gaji pokok</th>
              <th className="p-3 text-right font-medium">Komisi</th>
              <th className="p-3 text-right font-medium">Bonus</th>
              <th className="p-3 text-right font-medium">Potongan</th>
              <th className="p-3 text-right font-medium">Total</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Belum ada data payroll untuk ditampilkan.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const total =
                  row.baseSalary + row.commissionTotal + row.bonus - row.deductions;
                return (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-right">{money(row.baseSalary, currency)}</td>
                    <td className="p-3 text-right">{money(row.commissionTotal, currency)}</td>
                    <td className="p-3 text-right">{money(row.bonus, currency)}</td>
                    <td className="p-3 text-right">{money(row.deductions, currency)}</td>
                    <td className="p-3 text-right font-semibold">{money(total, currency)}</td>
                    <td className="p-3">
                      <span
                        className={row.paid
                          ? "rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"
                          : "rounded-full bg-amber-50 px-2 py-1 text-amber-700"}
                      >
                        {row.paid ? "Lunas" : "Belum dibayar"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Komisi teknisi dihitung dari biaya jasa saja; harga spare part tidak termasuk.
      </p>
    </section>
  );
}
