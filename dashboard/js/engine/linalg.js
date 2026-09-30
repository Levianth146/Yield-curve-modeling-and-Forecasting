/** Solve OLS y = X beta via normal equations with Cholesky (X'X) beta = X'y */

export function ols(X, y) {
  const n = X.length;
  const p = X[0].length;
  const XtX = zeros(p, p);
  const Xty = new Float64Array(p);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < p; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = a; b < p; b++) {
        XtX[a][b] += X[i][a] * X[i][b];
      }
    }
  }
  for (let a = 0; a < p; a++) {
    for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
  }
  return choleskySolve(XtX, Xty);
}

function zeros(r, c) {
  return Array.from({ length: r }, () => new Float64Array(c));
}

function choleskySolve(A, b) {
  const n = b.length;
  const L = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (s <= 0) throw new Error("Singular X'X");
        L[i][j] = Math.sqrt(s);
      } else L[i][j] = s / L[j][j];
    }
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k];
    y[i] = s / L[i][i];
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}

export function rmse(resid) {
  let s = 0;
  let c = 0;
  for (const r of resid) {
    if (Number.isFinite(r)) {
      s += r * r;
      c++;
    }
  }
  return c ? Math.sqrt(s / c) : NaN;
}
