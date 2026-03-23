import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function generateRequestCode(): string {
  const prefix = "HAB";
  // Use timestamp + random for better collision resistance
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

/** Abbreviated day names indexed by JS getDay() (0=Sun…6=Sat). */
export const DOW_ABBR_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Full day names indexed by JS getDay() (0=Sun…6=Sat). */
export const DOW_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** Returns a YYYY-MM-DD date string offsetDays from today. */
export function defaultPlusDate(offsetDays = 3): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}
