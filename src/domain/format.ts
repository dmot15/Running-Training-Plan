/** All displayed mileage is rounded to the nearest half mile — no odd decimals like 24.2. */
export function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}
