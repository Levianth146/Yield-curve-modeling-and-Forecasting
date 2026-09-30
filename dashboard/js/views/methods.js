import { el, fmt } from "../ui/kit.js";
import { pageHero } from "../ui/conclusion.js";
import { modelFormula } from "../content/attach.js";
import { reproducePython } from "../reproduce.js";
import { t } from "../i18n.js";

export async function mountMethods(ctx) {
  const { state, data, hero: heroEl, controls, viz, lang, selftestOk } = ctx;
  const vi = lang !== "en";
  controls.innerHTML = "";

  pageHero(heroEl, {
    eyebrow: vi ? "08 · Phương pháp" : "08 · Methods",
    title: t(lang, "h2Methods"),
    status: "supported",
    lang,
    headline: vi
      ? "Trang này gom dữ liệu, công thức, tham số cố định và mã tái lập — không phải kết luận nghiên cứu."
      : "This page collects data, formulas, fixed parameters and reproduce code — not research claims.",
    body: vi
      ? "<p>Đọc từ trên xuống hoặc nhảy bằng mục lục. Công thức dùng cùng ký hiệu như trong báo cáo; ví dụ số động nằm ở từng trang kết quả.</p>"
      : "<p>Read top to bottom or jump via the table of contents. Notation matches the report; live numeric examples sit on each results page.</p>",
  });

  const toc = el("nav", { class: "methods-toc", "aria-label": vi ? "Mục lục" : "Contents" },
    [["#m-data", vi ? "Dữ liệu" : "Data"],
     ["#m-ns", "Nelson–Siegel"],
     ["#m-ar", "AR / DM"],
     ["#m-var", "VAR / IRF"],
     ["#m-probit", "Probit"],
     ["#m-vn", vi ? "Việt Nam" : "Vietnam"],
     ["#m-params", vi ? "Tham số cố định" : "Fixed parameters"],
     ["#m-repro", vi ? "Tái lập Python" : "Reproduce"],
     ["#m-lit", vi ? "Tài liệu" : "Literature"],
     ["#m-test", vi ? "Self-test" : "Self-test"],
    ].map(([href, lab]) => el("a", { href }, lab)),
  );

  const body = el("div", { class: "methods-body" });
  const m = data.manifest || {};

  body.append(
    el("h2", { id: "m-data" }, vi ? "Dữ liệu" : "Data"),
    el("p", { html: vi
      ? `FRED: DGS1MO…DGS30 (lợi suất Kho bạc Mỹ), USREC/NBER (suy thoái), CPIAUCSL, FEDFUNDS. Việt Nam: Investing.com (giá tham khảo, không phải đường cong chính thức). Phạm vi chính Mỹ từ <span class="num">2000-01</span>; dữ liệu đến <span class="num">${fmt.dateText(m.data_end)}</span>.`
      : `FRED: DGS1MO…DGS30, USREC/NBER, CPIAUCSL, FEDFUNDS. Vietnam: Investing.com (reference quotes). US core from <span class="num">2000-01</span>; data through <span class="num">${fmt.dateISO(m.data_end)}</span>.` }),
    el("p", { html: vi
      ? "Nelson–Siegel cần ≥ 9 trên 10 kỳ hạn mỗi ngày (bỏ DGS1MO khỏi fit). Không ffill lợi suất."
      : "Nelson–Siegel needs ≥ 9 of 10 maturities per day (DGS1MO display-only). No yield forward-fill." }),
  );

  const sections = [
    ["m-ns", "ns", "Nelson–Siegel"],
    ["m-ar", "ar", "AR / random walk / Diebold–Mariano"],
    ["m-var", "var", "VAR / Cholesky / IRF"],
    ["m-probit", "probit", "Probit"],
    ["m-vn", "vn", vi ? "Mở rộng Việt Nam" : "Vietnam extension"],
  ];
  for (const [id, fid, title] of sections) {
    body.append(el("h2", { id }, title));
    body.append(modelFormula(lang, fid));
  }

  body.append(
    el("h2", { id: "m-params" }, vi ? "Bảng tham số cố định" : "Fixed parameters"),
    el("table", { class: "tbl" },
      el("thead", {}, el("tr", {}, el("th", {}, vi ? "Tham số" : "Parameter"), el("th", {}, vi ? "Giá trị" : "Value"))),
      el("tbody", {},
        [["λ (NS)", "0.7308"], ["NS_MIN_OBS", "9"], ["AR_MAX_LAG", "12"], [vi ? "Tiêu chí lag" : "Lag IC", "BIC"],
          [vi ? "Chia mẫu AR" : "AR split", "2015-12-31"], [vi ? "Probit train ≤" : "Probit train ≤", "1998-12"],
          [vi ? "Probit test ≥" : "Probit test ≥", "2000-01"], ["n_boot (mặc định / khác)", "300 / 200"],
        ].map(([k, v]) => el("tr", {}, el("td", {}, k), el("td", { class: "mono" }, v))),
      ),
    ),
  );

  const routes = ["curve", "arena", "irf", "probit", "vietnam"];
  const reproBox = el("div", { id: "m-repro" });
  reproBox.append(el("h2", {}, vi ? "Dành cho người tái lập" : "For reproducers"));
  for (const route of routes) {
    const st = { ...state, route };
    const text = reproducePython(st);
    const pre = el("pre", { class: "reproduce-pre" }, text);
    const btn = el("button", { type: "button", class: "btn-copy", onclick: () => {
      navigator.clipboard?.writeText(text).then(() => { btn.textContent = vi ? "Đã chép" : "Copied"; setTimeout(() => { btn.textContent = vi ? "Sao chép" : "Copy"; }, 1200); });
    } }, vi ? "Sao chép" : "Copy");
    reproBox.append(
      el("details", { class: "drawer" },
        el("summary", {}, `${vi ? "Mã cho trang" : "Code for"} ${route}`),
        el("div", { class: "drawer-body" }, el("div", { class: "reproduce-toolbar" }, btn), pre),
      ),
    );
  }
  body.append(reproBox);

  body.append(
    el("h2", { id: "m-lit" }, vi ? "Tài liệu" : "Literature"),
    el("ul", {},
      el("li", {}, "Nelson & Siegel (1987)"),
      el("li", {}, "Diebold & Li (2006)"),
      el("li", {}, "Diebold & Mariano (1995)"),
      el("li", {}, "Harvey, Leybourne & Newbold (1997)"),
      el("li", {}, "Sims (1980)"),
      el("li", {}, "Estrella & Mishkin (1998)"),
      el("li", {}, "Brier (1950)"),
    ),
    el("h2", { id: "m-test" }, "Self-test"),
    el("p", { html: selftestOk
      ? (vi ? "Engine khớp bản Python (mở <code>?selftest=1</code> để chạy lại). Dấu ✓ ở footer khi pass." : "Engine matches Python (open <code>?selftest=1</code> to re-run). Checkmark in the footer when pass.")
      : (vi ? "Self-test thất bại hoặc chưa chạy — xem banner." : "Self-test failed or not run — see banner.") }),
  );

  viz.append(el("div", { class: "methods-layout" }, toc, body));
}
