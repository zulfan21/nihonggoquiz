import { numberToHiragana } from "./numberUtils";

export const formatJapaneseDate = (year, month, day) => {
  const months = [
    "",
    "いちがつ",
    "にがつ",
    "さんがつ",
    "しがつ",
    "ごがつ",
    "ろくがつ",
    "しちがつ",
    "はちがつ",
    "くがつ",
    "じゅうがつ",
    "じゅういちがつ",
    "じゅうにがつ",
  ];

  const specialDays = {
    1: "ついたち",
    2: "ふつか",
    3: "みっか",
    4: "よっか",
    5: "いつか",
    6: "むいか",
    7: "なのか",
    8: "ようか",
    9: "ここのか",
    10: "とおか",
    14: "じゅうよっか",
    20: "はつか",
    24: "にじゅうよっか",
  };

  const yearReading = numberToHiragana(year) + "ねん";
  const monthReading = months[month];
  const dayReading = specialDays[day] || numberToHiragana(day) + "にち";

  return yearReading + monthReading + dayReading;
};
