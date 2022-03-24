// Turns COW token from WEI amount into number.
export function formatTokenUnit(tokenWei: string): string {
  const paddedX = tokenWei.padStart(19, "0");
  const resultString = paddedX.replace(/(.*)(.{18})/, "$1.$2");
  // Could parse float here if coingecko doesn't need wei-level precision
  // return parseFloat(resultString);
  return resultString;
}
