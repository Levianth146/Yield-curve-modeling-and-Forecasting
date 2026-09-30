const NULL_BP = -32768;

/** @param {ArrayBuffer} buf */
async function sha256(buf) {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** @param {string} path */
async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed ${path}: ${res.status}`);
  const text = await res.text();
  const buf = new TextEncoder().encode(text);
  return { json: JSON.parse(text), bytes: buf.length, raw: text };
}

/**
 * @param {object} manifest
 * @param {string} name
 * @param {string} rawText
 */
async function verifyFile(manifest, name, rawText) {
  const meta = manifest.files?.[name];
  if (!meta?.sha256) return true;
  const buf = new TextEncoder().encode(rawText);
  const h = await sha256(buf);
  if (h !== meta.sha256) {
    console.error(`Checksum mismatch ${name}`, h, meta.sha256);
    return false;
  }
  return true;
}

/** Decode yields.json payload */
export function decodeYields(payload) {
  const { dates: dateField, maturities, columns } = payload;
  const dates = expandDates(dateField);
  const n = dates.length;
  const out = {
    dates: expandDates(dates),
    maturities: maturities.slice(),
    yields: maturities.map((_, j) => {
      const col = columns[j];
      const arr = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const v = col[i];
        arr[i] = v === NULL_BP ? NaN : v / 100;
      }
      return arr;
    }),
  };
  return out;
}

function expandDates(compact) {
  if (Array.isArray(compact)) return compact.slice();
  if (compact && compact.start && compact.deltas) {
    const out = [compact.start];
    let t = new Date(compact.start + "T00:00:00Z").getTime();
    for (let i = 1; i < compact.deltas.length; i++) {
      t += compact.deltas[i] * 86400000;
      out.push(new Date(t).toISOString().slice(0, 10));
    }
    return out;
  }
  if (Array.isArray(compact) && typeof compact[0] === "string" && compact.length === 2 && typeof compact[1] === "number") {
    const start = new Date(compact[0] + "T00:00:00Z");
    const out = [];
    let t = start.getTime();
    for (let i = 0; i < compact[1]; i++) {
      out.push(new Date(t).toISOString().slice(0, 10));
      t += 86400000;
    }
    return out;
  }
  return [];
}

/** @type {Promise<any> | null} */
let loadPromise = null;

export function loadDashboardData(base = "data/") {
  if (!loadPromise) {
    loadPromise = (async () => {
      const { json: manifest, raw: manRaw } = await fetchJson(`${base}manifest.json`);
      await verifyFile(manifest, "manifest.json", manRaw);

      async function load(name, decoder = (x) => x) {
        const { json, raw } = await fetchJson(`${base}${name}`);
        await verifyFile(manifest, name, raw);
        return decoder(json);
      }

      const bundle = {
        manifest,
        yields: await load("yields.json", decodeYields),
        factorsMonthly: await load("factors_monthly.json"),
        nsGolden: await load("ns_golden.json"),
        arGolden: await load("ar_golden.json"),
        probitGolden: await load("probit_golden.json"),
        probitDataset: await load("probit_dataset.json"),
        recessions: await load("recessions.json"),
        vn: await load("vn.json"),
      };
      try {
        bundle.yieldForecast = await load("yield_forecast_golden.json");
      } catch {
        bundle.yieldForecast = { rows: [] };
      }
      bundle.loadIrf = () => (bundle._irf ||= load("irf_grid.json").catch(() => null));
      return bundle;
    })();
  }
  return loadPromise;
}

function toDMY(iso) {
  if (!iso) return "—";
  const s = String(iso);
  const d = s.length >= 10 ? s.slice(0, 10) : s.slice(0, 7) + "-01";
  if (d.length < 10) return d;
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function footerLine(manifest) {
  const end = toDMY(manifest.data_end);
  const atRaw = manifest.generated_at || "";
  const at = toDMY(atRaw);
  const commit = (manifest.git_commit || "local").slice(0, 8);
  return {
    text: `Dữ liệu đến ${end} · cập nhật ${at}`,
    title: `build ${commit}${atRaw ? " · " + atRaw : ""}`,
  };
}
