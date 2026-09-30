/** Claim registry — status = whether the *report thesis* holds at current config */

/**
 * @typedef {'supported'|'fragile'|'notSupported'} ClaimStatus
 * @typedef {{ id: string, statement: {vi:string,en:string}, test: (ctx:any) => {status:ClaimStatus, evidence:string} }} Claim
 */

/** @type {Claim[]} */
export const CLAIMS = [
  {
    id: "C1",
    statement: {
      vi: "Profile-λ / NLS fit tốt hơn OLS λ cố định nhưng nhân tố kém ổn định hơn.",
      en: "Profile-λ / NLS fits better than fixed-λ OLS but factors are less stable.",
    },
    test(ctx) {
      const corr = ctx.results?.factorCorr;
      if (corr == null) return { status: "fragile", evidence: "Chưa đo tương quan nhân tố tại cấu hình này." };
      if (corr < 0.6) return { status: "supported", evidence: `corr(β_profile, β_OLS)=${corr.toFixed(2)} < 0.6` };
      return { status: "notSupported", evidence: `corr=${corr.toFixed(2)} ≥ 0.6` };
    },
  },
  {
    id: "C2",
    statement: {
      vi: "AR không thắng RW có ý nghĩa thống kê 5% trên cấu hình đề án.",
      en: "AR does not beat RW at 5% on the report configuration.",
    },
    test(ctx) {
      const p = ctx.results?.dmP;
      const share = ctx.results?.specShareSig; // fraction of configs with p<0.05
      if (p == null) return { status: "fragile", evidence: "Chưa có DM p." };
      const thesisHolds = p >= 0.05;
      if (!thesisHolds) return { status: "notSupported", evidence: `p=${p.toFixed(3)} < 0.05 (AR thắng RW)` };
      if (share != null && share > 0.1)
        return { status: "fragile", evidence: `p=${p.toFixed(3)} nhưng ${(share * 100).toFixed(0)}% cấu hình lân cận có p<0.05` };
      return { status: "supported", evidence: `p=${p.toFixed(3)} ≥ 0.05` };
    },
  },
  {
    id: "C3",
    statement: {
      vi: "IRF Fed→Slope dương ở h=1…12 và CI 95% không chứa 0 (cấu hình mặc định).",
      en: "Fed→Slope IRF positive at h=1…12 with 95% CI excluding 0 (default).",
    },
    test(ctx) {
      const cells = ctx.results?.fedSlopeCells;
      if (!cells?.length) return { status: "fragile", evidence: "Chưa có IRF cell." };
      const ok = cells.every((c) => c.irf > 0 && c.lo > 0);
      const share = ctx.results?.irfSharePos;
      if (!ok) return { status: "notSupported", evidence: "Ít nhất một h∈{1..12} không dương rõ." };
      if (share != null && share < 0.8)
        return { status: "fragile", evidence: `Mặc định OK; chỉ ${(share * 100).toFixed(0)}% lưới ủng hộ tại h đang chọn` };
      return { status: "supported", evidence: `Fed→Slope h=1..12 dương, CI không chứa 0` };
    },
  },
  {
    id: "C4",
    statement: {
      vi: "Probit xếp hạng tốt (AUC>0.7) nhưng hiệu chuẩn xác suất kém (BSS<0).",
      en: "Probit ranks well (AUC>0.7) but is poorly calibrated (BSS<0).",
    },
    test(ctx) {
      const auc = ctx.results?.auc;
      const bss = ctx.results?.bss;
      if (auc == null || bss == null) return { status: "fragile", evidence: "Thiếu AUC/BSS." };
      const thesis = auc > 0.7 && bss < 0;
      if (thesis) return { status: "supported", evidence: `AUC=${auc.toFixed(3)}, BSS=${(bss * 100).toFixed(1)}%` };
      return { status: "notSupported", evidence: `AUC=${auc?.toFixed(3)}, BSS=${bss != null ? (bss * 100).toFixed(1) + "%" : "—"}` };
    },
  },
  {
    id: "C5",
    statement: {
      vi: "Việt Nam: AR không thắng RW có ý nghĩa trên các ô chính.",
      en: "Vietnam: AR does not significantly beat RW on main cells.",
    },
    test(ctx) {
      const rows = ctx.results?.vnArRows;
      if (!rows?.length) return { status: "fragile", evidence: "Chưa có bảng VN AR." };
      const sig = rows.filter((r) => Number(r.DM_pvalue ?? r.dm_p) < 0.05).length;
      if (sig === 0) return { status: "supported", evidence: `0/${rows.length} ô p<0.05` };
      if (sig / rows.length <= 0.15)
        return { status: "fragile", evidence: `${sig}/${rows.length} ô p<0.05` };
      return { status: "notSupported", evidence: `${sig}/${rows.length} ô p<0.05` };
    },
  },
];

export function evaluateClaims(lang, results) {
  const ctx = { results };
  return CLAIMS.map((c) => {
    const out = c.test(ctx);
    return {
      id: c.id,
      label: out.status,
      text: `${c.statement[lang] || c.statement.vi} — ${out.evidence}`,
      status: out.status,
    };
  });
}
