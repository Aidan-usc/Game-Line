export function americanToDecimal(odds) {
  odds = Number(odds);
  return odds > 0 ? 1 + odds/100 : 1 + 100/Math.abs(odds);
}

export function calculateParlay(stake, oddsArray) {
  const totalDecimal = oddsArray.reduce((m, o) => m * americanToDecimal(o), 1);
  return (stake * totalDecimal).toFixed(2);
}
