// numberUtils.js

const ones = [
  "", "いち", "に", "さん", "よん", "ご",
  "ろく", "なな", "はち", "きゅう"
];

const specialHundreds = {
  300: "さんびゃく",
  600: "ろっぴゃく",
  800: "はっぴゃく"
};

const specialThousands = {
  3000: "さんぜん",
  8000: "はっせん"
};

const convertBelow10000 = (num) => {
  let result = "";

  const thousands = Math.floor(num / 1000);
  const hundreds = Math.floor((num % 1000) / 100);
  const tens = Math.floor((num % 100) / 10);
  const units = num % 10;

  // Thousands
  if (thousands > 0) {
    const value = thousands * 1000;

    if (specialThousands[value]) {
      result += specialThousands[value];
    } else if (thousands === 1) {
      result += "せん";
    } else {
      result += ones[thousands] + "せん";
    }
  }

  // Hundreds
  if (hundreds > 0) {
    const value = hundreds * 100;

    if (specialHundreds[value]) {
      result += specialHundreds[value];
    } else if (hundreds === 1) {
      result += "ひゃく";
    } else {
      result += ones[hundreds] + "ひゃく";
    }
  }

  // Tens
  if (tens > 0) {
    if (tens === 1) {
      result += "じゅう";
    } else {
      result += ones[tens] + "じゅう";
    }
  }

  // Units
  if (units > 0) {
    result += ones[units];
  }

  return result;
};

export const numberToHiragana = (num) => {
  if (num === 0) return "ゼロ";

  let result = "";

  const man = Math.floor(num / 10000);
  const remainder = num % 10000;

  // まん (10,000)
  if (man > 0) {
    if (man === 1) {
      result += "いちまん";
    } else {
      result += convertBelow10000(man) + "まん";
    }
  }

  if (remainder > 0) {
    result += convertBelow10000(remainder);
  }

  return result;
};