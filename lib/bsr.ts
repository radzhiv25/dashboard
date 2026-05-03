export function estimateRevenue(
  bsr: number,
  price: number
): { units: number; revenue: number } {
  // Jungle Scout BSR curve (general merchandise category)
  let units: number;
  if (bsr <= 10) units = 3000 - (bsr - 1) * 200;
  else if (bsr <= 50) units = 1800 - (bsr - 10) * 25;
  else if (bsr <= 100) units = 800 - (bsr - 50) * 8;
  else if (bsr <= 500) units = 400 - (bsr - 100) * 0.6;
  else units = Math.max(20, 160 - (bsr - 500) * 0.1);

  units = Math.round(units);
  return { units, revenue: units * price };
}
