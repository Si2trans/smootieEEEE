export const DELIVERY_GP_RATE = 32.1;

const deliveryChannels = new Set(["LINE MAN", "Grab", "ShopeeFood"]);

export function gpRateForChannel(channel: string) {
  return deliveryChannels.has(channel) ? DELIVERY_GP_RATE : 0;
}

export function calculateSaleRevenue(grossRevenue: number, promotionAmount: number, channel: string) {
  const gross = safeNonNegative(grossRevenue);
  const promotion = Math.min(safeNonNegative(promotionAmount), gross);
  const subtotalAfterPromotion = roundCurrency(gross - promotion);
  const gpRate = gpRateForChannel(channel);
  const gpAmount = roundCurrency((subtotalAfterPromotion * gpRate) / 100);
  const netRevenue = roundCurrency(Math.max(0, subtotalAfterPromotion - gpAmount));
  return { grossRevenue: gross, promotionAmount: promotion, subtotalAfterPromotion, gpRate, gpAmount, netRevenue };
}

export function roundCurrency(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function safeNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
