export const numberToHiragana = (num) => {
  const units = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];
  if (num === 0) return "れい";

  let result = "";
  let n = num;

  if (n >= 10000) {
    const man = Math.floor(n / 10000);
    result += (man === 1 ? "" : units[man]) + "まん";
    n %= 10000;
  }

  if (n >= 1000) {
    const sen = Math.floor(n / 1000);
    if (sen === 1) result += "せん";
    else if (sen === 3) result += "さんぜん";
    else if (sen === 8) result += "はっせん";
    else result += units[sen] + "せん";
    n %= 1000;
  }

  if (n >= 100) {
    const hyaku = Math.floor(n / 100);
    if (hyaku === 3) result += "さんびゃく";
    else if (hyaku === 6) result += "ろっぴゃく";
    else if (hyaku === 8) result += "はっぴゃく";
    else result += (hyaku === 1 ? "" : units[hyaku]) + "ひゃく";
    n %= 100;
  }

  if (n >= 10) {
    const juu = Math.floor(n / 10);
    result += (juu === 1 ? "" : units[juu]) + "じゅう";
    n %= 10;
  }

  if (n > 0) result += units[n];

  return result;
};
