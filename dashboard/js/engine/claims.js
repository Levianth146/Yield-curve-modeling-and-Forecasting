/** Generate claim ledger lines from bench results */

export { evaluateClaims, CLAIMS } from "./claims/registry.js";

export function claimCurve(lang, res) {
  if (!res) return [];
  const vi = lang === "vi";
  return [
    {
      label: "fragile",
      text: vi
        ? `Ở λ = ${res.lam.toFixed(4)}, RMSE ≈ ${(res.rmse * 100).toFixed(1)} bp. Fit tốt hơn không đồng nghĩa nhân tố ổn định (xem C1).`
        : `At λ = ${res.lam.toFixed(4)}, RMSE ≈ ${(res.rmse * 100).toFixed(1)} bp. Better fit ≠ stable factors (see C1).`,
    },
  ];
}

export function claimArena(lang, dm, cfg) {
  const vi = lang === "vi";
  const p = dm?.p_value;
  const thesis = p != null && p >= 0.05;
  return [
    {
      label: thesis ? "supported" : "notSupported",
      text: vi
        ? `C2 @ ${cfg.factor} h=${cfg.h}: AR ${thesis ? "không" : "có thể"} thắng RW ở 5% (p = ${p?.toFixed(3) ?? "—"}). DM>0 nghĩa là RW tốt hơn AR.`
        : `C2 @ ${cfg.factor} h=${cfg.h}: AR ${thesis ? "does not" : "may"} beat RW at 5% (p = ${p?.toFixed?.(3) ?? "—"}).`,
    },
  ];
}

export function claimIrf(lang, cell) {
  const vi = lang === "vi";
  if (!cell) {
    return [{ label: "fragile", text: vi ? "Cấu hình chưa tính sẵn trong lưới IRF." : "Config not precomputed in IRF grid." }];
  }
  const ok = cell.irf > 0 && cell.lo > 0;
  return [
    {
      label: ok ? "supported" : "fragile",
      text: vi
        ? `C3: IRF ${cell.impulse}→${cell.response} h=${cell.h}: ${cell.irf?.toFixed(3)} (CI ${cell.lo?.toFixed(3)}…${cell.hi?.toFixed(3)}).`
        : `C3: IRF ${cell.impulse}→${cell.response} h=${cell.h}: ${cell.irf?.toFixed(3)}.`,
    },
  ];
}

export function claimProbit(lang, m) {
  const vi = lang === "vi";
  const thesis = m?.auc > 0.7 && m?.bss < 0;
  return [
    {
      label: thesis ? "supported" : "notSupported",
      text: vi
        ? `C4: AUC ≈ ${m?.auc?.toFixed(3) ?? "—"}, BSS ≈ ${m?.bss != null ? (m.bss * 100).toFixed(1) + "%" : "—"} (kết luận đề án: xếp hạng tốt, hiệu chuẩn kém).`
        : `C4: AUC ≈ ${m?.auc?.toFixed(3)}, BSS ≈ ${m?.bss != null ? (m.bss * 100).toFixed(1) + "%" : "—"}.`,
    },
  ];
}

export function renderLedger(container, items, lang, t) {
  container.innerHTML = "";
  for (const it of items) {
    const div = document.createElement("div");
    div.className = `claim claim-${it.label || it.status || "fragile"}`;
    const badge = document.createElement("span");
    badge.className = "claim-badge";
    const key = it.label || it.status || "fragile";
    badge.textContent = t(lang, key === "notSupported" ? "notSupported" : key);
    const p = document.createElement("p");
    p.textContent = it.text;
    div.append(badge, p);
    container.appendChild(div);
  }
}
