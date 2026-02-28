const PH_VAT_RATE = 0.12;

export function formatPHP(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calculateVAT(amount: number): number {
  return roundMoney(amount * PH_VAT_RATE);
}

export function addVAT(amount: number): number {
  return roundMoney(amount * (1 + PH_VAT_RATE));
}

export function removeVAT(amountWithVAT: number): number {
  return roundMoney(amountWithVAT / (1 + PH_VAT_RATE));
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function sumAmounts(...amounts: number[]): number {
  return roundMoney(amounts.reduce((sum, amt) => sum + amt, 0));
}

export function calculateOrderTotal(params: {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  taxAmount: number;
  discountAmount: number;
  tipAmount: number;
}): number {
  return roundMoney(
    params.subtotal +
    params.deliveryFee +
    params.serviceFee +
    params.taxAmount -
    params.discountAmount +
    params.tipAmount
  );
}
