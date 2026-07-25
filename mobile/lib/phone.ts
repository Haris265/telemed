/** Pakistan mobile helpers. Local: 3XXXXXXXXX (10), full: 92XXXXXXXXXX (12). */

export const PK_COUNTRY_CODE = "92";
export const PK_LOCAL_LENGTH = 10;

export function digitsOnly(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/** Normalize any common PK input to 92XXXXXXXXXX, or "" if invalid shape. */
export function normalizePkPhone(raw: string): string {
  let d = digitsOnly(raw);

  if (d.startsWith("0092")) d = d.slice(2);
  if (d.startsWith("92") && d.length > 12) d = d.slice(0, 12);

  if (d.startsWith("0") && d.length === 11) {
    d = PK_COUNTRY_CODE + d.slice(1);
  } else if (d.length === PK_LOCAL_LENGTH && d.startsWith("3")) {
    d = PK_COUNTRY_CODE + d;
  }

  return d;
}

export function isValidPkMobile(raw: string): boolean {
  const full = normalizePkPhone(raw);
  return /^92[3]\d{9}$/.test(full);
}

/** Local 10-digit part for the input field (without +92). */
export function toLocalPkInput(raw: string): string {
  const full = normalizePkPhone(raw);
  if (full.startsWith(PK_COUNTRY_CODE) && full.length === 12) {
    return full.slice(2);
  }
  const d = digitsOnly(raw);
  if (d.startsWith("0")) return d.slice(1, 1 + PK_LOCAL_LENGTH);
  if (d.startsWith("92")) return d.slice(2, 2 + PK_LOCAL_LENGTH);
  return d.slice(0, PK_LOCAL_LENGTH);
}

export function formatPkDisplay(full: string): string {
  const n = normalizePkPhone(full);
  if (!/^92\d{10}$/.test(n)) return full;
  return `+${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 12)}`;
}
