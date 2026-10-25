import type { GpCalculationBasis } from "../types/app";

export const DELIVERY_GP_RATE = 32.1;
export const GP_VAT_RATE = 7;

const deliveryChannels = new Set(["LINE MAN", "Grab", "ShopeeFood"]);

export function gpRateForChannel(channel: string) {
  return deliveryChannels.has(channel) ? DELIVERY_GP_RATE : 0;
}

export function normalizeGpCalculationBasis(value: unknown): GpCalculationBasis {
  return value === "before_promotion" ? "before_promotion" : "after_promotion";
}

// Missing VAT fields identify sales saved/queued before VAT was charged separately.
export function normalizeGpVatRate(value: unknown) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : 0;
}

export function calculateGpCharges(base: number, rate: number, vatRate = GP_VAT_RATE) {
  const gpRate = safeNonNegative(rate);
  const gpAmount = roundCurrency((safeNonNegative(base) * gpRate) / 100);
  const gpVatRate = normalizeGpVatRate(vatRate);
  const gpVatAmount = roundCurrency((gpAmount * gpVatRate) / 100);
  const totalPlatformFee = roundCurrency(gpAmount + gpVatAmount);
  return { gpRate, gpAmount, gpVatRate, gpVatAmount, totalPlatformFee };
}

export function calculateSaleRevenue(grossRevenue: number, promotionAmount: number, channel: string, calculationBasis?: GpCalculationBasis, vatRate = GP_VAT_RATE) {
  const gross = safeNonNegative(grossRevenue);
  const promotion = Math.min(safeNonNegative(promotionAmount), gross);
  const subtotalAfterPromotion = roundCurrency(gross - promotion);
  const gpRate = gpRateForChannel(channel);
  const gpCalculationBasis = normalizeGpCalculationBasis(calculationBasis);
  const gpBase = gpCalculationBasis === "before_promotion" ? gross : subtotalAfterPromotion;
  const charges = calculateGpCharges(gpBase, gpRate, vatRate);
  const netRevenue = roundCurrency(Math.max(0, subtotalAfterPromotion - charges.totalPlatformFee));
  return { grossRevenue: gross, promotionAmount: promotion, subtotalAfterPromotion, gpCalculationBasis, gpBase, ...charges, netRevenue };
}

export function roundCurrency(value: number) {
  return Math.round((Number(value) + Number.EPSILON * Math.max(1, Math.abs(value))) * 100) / 100;
}

function safeNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
