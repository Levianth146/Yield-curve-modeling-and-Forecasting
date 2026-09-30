<div align="right"><b>English</b> · <a href="README.vi.md">Tiếng Việt</a></div>

# Yield Curve Modeling and Forecasting

**Project 04 · US Treasury yield curve: Nelson–Siegel → forecasting → Fed shocks → recession signal → Vietnam extension**

> In one sentence: we take the interest rates of US government bonds for 10 maturities, squeeze the whole curve into three easy-to-read numbers (Level, Slope, Curvature), and then ask four practical questions about them. Can they be forecast? How does the Fed move them? Do they warn of a recession? Does the same idea work for Vietnam?

---

## Contents

1. [What you get: results at a glance](#1-what-you-get-results-at-a-glance)
2. [Start here: pick your path](#2-start-here-pick-your-path)
3. [Path A. Just look at the results (dashboard, 5 minutes)](#3-path-a-just-look-at-the-results-dashboard-5-minutes)
4. [Path B. Re-run everything yourself](#4-path-b-re-run-everything-yourself)
5. [Path C. Read the study](#5-path-c-read-the-study)
6. [The framework, step by step (RQ1 → RQ5)](#6-the-framework-step-by-step-rq1--rq5)
7. [Plain-language glossary](#7-plain-language-glossary)
8. [Using your own Vietnam data](#8-using-your-own-vietnam-data)
9. [Repository map](#9-repository-map)
10. [Troubleshooting (FAQ)](#10-troubleshooting-faq)
11. [Limitations and honest caveats](#11-limitations-and-honest-caveats)
12. [Working as a team, references](#12-working-as-a-team-references)

---

## 1. What you get: results at a glance

A **yield curve** is a line showing the interest rate the government pays for borrowing over 3 months, 1 year, 2 years … 30 years. Its shape carries information about what the market expects. We ask five questions and give the answer to each.

| # | Question | Short answer |
|---|---|---|
| **RQ1** | Can 3 numbers describe the whole curve? | **Yes.** Nelson–Siegel fits with an average error of about **9 bp** (0.09 percentage points), under our 10 bp target. |
| **RQ2** | Can a statistical model (AR) forecast those numbers better than the naive rule "next month = this month" (random walk)? | **No, not significantly.** The naive rule wins at 1 month and ties at 12 months. Only Curvature shows a small, non-significant edge for AR. |
| **RQ3** | If the Fed raises rates suddenly, what happens to the curve? | The **Slope rises** (short rates move up faster than long rates, so the curve flattens) and Curvature falls; Level barely reacts. The result is **robust across many settings, but depends on the assumed ordering of variables**, so read it as *fragile-to-moderate* evidence. |
| **RQ4** | Does an inverted curve (10Y − 2Y below zero) warn of recession within 12 months? | It **ranks risk well** (AUC **0.82**) but its **probabilities are not well calibrated** (worse than a constant guess, Brier skill score **−15%**) and it gave a long false alarm in 2022–2026. |
| **RQ5** | Does the same method work for Vietnam? | **Partly.** Three factors describe Vietnam's curve, but its best λ is different (**0.40** vs 0.7308 for the US) and its factors do not move with the US ones. Data are reference prices, not the official curve. |

> **How to read "bp":** 1 bp (basis point) = 0.01 percentage point. 9 bp = 0.09 %.
>
> **Sign rule you will meet everywhere:** in this project **Slope = short rate − long rate**. **Negative Slope = normal upward-sloping curve. Positive Slope = inverted curve.**

Full text, tables and figures: [`docs/report/report.md`](docs/report/report.md) (also as Word: `docs/report/Yield_curve_report.docx`).

---

## 2. Start here: pick your path

| I want to… | Go to | Needs | Time |
|---|---|---|---|
| **See and play with the results** without installing much | [Path A](#3-path-a-just-look-at-the-results-dashboard-5-minutes) | Python only | ~5 min |
| **Re-create every number and chart** from raw data | [Path B](#4-path-b-re-run-everything-yourself) | Python + internet (first run) | 10–60 min |
| **Understand the study** without running anything | [Path C](#5-path-c-read-the-study) | A browser | – |

If you are unsure, start with **Path A**. It works even if you have never programmed.

---

## 3. Path A. Just look at the results (dashboard, 5 minutes)

The dashboard ("Yield Curve Lab") is a small website that runs on your own computer. It already contains all the data it needs (folder `dashboard/data/`), so you do **not** have to run the analysis first.

### Step 1: Install Python (once)
- Download Python **3.10 or newer** from <https://www.python.org/downloads/>.
- **Windows:** during installation, tick **"Add python.exe to PATH"**.
- Check it worked: open a terminal (Windows: press the Windows key, type `PowerShell`, Enter; macOS: open *Terminal*) and type `python --version`. On macOS/Linux use `python3` if `python` is not found.

### Step 2: Get the project
- Easiest: on the GitHub page click the green **Code** button → **Download ZIP**, then unzip it.
- Or with git: `git clone https://github.com/Levianth146/Yield-curve-modeling-and-Forecasting`

### Step 3: Start the dashboard
In the terminal, go into the project folder and then into `dashboard`, and start a tiny local web server:

```bash
cd Yield-curve-modeling-and-Forecasting/dashboard
python -m http.server 8765
```

(Use `python3` instead of `python` if needed. Leave this window open. It is the server.)

### Step 4: Open it
Open your browser and go to **<http://127.0.0.1:8765/>**.
To stop: click the terminal window and press `Ctrl + C`.

### How to use the dashboard
The tabs across the top follow the study in order:

| Tab | The question it answers | What to try |
|---|---|---|
| **Today** | What does the curve look like now, and is it inverted? | Drag the date slider back to 2007, 2019, 2022 and watch the shape change. |
| **Factors** | How do Level / Slope / Curvature describe the curve? | Change λ and see whether the factors stay stable. |
| **Forecast** | Does AR beat "next month = this month"? | Switch factor and horizon (1/3/6/12 months); read the *p-value* box. |
| **Fed shock** | What does a Fed rate surprise do to the curve? | Change lag length and variable ordering; the shaded band is the 95 % uncertainty range. |
| **Recession** | Does an inverted curve warn of recession? | Move the decision threshold and watch the false-alarm / hit trade-off. |
| **Vietnam** | Does the method work for Vietnam? | Compare Vietnam's λ with the US one. |
| **Summary** | Which conclusions are solid, which are fragile? | Start here if you only have two minutes. |

Every page has the same layout: **question → one-sentence conclusion → chart → "what it means / how reliable / limits"**. The settings you choose are stored in the web address, so you can copy the link to share exactly what you are looking at.

> Adding `?selftest=1` to the address (`http://127.0.0.1:8765/?selftest=1`) makes the dashboard check its own calculations against the Python results. A green banner means they match.

---

## 4. Path B. Re-run everything yourself

### Step 1: Install the libraries (once)
```bash
cd Yield-curve-modeling-and-Forecasting
python -m venv .venv                 # optional but tidy
# Windows PowerShell:  .venv\Scripts\Activate.ps1
# macOS / Linux:       source .venv/bin/activate
pip install -r requirements.txt
```

### Step 2 (optional): FRED API key
The data come from FRED (Federal Reserve Bank of St. Louis).
- **No key is needed.** If you have none, the code automatically downloads FRED's public CSV files.
- A free key is faster and more reliable: <https://fred.stlouisfed.org/docs/api/api_key.html>. Then set it before running:
  - Windows PowerShell: `$env:FRED_API_KEY="your_key"`
  - Windows cmd: `set FRED_API_KEY=your_key`
  - macOS / Linux: `export FRED_API_KEY=your_key`
- Never write the key inside code or commit it. The file `.env` is git-ignored; `.env.example` shows the format.

### Step 3: Run the whole pipeline
```bash
python scripts/run_pipeline.py
```
This runs RQ1 → RQ4, the Vietnam extension, the interactive charts and the dashboard export, in order, and prints progress. The Fed-shock grid for the dashboard is the slowest part.

Useful options:

| Command | What it does |
|---|---|
| `python scripts/run_pipeline.py` | Normal run, **reuses cached downloads** in `data/`. |
| `python scripts/run_pipeline.py --refresh` | Downloads fresh data from FRED first. |
| `python scripts/run_pipeline.py --skip-irf-export` | Skips the slowest dashboard step (quick test). |
| `python scripts/run_pipeline.py --no-dashboard` | Does not export data for the dashboard. |
| `python scripts/run_pipeline.py --check` | Only checks that the dashboard's JavaScript gives the same numbers as Python. |

### Step 4: Find the results
- Tables and figures: **`outputs/`** (file names start with `rq1_`, `rq2_`, … `vn_`).
- Intermediate series: **`data/`**.
- What each file and column means: [`docs/data_dictionary.md`](docs/data_dictionary.md).
- Look at the step-by-step notebooks: `jupyter notebook`, then open `notebooks/01_…` to `05_…`.

> **Rule:** never edit files in `data/` or `outputs/` by hand. Change the code in `src/` and re-run, otherwise numbers, report and dashboard drift apart.

### Step 5: Refresh the dashboard with new numbers
```bash
python scripts/export_dashboard_data.py          # add --skip-irf for a quick refresh
cd dashboard
python -m http.server 8765
```

### Automated checks
```bash
python scripts/run_pipeline.py --check     # Python vs dashboard parity
node dashboard/tests/run_all.mjs           # dashboard unit tests (needs Node.js)
```

---

## 5. Path C. Read the study

| Read | Where |
|---|---|
| Full report (intro, literature, method, results, conclusion) | [`docs/report/report.md`](docs/report/report.md) |
| Meaning of every data file | [`docs/data_dictionary.md`](docs/data_dictionary.md) |
| Vietnam data guide | [`docs/vn_data_guide.md`](docs/vn_data_guide.md) |

---

## 6. The framework, step by step (RQ1 → RQ5)

```
US Treasury yields (FRED, daily, 2000 → now)
        │
        ▼
 RQ1  Nelson–Siegel each day  →  Level · Slope · Curvature
        │
   ┌────┴───────────────────────┐
   ▼                            ▼
 RQ2  AR vs random walk      RQ3  VAR with inflation + Fed funds → shocks (IRF)
   └────────────┬───────────────┘
                ▼
 RQ4  10Y − 2Y spread → Probit → recession within 12 months (NBER labels)
                ▼
 RQ5  Same idea on Vietnam government bonds (robustness / extension)
```

### RQ1. Describe the curve (Nelson–Siegel)
- **Idea:** every day the curve is written as `Level + Slope × (short-term weight) + Curvature × (medium-term weight)`. We fit the three numbers by least squares with a fixed decay λ = 0.7308 (= 12 × 0.0609, the Diebold–Li value converted from months to years).
- **Code:** `src/nelson_siegel.py` · **Notebook:** `01_ns_estimation.ipynb` · **Output:** `outputs/rq1_*`
- **Conclusion:** fits well (average error ≈ 9 bp). Letting λ float each day fits tighter (5.1 bp) but the factors become **unstable** (correlation with the fixed-λ factors only 0.37 / 0.55 / 0.31), so we keep fixed λ.

### RQ2. Forecast the factors (AR vs random walk)
- **Idea:** forecast each factor 1, 3, 6, 12 months ahead with an AR model (lags chosen by BIC, up to 12) and compare with "no change". The Diebold–Mariano test tells us whether a difference in error is real or luck.
- **Code:** `src/forecasting.py` · **Notebook:** `02_ar_forecast.ipynb` · **Output:** `outputs/rq2_*`
- **Conclusion:** AR does **not** significantly beat the random walk on any factor or horizon. Treat the naive rule as the benchmark to beat.

### RQ3. Fed and inflation shocks (VAR and impulse responses)
- **Idea:** model inflation, the Fed funds rate and the three factors together (VAR). Then give the Fed rate a one-standard-deviation surprise (≈ 9 bp) and trace how the factors respond month by month (IRF), with a bootstrap 95 % band.
- **Code:** `src/var_analysis.py`, `src/dashboard_irf_grid.py` · **Notebook:** `03_var_irf.ipynb` · **Output:** `outputs/rq3_*`
- **Conclusion:** after a Fed surprise the Slope rises and Curvature falls; Level does not move. The Slope result holds in most (182 of 288) tested model settings but is **sensitive to variable ordering**, so it is moderate, not proof of causation.

### RQ4. Recession warning (Probit)
- **Idea:** does a low or negative 10Y − 2Y spread today predict an NBER recession in the next 12 months? Train 1976–1998, test 2000–2025, with a stress look at 2022–2026.
- **Code:** `src/probit_recession.py` · **Notebook:** `04_probit_recession.ipynb` · **Output:** `outputs/rq4_*`
- **Conclusion:** good at *ranking* months by risk (AUC 0.82), poor at giving *accurate probabilities* (BSS −15 %). Only 35 positive training months from 3 recessions, so be modest.

### RQ5. Vietnam extension
- **Idea:** repeat Nelson–Siegel on Vietnamese government bond yields (7 maturities, 1–15 years), pick Vietnam's own λ, compare factors with the US.
- **Code:** `src/vn_extension.py` · **Notebook:** `05_vn_extension.ipynb` · **Output:** `outputs/vn_*`
- **Conclusion:** works as a description; best λ ≈ 0.40 (error 7.7 bp vs 9.9 bp at the US λ); level factors do not move with the US. Data are Investing.com reference prices, not the official HNX/VBMA curve, and many days repeat the previous value.

---

## 7. Plain-language glossary

| Term | Meaning |
|---|---|
| **Yield / interest rate** | The annual return on a government bond, in %. |
| **Maturity** | How long until the bond is repaid (3M = 3 months, 10Y = 10 years). |
| **Level** | Overall height of the curve; roughly the long-term rate. |
| **Slope** | *Short rate − long rate.* **Negative = normal upward curve; positive = inverted.** |
| **Curvature** | How much the middle (2–3 years) bulges above or below a straight line between the ends. |
| **Inverted curve** | Short rates higher than long rates; historically often precedes recessions. |
| **λ (lambda)** | Controls how quickly the Slope/Curvature effects fade with maturity. |
| **bp** | Basis point = 0.01 percentage point. |
| **Random walk** | The naive forecast "next month = this month". |
| **AR(p)** | Forecast from the previous *p* values of the same series. |
| **Diebold–Mariano (DM), p-value** | Test whether two forecasts really differ. Small p (< 0.05) means unlikely to be luck. In this project **DM > 0 means the random walk is better.** |
| **VAR** | Several series explained by their own pasts and each other's. |
| **IRF** | Impulse response: how a variable reacts over the next months after a one-time shock. |
| **Cholesky ordering** | An assumption about which variable reacts first within a month; it changes the result, so we test many orderings. |
| **Probit** | A model that turns a number (the spread) into a probability between 0 and 1. |
| **AUC** | 0.5 = coin flip, 1 = perfect ranking of risky vs safe months. |
| **Brier score / BSS** | Accuracy of the probabilities. BSS below 0 means worse than always guessing the historical frequency. |
| **NBER** | The US body that officially dates recessions (with a delay of months). |

---

## 8. Using your own Vietnam data

Full guide: [`docs/vn_data_guide.md`](docs/vn_data_guide.md). Short version:

1. Put your daily yield CSV files (from Investing.com, HNX, VBMA…) named `Vietnam_<n>-Year_Bond_Yield_Historical_Data.csv` in one folder.
2. Merge them: `python scripts/build_vn_yields.py <that_folder>` → creates `data/vn_treasury_yields.csv` and a data-quality report.
3. Run `python scripts/run_pipeline.py`, then open `outputs/vn_data_validation.json` (read `warnings` first) and notebook `05`.

Rules: first column is the date `YYYY-MM-DD`; other columns are maturities in years (`1,2,3,5,7,10,15…`); values are **% per year** (3.25, not 0.0325); leave gaps empty; do not mix data sources.

---

## 9. Repository map

```
Yield-curve-modeling-and-Forecasting/
├── README.md / README.vi.md     ← you are here (English / Vietnamese)
├── requirements.txt             ← Python libraries
├── src/                         ← the logic (change code here)
│   ├── config.py                  settings: dates, maturities, λ, lags
│   ├── data_fetch.py              download from FRED (cache first)
│   ├── nelson_siegel.py           RQ1
│   ├── forecasting.py             RQ2
│   ├── var_analysis.py            RQ3
│   ├── probit_recession.py        RQ4
│   ├── vn_extension.py            RQ5
│   └── utils.py, interactive.py, dashboard_irf_grid.py
├── scripts/
│   ├── run_pipeline.py            ▶ run everything
│   ├── export_dashboard_data.py   write data for the dashboard
│   ├── check_dashboard_parity.py  Python vs dashboard check
│   ├── build_vn_yields.py         merge Vietnam CSV files
│   └── make_interactive.py        interactive charts
├── notebooks/01…05              ← one notebook per RQ (read and visualise)
├── data/                        ← intermediate series (auto-generated)
├── outputs/                     ← tables, figures, summaries (auto-generated)
│   └── interactive/               2D/3D HTML charts (open in a browser)
├── dashboard/                   ← Yield Curve Lab website (JavaScript + D3)
├── docs/                        ← report, plan, data dictionary, guides
└── input/                       ← original brief (PDF, Excel outline)
```

---

## 10. Troubleshooting (FAQ)

| Problem | What to do |
|---|---|
| `python` is not recognised | Reinstall Python and tick **Add to PATH**, or try `py` (Windows) / `python3` (macOS, Linux). |
| `pip install` fails | Update pip first: `python -m pip install --upgrade pip`. Use a virtual environment (Step 1 of Path B). |
| Dashboard page is blank or says "failed to load" | Open it through `http://127.0.0.1:8765/`, **not** by double-clicking `index.html` (browsers block module files opened from disk). |
| "Address already in use" / port 8765 busy | Use another port: `python -m http.server 8766`, then open `…:8766`. |
| You changed code but the dashboard looks old | Hard refresh (`Ctrl + Shift + R`). Browsers cache scripts. |
| Download from FRED fails | Check your internet, or set `FRED_API_KEY`. The pipeline falls back to the public CSV and to cached files in `data/`. |
| Pipeline takes long | Add `--skip-irf-export` for a quick run. |
| Self-test banner is red | Run `python scripts/run_pipeline.py` then `python scripts/export_dashboard_data.py` so dashboard data and Python are from the same run. |
| Vietnam output shows warnings | Read `outputs/vn_data_validation.json`; see [`docs/vn_data_guide.md`](docs/vn_data_guide.md) → "How to read results". |
| Numbers differ slightly from the report | The data end date moves forward with every fresh download. Compare with the same end date, or run without `--refresh`. |

---

## 11. Limitations and honest caveats

- **Recession labels are published late** (months to over a year), and the Probit filter uses information that is only known afterwards, so this is not a real-time test.
- **Only 3 recessions** in the Probit training window; probabilities are unstable.
- **VAR results depend on the assumed ordering** of variables and on how inflation is measured; no cointegration analysis.
- **Timing mismatch:** Fed funds is a monthly average while the curve factors are month-end values.
- **Vietnam data are reference prices**, not the official curve; only 7 maturities (1–15Y) and stale prices on many days.
- Correlation and impulse responses **do not prove causation**.
- This is a **research project, not investment advice**.

---

## 12. References

- **Key references:** Nelson & Siegel (1987); Diebold & Li (2006); Diebold, Rudebusch & Aruoba (2006); Diebold & Mariano (1995); Harvey, Leybourne & Newbold (1997); Sims (1980); Estrella & Mishkin (1998); Bauer & Mertens (2018); Rudebusch & Williams (2009). Full list in the report.
- **Data:** FRED (US Treasury yields `DGS*`, CPI, Fed funds, NBER `USRECM`); Investing.com (Vietnam, reference prices).