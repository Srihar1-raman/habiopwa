// Shared pricing calculation utilities for HABIO job catalog
// These functions implement the exact formulas from the housekeeping-job-cards catalog.
//
// Formula types:
//   standard       => base_price = input * base_rate_per_unit * instances_per_month
//   time_multiple  => base_price = input * time_multiple * base_rate_per_unit * instances_per_month
//   compound_head  => base_price = input * ((TM_head*rate_head*inst_head) + (TM_child*rate_child*inst_child))
//   compound_child => priced via compound_head; standalone price = 0

export type FormulaType =
  | "standard"
  | "time_multiple"
  | "compound_head"
  | "compound_child";

export type UnitType =
  | "min"
  | "count_washrooms"
  | "count_cars"
  | "count_plants"
  | "count_balconies"
  | "count_visits"
  | "count_acs";

export interface JobPricingParams {
  formula_type: FormulaType | string;
  unit_type: UnitType | string;
  base_rate_per_unit: number;
  instances_per_month: number;
  discount_pct: number;
  time_multiple: number | null;
}

export interface CompoundChildParams {
  base_rate_per_unit: number;
  instances_per_month: number;
  time_multiple: number | null;
}

/**
 * Calculate the base (pre-discount) monthly price for a job.
 * @param inputValue  - Selected duration (min) or count (washrooms/cars/plants/etc.)
 * @param params      - Pricing parameters from the job catalog row
 * @param childParams - For compound_head jobs: the child row's pricing params
 */
export function calcBasePrice(
  inputValue: number,
  params: JobPricingParams,
  childParams?: CompoundChildParams
): number {
  switch (params.formula_type) {
    case "standard":
      return inputValue * params.base_rate_per_unit * params.instances_per_month;

    case "time_multiple":
      return (
        inputValue *
        (params.time_multiple ?? 1) *
        params.base_rate_per_unit *
        params.instances_per_month
      );

    case "compound_head": {
      const headContrib =
        (params.time_multiple ?? 1) *
        params.base_rate_per_unit *
        params.instances_per_month;
      const childContrib = childParams
        ? (childParams.time_multiple ?? 1) *
          childParams.base_rate_per_unit *
          childParams.instances_per_month
        : 0;
      return inputValue * (headContrib + childContrib);
    }

    case "compound_child":
      return 0;

    default:
      return 0;
  }
}

/**
 * Apply discount to get the effective (post-discount) monthly price.
 */
export function calcEffectivePrice(
  basePrice: number,
  discountPct: number
): number {
  return basePrice * (1 - discountPct);
}

/**
 * Calculate both base and effective prices, returning integers (rounded to INR).
 */
export function calcJobPrices(
  inputValue: number,
  params: JobPricingParams,
  childParams?: CompoundChildParams
): { base: number; effective: number } {
  const base = Math.round(calcBasePrice(inputValue, params, childParams));
  const effective = Math.round(calcEffectivePrice(base, params.discount_pct));
  return { base, effective };
}

/**
 * Human-readable label for a unit count (e.g. "washrooms", "cars", "plants").
 */
export function getUnitLabel(unitType: string): string {
  switch (unitType) {
    case "min":
      return "min";
    case "count_washrooms":
      return "washrooms";
    case "count_cars":
      return "cars";
    case "count_plants":
      return "plants";
    case "count_balconies":
      return "balconies";
    case "count_visits":
      return "visits";
    case "count_acs":
      return "ACs";
    default:
      return "units";
  }
}

/**
 * Display name for the unit selector header (e.g. "Duration", "Washrooms", "Cars").
 */
export function getUnitDisplayName(unitType: string): string {
  switch (unitType) {
    case "min":
      return "Duration";
    case "count_washrooms":
      return "Washrooms";
    case "count_cars":
      return "Cars";
    case "count_plants":
      return "Plants";
    case "count_balconies":
      return "Balconies";
    case "count_visits":
      return "Visits";
    case "count_acs":
      return "ACs";
    default:
      return "Count";
  }
}

/**
 * Format a unit value for display (e.g. 45 min → "45 min", 2 washrooms → "2 washrooms").
 */
export function formatUnitValue(value: number, unitType: string): string {
  if (unitType === "min") return `${value} min`;
  return `${value} ${getUnitLabel(unitType)}`;
}
