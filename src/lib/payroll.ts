export type TechnicianAssignment = {
  technicianId: string;
  technicianName: string;
  commissionPercent: number;
};

export type TechnicianCommission = TechnicianAssignment & {
  commissionAmount: number;
};

export type PayrollInputs = {
  baseSalary: number;
  commissionTotal: number;
  bonus?: number;
  deductions?: number;
};

/**
 * Calculates technician commissions from labor/service fees only.
 * Spare parts are deliberately excluded from the commission base.
 */
export function calculateTechnicianCommissions(
  laborFee: number,
  assignments: TechnicianAssignment[],
): TechnicianCommission[] {
  if (!Number.isFinite(laborFee) || laborFee < 0) {
    throw new Error("Biaya jasa harus berupa angka nol atau lebih.");
  }

  const seen = new Set<string>();
  const totalPercent = assignments.reduce((sum, assignment) => {
    if (!assignment.technicianId.trim()) {
      throw new Error("Setiap penugasan harus memiliki teknisi.");
    }
    if (seen.has(assignment.technicianId)) {
      throw new Error("Teknisi yang sama tidak boleh ditugaskan dua kali pada satu tiket.");
    }
    seen.add(assignment.technicianId);

    const percent = assignment.commissionPercent;
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error("Persentase komisi harus di antara 0 dan 100.");
    }
    return sum + percent;
  }, 0);

  if (totalPercent > 100) {
    throw new Error("Total persentase komisi teknisi tidak boleh melebihi 100%.");
  }

  return assignments.map((assignment) => ({
    ...assignment,
    commissionAmount: Math.round((laborFee * assignment.commissionPercent) / 100),
  }));
}

export function calculatePayrollTotal({
  baseSalary,
  commissionTotal,
  bonus = 0,
  deductions = 0,
}: PayrollInputs): number {
  for (const [label, value] of Object.entries({
    baseSalary,
    commissionTotal,
    bonus,
    deductions,
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${label} harus berupa angka nol atau lebih.`);
    }
  }

  return baseSalary + commissionTotal + bonus - deductions;
}
