// Lebanese mobile numbers: 03 xxx xxx, or 70/71/76/78/79/81 xxx xxx.
const MOBILE = /^(?:3\d{6}|(?:70|71|76|78|79|81)\d{6})$/;

function toAsciiDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Normalize any common way of typing a Lebanese mobile number to E.164 (+961…), or null. */
export function normalizeLebanesePhone(input: string): string | null {
  let digits = toAsciiDigits(input).replace(/\D/g, '');
  if (digits.startsWith('00961')) digits = digits.slice(5);
  else if (digits.startsWith('961')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return MOBILE.test(digits) ? `+961${digits}` : null;
}

/** `+9613123456` → `03 123 456`, `+96170123456` → `70 123 456`. */
export function formatLebanesePhone(e164: string): string {
  const local = e164.replace(/^\+961/, '');
  const prefix = local.length === 7 ? `0${local.slice(0, 1)}` : local.slice(0, 2);
  const rest = local.slice(local.length - 6);
  return `${prefix} ${rest.slice(0, 3)} ${rest.slice(3)}`;
}
