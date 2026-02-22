import { numberToHiragana } from "./numberUtils";

export const formatTimeQuiz = (h, m) => {
  const hours = ["じゅうに","いち","に","さん","よ","ご","ろく","しち","はち","く","じゅう","じゅういち"];
  let hourStr = hours[h % 12] + "じ";

  if (m === 0) return hourStr;
  if (m === 30) return hourStr + "はん";

  return hourStr + numberToHiragana(m) + "ふん";
};
