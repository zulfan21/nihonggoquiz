import React from "react";
import { v4 as uuidv4 } from "uuid";
import { numberToHiragana } from "./numberUtils";
import { formatTimeQuiz } from "./timeUtils";
import { fullVocabData } from "../data/vocabulary";
import { sortByDifficulty } from "./adaptiveEngine";
import { formatJapaneseDate } from "./dateUtils";

export const generateQuestions = (
  categoryId,
  total = 20,
  selectedGroups = [],
) => {
  let questions = [];

  if (categoryId === "numbers") {
    for (let i = 0; i < total; i++) {
      const val = Math.floor(Math.random() * 50000);

      questions.push({
        id: uuidv4(), // dynamic question
        display: val.toLocaleString(),
        prompt: "Tuliskan dalam Hiragana",
        answer: [numberToHiragana(val)],
        explanation:
          "Gunakan unit まん (10.000), せん (1.000), ひゃく (100), じゅう (10).",
      });
    }
  } else if (categoryId === "time") {
    for (let i = 0; i < total; i++) {
      const h = Math.floor(Math.random() * 12) + 1;
      const m = [0, 5, 10, 15, 30][Math.floor(Math.random() * 5)];

      questions.push({
        id: uuidv4(), // dynamic question
        display: `${h}:${m.toString().padStart(2, "0")}`,
        prompt: "Sebutkan dalam Hiragana",
        answer: [formatTimeQuiz(h, m)],
        explanation:
          "Jam menggunakan じ, menit menggunakan ふん / ぷん. 30 menit = はん.",
      });
    }
  } else if (categoryId === "vocabulary") {
    let filtered = fullVocabData;

    if (selectedGroups.length > 0) {
      filtered = fullVocabData.filter((v) => selectedGroups.includes(v.group));
    }

    // Shuffle random
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);

    questions = shuffled.map((v) => ({
      id: v.id,
      display: (
        <div className="text-6xl font-black text-slate-800 text-center">
          {v.reading?.map((item, index) => (
            <ruby key={index} className="mx-[2px] align-bottom">
              {item.kanji}
              {item.furigana && (
                <rt className="text-text-slate-900 text-sm relative -top-2">
                  {item.furigana}
                </rt>
              )}
            </ruby>
          ))}
        </div>
      ),
      prompt: "Apa arti kata di atas?",
      answer: v.answer,
      explanation: v.explanation,
      conversation: v.conversation,
    }));
  } else if (categoryId === "shopping") {
    for (let i = 0; i < total; i++) {
      const price = Math.floor(Math.random() * 50000) + 100;

      questions.push({
        id: uuidv4(),

        display: `¥${price.toLocaleString()}`,

        prompt: "Tuliskan harga dalam Hiragana",

        answer: [`${numberToHiragana(price)}えん`],

        explanation:
          "Harga dibaca dengan angka + えん (yen). Contoh: 100えん = ひゃくえん。",
      });
    }
  } else if (categoryId === "date") {
    for (let i = 0; i < total; i++) {
      const year = Math.floor(Math.random() * 30) + 1990;
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;

      questions.push({
        id: `date_${year}_${month}_${day}_${i}`,

        // ✅ TAMPILAN DENGAN KANJI
        display: (
          <div className="text-5xl font-black text-slate-800 text-center">
            {year}年{month}月{day}日
          </div>
        ),

        prompt: "Tuliskan dalam Hiragana",
        answer: [formatJapaneseDate(year, month, day)],
        explanation:
          "Tahun = ねん, Bulan = がつ, Hari = にち (beberapa hari memiliki bacaan khusus).",
      });
    }
  }

  // 🔥 Ambil sesuai total
  return questions.slice(0, total);
};
