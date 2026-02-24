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
    const getWeightedNumber = () => {
      const rand = Math.random();

      // 40% → 1–99
      if (rand < 0.4) {
        return Math.floor(Math.random() * 99) + 1;
      }

      // 35% → 100–999
      if (rand < 0.75) {
        return Math.floor(Math.random() * 900) + 100;
      }

      // 15% → 1000–9999
      if (rand < 0.9) {
        return Math.floor(Math.random() * 9000) + 1000;
      }

      // 10% → 10000–49999
      return Math.floor(Math.random() * 40000) + 10000;
    };

    for (let i = 0; i < total; i++) {
      const val = getWeightedNumber();

      questions.push({
        id: uuidv4(), // dynamic question
        display: val.toLocaleString(),
        prompt: "Tuliskan dalam Hiragana atau Romaji",
        answer: [numberToHiragana(val)],
        explanation:
          "Gunakan unit まん (10.000), せん (1.000), ひゃく (100), じゅう (10).",
      });
    }
  } else if (categoryId === "time") {
    for (let i = 0; i < total; i++) {
      const hour12 = Math.floor(Math.random() * 12) + 1;
      const minuteOptions = [0, 5, 10, 15, 30];
      const m = minuteOptions[Math.floor(Math.random() * minuteOptions.length)];

      const hiraganaTime = formatTimeQuiz(hour12, m);

      // 🔥 Mode campur
      const modes = [
        { label: "AM", jp: "ごぜん" },
        { label: "PM", jp: "ごご" },
        { label: "Pagi", jp: "あさ" },
        { label: "Siang", jp: "ひる" },
        { label: "Malam", jp: "よる" },
        { label: "", jp: "" }, // tanpa keterangan
      ];

      const randomMode = modes[Math.floor(Math.random() * modes.length)];

      const displayLabel = randomMode.label
        ? `${hour12}:${m.toString().padStart(2, "0")} ${randomMode.label}`
        : `${hour12}:${m.toString().padStart(2, "0")}`;

      const fullAnswer = randomMode.jp
        ? `${randomMode.jp}${hiraganaTime}`
        : hiraganaTime;

      questions.push({
        id: uuidv4(),

        display: displayLabel,

        prompt: "Tuliskan dalam Hiragana atau Romaji",

        answer: [fullAnswer, fullAnswer.replace(/\s+/g, "")],

        explanation:
          "AM = ごぜん, PM = ごご, pagi = あさ, siang = ひる, malam = よる. Jam menggunakan じ, menit menggunakan ふん / ぷん.",
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

        prompt: "Tuliskan harga dalam Hiragana atau Romaji",

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

        prompt: "Tuliskan dalam Hiragana atau Romaji",
        answer: [formatJapaneseDate(year, month, day)],
        explanation:
          "Tahun = ねん, Bulan = がつ, Hari = にち (beberapa hari memiliki bacaan khusus).",
      });
    }
  }

  // 🔥 Ambil sesuai total
  return questions.slice(0, total);
};
