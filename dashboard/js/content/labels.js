/** Display labels — never show internal keys in the UI. */

const MAP = {
  vi: {
    "factor.level": "Level (mức)",
    "factor.slope": "Slope (độ dốc)",
    "factor.curvature": "Curvature (độ võng)",
    "lag.bic": "Tiêu chí BIC",
    "lag.aic": "Tiêu chí AIC",
    "window.expanding": "Mở rộng dần",
    "window.rolling": "Trượt 120 tháng",
    "loss.se": "Bình phương sai số (MSE)",
    "loss.ae": "Sai số tuyệt đối (MAE)",
    "h.1": "1 tháng tới",
    "h.3": "3 tháng tới",
    "h.6": "6 tháng tới",
    "h.12": "12 tháng tới",
    "method.ols_fixed": "OLS · λ cố định",
    "method.ols_profile": "λ tối ưu theo ngày",
    "method.compare": "So sánh cả hai",
    "probit.spread": "Spread 10 năm − 2 năm",
    "probit.dummy": "Biến giả đảo ngược (spread < 0)",
    "probit.spread_10y2y_fixed": "Spread 10 năm − 2 năm",
    "probit.inversion_dummy_fixed": "Biến giả đảo ngược",
    "probit.spread_10y3m_fixed": "Spread 10 năm − 3 tháng",
    "irf.preset.cpi_fed_lsc": "CPI → Fed → Level, Slope, Curvature",
    "irf.preset.fed_cpi_lsc": "Fed → CPI → Level, Slope, Curvature",
    "irf.preset.cpi_fed_slc": "CPI → Fed → Slope, Level, Curvature",
    "irf.preset.lsc_cpi_fed": "Level, Slope, Curvature → CPI → Fed",
    "irf.preset.cpi_lsc_fed": "CPI → Level, Slope, Curvature → Fed",
    "irf.preset.fed_lsc_cpi": "Fed → Level, Slope, Curvature → CPI",
    "irf.lag.p2": "2 độ trễ",
    "irf.lag.p4": "4 độ trễ",
    "irf.lag.p6": "6 độ trễ",
    "irf.lag.p12": "12 độ trễ",
    "irf.lag.aic_port": "AIC + Portmanteau",
    "irf.lag.bic": "BIC",
    "irf.infl.cpi_mom_ann_w2": "Lạm phát MoM quy năm (winsor 2%)",
    "irf.infl.cpi_mom_ann_w0": "Lạm phát MoM quy năm (không winsor)",
    "irf.infl.cpi_mom_ann_w5": "Lạm phát MoM quy năm (winsor 5%)",
    "irf.infl.cpi_yoy": "Lạm phát so với cùng kỳ năm trước",
    "irf.i1.adf": "ADF chọn sai phân",
    "irf.i1.force_fed_slope": "Ép sai phân Fed và Slope",
    "var.cpi_mom_ann": "Lạm phát CPI",
    "var.fed_funds": "Lãi suất Fed Funds",
    "var.level": "Level",
    "var.slope": "Slope",
    "var.curvature": "Curvature",
  },
  en: {
    "factor.level": "Level",
    "factor.slope": "Slope",
    "factor.curvature": "Curvature",
    "lag.bic": "BIC criterion",
    "lag.aic": "AIC criterion",
    "window.expanding": "Expanding window",
    "window.rolling": "Rolling 120 months",
    "loss.se": "Squared error (MSE)",
    "loss.ae": "Absolute error (MAE)",
    "h.1": "1 month ahead",
    "h.3": "3 months ahead",
    "h.6": "6 months ahead",
    "h.12": "12 months ahead",
    "method.ols_fixed": "OLS · fixed λ",
    "method.ols_profile": "Per-day best λ",
    "method.compare": "Compare both",
    "probit.spread": "10Y − 2Y spread",
    "probit.dummy": "Inversion dummy (spread < 0)",
    "probit.spread_10y2y_fixed": "10Y − 2Y spread",
    "probit.inversion_dummy_fixed": "Inversion dummy",
    "probit.spread_10y3m_fixed": "10Y − 3M spread",
    "irf.preset.cpi_fed_lsc": "CPI → Fed → Level, Slope, Curvature",
    "irf.preset.fed_cpi_lsc": "Fed → CPI → Level, Slope, Curvature",
    "irf.preset.cpi_fed_slc": "CPI → Fed → Slope, Level, Curvature",
    "irf.preset.lsc_cpi_fed": "Level, Slope, Curvature → CPI → Fed",
    "irf.preset.cpi_lsc_fed": "CPI → Level, Slope, Curvature → Fed",
    "irf.preset.fed_lsc_cpi": "Fed → Level, Slope, Curvature → CPI",
    "irf.lag.p2": "2 lags",
    "irf.lag.p4": "4 lags",
    "irf.lag.p6": "6 lags",
    "irf.lag.p12": "12 lags",
    "irf.lag.aic_port": "AIC + Portmanteau",
    "irf.lag.bic": "BIC",
    "irf.infl.cpi_mom_ann_w2": "MoM annualised inflation (winsor 2%)",
    "irf.infl.cpi_mom_ann_w0": "MoM annualised inflation (no winsor)",
    "irf.infl.cpi_mom_ann_w5": "MoM annualised inflation (winsor 5%)",
    "irf.infl.cpi_yoy": "Year-over-year inflation",
    "irf.i1.adf": "ADF selects differencing",
    "irf.i1.force_fed_slope": "Force-diff Fed and Slope",
    "var.cpi_mom_ann": "CPI inflation",
    "var.fed_funds": "Fed Funds rate",
    "var.level": "Level",
    "var.slope": "Slope",
    "var.curvature": "Curvature",
  },
};

/**
 * @param {string} groupDotKey e.g. 'factor.level' or ('factor','level')
 * @param {string} [key]
 * @param {string} [lang]
 */
export function label(groupDotKey, key, lang) {
  let id, L;
  if (key != null && typeof key === "string" && (lang === "vi" || lang === "en" || lang == null) && !groupDotKey.includes(".")) {
    // label('factor', 'level', lang)
    id = `${groupDotKey}.${key}`;
    L = lang || "vi";
  } else if (typeof key === "string" && (key === "vi" || key === "en")) {
    id = groupDotKey;
    L = key;
  } else {
    id = groupDotKey;
    L = lang || "vi";
  }
  return MAP[L]?.[id] ?? MAP.vi[id] ?? MAP.en[id] ?? id;
}

export default label;
