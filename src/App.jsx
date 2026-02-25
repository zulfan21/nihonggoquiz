import React, { useState, useEffect } from "react";
import "./index.css";
import * as wanakana from "wanakana";
import {
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trophy,
  Info,
  Type,
  ArrowLeft,
  Volume2,
  Pause,
  Search,
  Filter,
  X,
  Headphones,
} from "lucide-react";

import { categories } from "./data/categories";
import { generateQuestions } from "./utils/questionGenerator";
import { updateStats } from "./utils/adaptiveEngine";
import { fullVocabData } from "./data/vocabulary";

const App = () => {
  const [quizMode, setQuizMode] = useState("selection");
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [quizData, setQuizData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [selectedGroups, setSelectedGroups] = useState([]);

  // State untuk audio
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(null);
  const [voices, setVoices] = useState([]);
  const normalizeForSpeech = (text) => {
    return text.replace(/は/g, "は");
  };
  const forceKatakanaForSpeech = (text) => {
    return wanakana.toKatakana(text);
  };

  // State untuk kamus
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [expandedWord, setExpandedWord] = useState(null);

  // Load voices saat mount
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const japaneseVoices = availableVoices.filter((v) =>
        v.lang.includes("ja"),
      );
      setVoices(japaneseVoices.length > 0 ? japaneseVoices : availableVoices);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
      if (quizMode !== "selection") {
        // Cegah keluar
        window.history.pushState(null, "", window.location.href);
        setShowConfirm(true);
      }
    };

    // Tambahkan dummy state supaya back bisa ditangkap
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [quizMode]);

  const groupedVocab = fullVocabData.reduce((acc, word) => {
    if (!acc[word.group]) acc[word.group] = [];
    acc[word.group].push(word);
    return acc;
  }, {});

  const toggleGroup = (groupName) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: prev[groupName] === undefined ? false : !prev[groupName],
    }));
  };

  // =========================
  // AUDIO FUNCTIONS
  // =========================
  const getTextFromReading = (reading) => {
    return reading
      .map((item) => {
        // Jika ada furigana → SELALU pakai
        if (item.furigana && item.furigana.trim() !== "") {
          return item.furigana;
        }

        // Jika tidak ada furigana → pakai kanji asli
        return item.kanji;
      })
      .join("");
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const safeText = forceKatakanaForSpeech(text);

    const utterance = new SpeechSynthesisUtterance(safeText);
    utterance.lang = "ja-JP";
    utterance.rate = 0.8;

    const japaneseVoices = voices.filter((v) => v.lang.includes("ja"));
    if (japaneseVoices.length > 0) {
      utterance.voice = japaneseVoices[0];
    }

    window.speechSynthesis.speak(utterance);
  };

  const getJapaneseVoices = () => {
    return voices.filter((v) => v.lang === "ja-JP" || v.lang.includes("ja"));
  };

  const getVoiceByGender = (gender) => {
    const jaVoices = getJapaneseVoices();

    if (jaVoices.length === 0) return null;

    if (gender === "male") {
      return jaVoices.find(
        (v) =>
          v.name.toLowerCase().includes("male") ||
          v.name.toLowerCase().includes("ichiro") ||
          v.name.toLowerCase().includes("d"),
      );
    }

    if (gender === "female") {
      return jaVoices.find(
        (v) =>
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("haruka") ||
          v.name.toLowerCase().includes("a"),
      );
    }

    return jaVoices[0];
  };

  const speakLine = (text, speaker, onEnd) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;

    const maleVoice = getVoiceByGender("male");
    const femaleVoice = getVoiceByGender("female");

    if (speaker === "A") {
      utterance.voice = femaleVoice || voices[0];
      utterance.pitch = 1.1; // lebih tinggi
    } else {
      utterance.voice = maleVoice || voices[0];
      utterance.pitch = 0.8; // lebih rendah
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const playConversation = () => {
    const conversation = quizData[currentIndex]?.conversation;
    if (!conversation) return;

    const lines = conversation.japanese;
    let currentIndexLine = 0;

    const playNext = () => {
      if (currentIndexLine < lines.length) {
        const line = lines[currentIndexLine];
        const text = getTextFromReading(line.reading);
        setCurrentLine(currentIndexLine);

        speakLine(text, line.speaker, () => {
          currentIndexLine++;
          setTimeout(playNext, 500);
        });
      } else {
        setCurrentLine(null);
        setIsPlaying(false);
      }
    };

    playNext();
  };

  const stopAudio = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentLine(null);
  };

  // =========================
  // START QUIZ
  // =========================
  const startQuiz = (catId) => {
    const selectedCat = categories.find((c) => c.id === catId);
    setCurrentCategory(selectedCat);

    if (catId === "dictionary") {
      setQuizMode("dictionary");
      // Reset kamus state
      setSearchTerm("");
      setSelectedFilter("all");
      setExpandedWord(null);
      return;
    }

    if (catId === "vocabulary") {
      setQuizMode("groupSelection");
      setSelectedGroups([]);
      return;
    }

    const generated = generateQuestions(catId, 20, []);
    setQuizData(generated);
    setCurrentIndex(0);
    setScore(0);
    setQuizMode("quiz");
    setFeedback(null);
    setShowExplanation(false);
    setUserInput("");
    setIsPlaying(false);
    setCurrentLine(null);
  };

  const startQuizFromGroups = () => {
    const generated = generateQuestions("vocabulary", 20, selectedGroups);
    setQuizData(generated);
    setCurrentIndex(0);
    setScore(0);
    setQuizMode("quiz");
    setFeedback(null);
    setShowExplanation(false);
    setUserInput("");
    setIsPlaying(false);
    setCurrentLine(null);
  };

  // =========================
  // FUZZY MATCHING - VERSI ROBUST
  // =========================
  const romajiToHiragana = (input) => {
    const map = {
      a: "あ",
      i: "い",
      u: "う",
      e: "え",
      o: "お",
      ka: "か",
      ki: "き",
      ku: "く",
      ke: "け",
      ko: "こ",
      sa: "さ",
      shi: "し",
      su: "す",
      se: "せ",
      so: "そ",
      ta: "た",
      chi: "ち",
      tsu: "つ",
      te: "て",
      to: "と",
      na: "な",
      ni: "に",
      nu: "ぬ",
      ne: "ね",
      no: "の",
      ha: "は",
      hi: "ひ",
      fu: "ふ",
      he: "へ",
      ho: "ほ",
      ma: "ま",
      mi: "み",
      mu: "む",
      me: "め",
      mo: "も",
      ya: "や",
      yu: "ゆ",
      yo: "よ",
      ra: "ら",
      ri: "り",
      ru: "る",
      re: "れ",
      ro: "ろ",
      wa: "わ",
      wo: "を",
      n: "ん",
      ga: "が",
      gi: "ぎ",
      gu: "ぐ",
      ge: "げ",
      go: "ご",
      za: "ざ",
      ji: "じ",
      zu: "ず",
      ze: "ぜ",
      zo: "ぞ",
      da: "だ",
      de: "で",
      do: "ど",
      ba: "ば",
      bi: "び",
      bu: "ぶ",
      be: "べ",
      bo: "ぼ",
      pa: "ぱ",
      pi: "ぴ",
      pu: "ぷ",
      pe: "ぺ",
      po: "ぽ",
      kyo: "きょ",
      kyu: "きゅ",
      kya: "きゃ",
      sho: "しょ",
      shu: "しゅ",
      sha: "しゃ",
      cho: "ちょ",
      chu: "ちゅ",
      cha: "ちゃ",
      ryo: "りょ",
      ryu: "りゅ",
      rya: "りゃ",
    };

    let text = input.toLowerCase();
    let result = "";

    while (text.length > 0) {
      let matched = false;

      for (let len = 3; len > 0; len--) {
        const chunk = text.slice(0, len);
        if (map[chunk]) {
          result += map[chunk];
          text = text.slice(len);
          matched = true;
          break;
        }
      }

      if (!matched) {
        result += text[0];
        text = text.slice(1);
      }
    }

    return result;
  };

  const normalizeJapanese = (text) => {
    if (!text) return "";

    return wanakana
      .toHiragana(text) // romaji → hiragana
      .replace(/\s+/g, "") // hapus spasi
      .replace(/[ー\-]/g, "") // hapus tanda panjang
      .trim();
  };

  const checkAnswerFuzzy = (userInput, correctAnswers) => {
    if (!userInput || !correctAnswers) return false;

    const answersArray = Array.isArray(correctAnswers)
      ? correctAnswers
      : [correctAnswers];

    const input = userInput.trim().toLowerCase();

    return answersArray.some((ans) => {
      if (!ans) return false;

      const answer = ans.trim().toLowerCase();

      // =============================
      // Jika jawaban Jepang
      // =============================
      const containsJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(answer);

      if (containsJapanese) {
        const normalizedInput = normalizeJapanese(userInput);
        const normalizedAnswer = normalizeJapanese(ans);

        return (
          normalizedInput === normalizedAnswer ||
          normalizedInput.includes(normalizedAnswer) ||
          normalizedAnswer.includes(normalizedInput)
        );
      }

      // =============================
      // Jika jawaban Bahasa Indonesia
      // =============================

      // 1️⃣ Hapus bagian dalam kurung
      const noBracket = answer.split("(")[0].trim();

      // 2️⃣ Pecah berdasarkan slash atau koma
      const variations = noBracket.split(/[\/,]| atau /).map((v) => v.trim());

      return variations.some((v) => input === v);
    });
  };

  // =========================
  // HANDLE SUBMIT
  // =========================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (feedback || quizMode !== "quiz") return;

    const currentQuestion = quizData[currentIndex];
    if (!currentQuestion) return;

    console.log("DEBUG: Current question:", currentQuestion);
    console.log("DEBUG: User input:", userInput);
    console.log("DEBUG: Expected answers:", currentQuestion?.answer);

    const isCorrect = checkAnswerFuzzy(userInput, currentQuestion.answer);

    updateStats(currentQuestion.id, isCorrect);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedback("correct");
    } else {
      setFeedback("wrong");
    }

    setShowExplanation(true);
  };

  // =========================
  // NEXT QUESTION
  // =========================
  const handleNext = () => {
    stopAudio();

    if (currentIndex < quizData.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserInput("");
      setFeedback(null);
      setShowExplanation(false);
    } else {
      setQuizMode("finished");
    }
  };

  // =========================
  // DICTIONARY FILTER & SEARCH
  // =========================
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const getFilteredWords = () => {
    if (!fullVocabData || fullVocabData.length === 0) return [];

    let filtered = [...fullVocabData];

    const term = searchTerm.trim().toLowerCase();

    if (term !== "") {
      filtered = filtered.filter((word) => {
        const kanji = word.reading
          ?.map((r) => r.kanji || "")
          .join("")
          .toLowerCase();

        const furigana = word.reading
          ?.map((r) => r.furigana || "")
          .join("")
          .toLowerCase();

        const meanings = (word.answer || []).join(" ").toLowerCase();

        return (
          kanji.includes(term) ||
          furigana.includes(term) ||
          meanings.includes(term)
        );
      });
    }

    if (selectedFilter !== "all") {
      filtered = filtered.filter((word) => word.group === selectedFilter);
    }

    return filtered;
  };

  const getGroupColor = (group) => {
    const colors = {
      kata_ganti: "bg-purple-100 text-purple-700 border-purple-200",
      buah: "bg-orange-100 text-orange-700 border-orange-200",
      hewan: "bg-green-100 text-green-700 border-green-200",
      keluarga: "bg-pink-100 text-pink-700 border-pink-200",
      warna: "bg-blue-100 text-blue-700 border-blue-200",
      angka_dasar: "bg-yellow-100 text-yellow-700 border-yellow-200",
      hari: "bg-indigo-100 text-indigo-700 border-indigo-200",
    };
    return colors[group] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getGroupLabel = (group) => {
    const labels = {
      kata_ganti: "Kata Ganti",
      buah: "Buah-buahan",
      hewan: "Hewan",
      keluarga: "Keluarga",
      warna: "Warna",
      angka_dasar: "Angka",
      hari: "Hari",
    };
    return labels[group] || group.replace("_", " ");
  };

  return (
    <div
      className={`
        w-screen bg-slate-50 font-sans text-slate-900
        ${
          quizMode === "quiz" || quizMode === "finished"
            ? "h-screen overflow-hidden"
            : "min-h-screen"
        }
        lg:h-screen lg:overflow-hidden
      `}
    >
      <div className="min-h-screen lg:h-screen w-full bg-white flex flex-col lg:flex-row">
        {/* SIDE PANEL */}
        <div
          className={`lg:w-[28%] px-5 py-2 lg:p-8 text-white flex flex-col min-h-[110px] lg:min-h-full lg:overflow-hidden transition-colors duration-500 ${
            quizMode === "selection" ||
            quizMode === "groupSelection" ||
            quizMode === "dictionary"
              ? "bg-indigo-600"
              : currentCategory?.color
          }`}
        >
          <div className="relative mb-4 lg:mb-6">
            <div className="flex items-center justify-between">
              {/* Left: Logo + Title */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 lg:w-14 lg:h-14 rounded-2xl 
                    flex items-center justify-center shadow-md bg-white"
                >
                  <span
                    className={`text-lg lg:text-2xl font-black ${
                      quizMode === "selection" ||
                      quizMode === "groupSelection" ||
                      quizMode === "dictionary"
                        ? "text-indigo-600"
                        : currentCategory?.textColor
                    }`}
                  >
                    あ
                  </span>
                </div>

                <div className="leading-tight">
                  <h1 className="text-lg lg:text-3xl font-black tracking-tight">
                    Nihongo Quizu
                  </h1>
                  <p className="text-[11px] lg:text-sm text-white/90">
                    Latihan Bahasa Jepang
                  </p>
                </div>
              </div>

              {/* ❌ Exit Button MOBILE ONLY */}
              {quizMode !== "selection" && quizMode !== "groupSelection" && (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="
                    lg:hidden
                    w-8 h-8
                    rounded-full
                    bg-white/20
                    hover:bg-white/30
                    text-white
                    flex items-center justify-center
                    transition
                  "
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {quizMode === "quiz" && (
            <div className="bg-black/10 p-4 lg:p-6 rounded-2xl">
              <p className="text-xs uppercase tracking-widest opacity-60 mb-1">
                Progress Latihan
              </p>

              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-black">
                  {currentIndex + 1} / {quizData.length}
                </span>
                <span className="text-sm font-bold">Benar: {score}</span>
              </div>

              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{
                    width: `${
                      quizData.length
                        ? ((currentIndex + 1) / quizData.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {quizMode === "dictionary" && (
            <div className="bg-black/10 p-3 lg:p-6 rounded-2xl">
              <p className="text-xs uppercase tracking-widest opacity-60 mb-1">
                Total Kosakata
              </p>
              <div className="flex justify-between items-end mb-2"></div>
              <div className="text-3xl font-black">{fullVocabData.length}</div>
              <p className="text-xs opacity-60 mt-1">kata tersedia</p>
            </div>
          )}

          <div className="hidden lg:block text-xs opacity-50 uppercase tracking-widest mt-auto">
            Adaptive Japanese Trainer
          </div>
        </div>

        {/* Modal Konfirmasi Keluar */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999]">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-[90%] max-w-sm text-center">
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {quizMode === "dictionary"
                  ? "Tutup Kamus?"
                  : "Keluar dari latihan?"}
              </h3>

              <p className="text-slate-500 mb-6 text-sm">
                {quizMode === "dictionary"
                  ? "Kamu akan kembali ke menu utama."
                  : "Progress kamu akan hilang."}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                >
                  Batal
                </button>

                <button
                  onClick={() => {
                    setShowConfirm(false);
                    stopAudio();
                    setQuizMode("selection");
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition"
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN AREA */}
        <div
          className={`
            lg:w-[72%] 
            p-6 lg:p-12 
            flex flex-col 
            bg-white
            transition-all duration-500 ease-out
            ${
              quizMode ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }
            ${
              quizMode === "quiz" || quizMode === "finished"
                ? "h-screen overflow-hidden"
                : "min-h-screen"
            }
            lg:h-full lg:min-h-0 lg:overflow-hidden
          `}
        >
          {/* Tombol X untuk keluar */}
          {quizMode !== "selection" && quizMode !== "groupSelection" && (
            <button
              onClick={() => setShowConfirm(true)}
              className="
                hidden lg:flex
                absolute top-6 right-6
                w-10 h-10
                rounded-full
                bg-white/80
                backdrop-blur-md
                border border-white/40
                text-slate-600
                hover:bg-white
                items-center justify-center
                shadow-md
                transition
              "
            >
              ✕
            </button>
          )}

          {/* SELECTION SCREEN */}
          {quizMode === "selection" && (
            <div
              className="
                w-full max-w-5xl mx-auto
                flex flex-col
                justify-start
                lg:justify-center
                min-h-full
              "
            >
              {/* TITLE */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 text-slate-800">
                こんにちは!{" "}
                <span className="cat">
                  ฅ^
                  <span className="eye">&gt;</span>
                  <span className="mouth">⩊</span>
                  <span className="eye">&lt;</span>
                  ^ฅ
                </span>
              </h2>

              <p className="text-sm sm:text-base lg:text-lg text-slate-400 mb-8 lg:mb-12">
                Nihongo Quizu ada untuk membantu kamu berlatih pengetahuan dasar
                bahasa Jepang
              </p>

              {/* CARD LIST */}
              <div className="flex flex-col gap-5 sm:gap-6 lg:grid lg:grid-cols-2 lg:gap-8">
                {categories.map((cat, index) => {
                  const Icon = cat.icon;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => startQuiz(cat.id)}
                      className="
                        flex items-center gap-4 sm:gap-6
                        p-5 sm:p-6 lg:p-8
                        rounded-2xl lg:rounded-3xl
                        border border-slate-200
                        hover:border-indigo-500
                        hover:bg-indigo-50
                        transition-all duration-300
                        text-left
                        shadow-sm hover:shadow-xl
                        bg-white
                        transform hover:-translate-y-1
                        animate-fadeUp
                      "
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      {/* ICON */}
                      <div
                        className={`
                          ${cat.color}
                          p-4 sm:p-5
                          rounded-xl sm:rounded-2xl
                          text-white
                          text-xl sm:text-2xl
                        `}
                      >
                        <Icon />
                      </div>

                      {/* TEXT */}
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                          {cat.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                          {cat.label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* GROUP SELECTION SCREEN */}
          {quizMode === "groupSelection" && (
            <div className="w-full">
              <button
                onClick={() => setQuizMode("selection")}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4 transition"
              >
                <ArrowLeft size={20} /> Kembali
              </button>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 lg:mb-4 text-slate-800">
                Pilih Grup Kosakata
              </h2>
              <p className="text-sm sm:text-base text-slate-400 mb-5 lg:mb-6">
                Pilih grup kosakata yang ingin kamu latih. Kamu bisa memilih
                lebih dari satu.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-3 mb-6">
                {Object.keys(groupedVocab).map((group) => (
                  <label
                    key={group}
                    className={`flex items-center gap-2 sm:gap-3
                      p-3 sm:p-4
                      rounded-xl border-2
                      cursor-pointer transition-all ${
                        selectedGroups.includes(group)
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-indigo-300 bg-white"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group)}
                      onChange={() => {
                        setSelectedGroups((prev) =>
                          prev.includes(group)
                            ? prev.filter((g) => g !== group)
                            : [...prev, group],
                        );
                      }}
                      className="accent-indigo-600 w-5 h-5"
                    />
                    <span className="capitalize font-medium text-sm sm:text-base text-slate-700">
                      {group.replace("_", " ")}
                    </span>
                    <span className="ml-auto text-[11px] sm:text-xs text-slate-400">
                      {groupedVocab[group].length} kata
                    </span>
                  </label>
                ))}
              </div>

              <button
                onClick={startQuizFromGroups}
                disabled={selectedGroups.length === 0}
                className="w-full bg-indigo-600 text-white
                  p-4 sm:p-5
                  rounded-2xl
                  font-bold
                  text-base sm:text-xl
                  hover:bg-indigo-700 transition
                  flex items-center justify-center gap-2 
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mulai Latihan <ChevronRight />
              </button>
            </div>
          )}

          {/* QUIZ */}
          {quizMode === "quiz" && quizData.length > 0 && (
            <div className="w-full flex-1 flex justify-center lg:items-center items-start pt-6 lg:pt-0 overflow-hidden">
              <div className="w-full max-w-3xl px-4">
                {/* SOAL */}
                <div className="text-center mb-10">
                  <div
                    key={currentIndex}
                    className="text-4xl sm:text-5xl lg:text-7xl font-black text-slate-800 mb-4 lg:mb-6 min-h-[100px] lg:min-h-[140px] flex items-center justify-center animate-question"
                  >
                    {quizData[currentIndex]?.display}
                  </div>

                  <div className="inline-block px-3 py-1 lg:px-4 lg:py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs lg:text-sm font-bold border border-indigo-100 uppercase tracking-widest">
                    {quizData[currentIndex]?.prompt}
                  </div>
                </div>

                {/* ================= INPUT MODE ================= */}
                {!showExplanation ? (
                  <form
                    onSubmit={handleSubmit}
                    className="max-w-md mx-auto space-y-5"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Ketik jawaban..."
                      className="w-full p-4 lg:p-5 text-center text-lg lg:text-2xl border-2 border-slate-200 rounded-2xl bg-slate-50 outline-none transition-all text-slate-800 placeholder:text-slate-400 focus:border-indigo-500"
                    />

                    <button
                      type="submit"
                      disabled={!userInput}
                      className="w-full bg-slate-900 text-white p-4 lg:p-5 rounded-2xl font-bold text-base lg:text-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      Cek Jawaban <ChevronRight />
                    </button>
                  </form>
                ) : (
                  /* ================= HASIL MODE ================= */
                  <div className="max-w-xl mx-auto space-y-4 flex flex-col h-full">
                    <div
                      className={`p-6 rounded-3xl border-2 ${
                        feedback === "correct"
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className={`p-2 rounded-full ${
                            feedback === "correct"
                              ? "bg-green-500"
                              : "bg-red-500"
                          } text-white`}
                        >
                          {feedback === "correct" ? (
                            <CheckCircle2 />
                          ) : (
                            <XCircle />
                          )}
                        </div>

                        <div className="flex-1">
                          <h4
                            className={`text-xl font-black ${
                              feedback === "correct"
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {feedback === "correct"
                              ? "Hebat! Benar"
                              : "Belum Tepat"}
                          </h4>

                          <p className="text-slate-600">
                            Jawaban yang diterima:{" "}
                            <span className="font-bold text-slate-900 capitalize">
                              {Array.isArray(quizData[currentIndex]?.answer)
                                ? quizData[currentIndex]?.answer.join(", ")
                                : quizData[currentIndex]?.answer}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* PENJELASAN */}
                      <div className="bg-white/60 p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1 text-xs">
                          <Info size={14} /> PENJELASAN
                        </div>
                        <p className="text-slate-700 text-sm">
                          {quizData[currentIndex]?.explanation}
                        </p>
                      </div>

                      {/* CONVERSATION */}
                      {/* {quizData[currentIndex]?.conversation && (
                        <div className="bg-indigo-600 p-5 rounded-xl text-white shadow-md mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 font-bold text-xs opacity-80 uppercase">
                              <Type size={14} /> Contoh Percakapan
                            </div>

                            <button
                              onClick={isPlaying ? stopAudio : playConversation}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                                isPlaying
                                  ? "bg-red-500 hover:bg-red-600"
                                  : "bg-white/20 hover:bg-white/30"
                              }`}
                            >
                              {isPlaying ? (
                                <>
                                  <Pause size={16} /> Berhenti
                                </>
                              ) : (
                                <>
                                  <Volume2 size={16} /> Dengarkan
                                </>
                              )}
                            </button>
                          </div>

                          {quizData[currentIndex].conversation.japanese.map(
                            (line, index) => (
                              <div
                                key={index}
                                className={`mb-3 p-2 rounded-lg transition ${
                                  currentLine === index ? "bg-white/20" : ""
                                }`}
                              >
                                <p className="text-lg leading-relaxed">
                                  <strong
                                    className={
                                      line.speaker === "A"
                                        ? "text-yellow-300"
                                        : "text-green-300"
                                    }
                                  >
                                    {line.speaker}:
                                  </strong>{" "}
                                  {line.reading.map((item, i) => (
                                    <ruby key={i} className="mx-[1px]">
                                      {item.kanji}
                                      {item.furigana && (
                                        <rt className="text-xs text-indigo-200 font-medium relative -top-1.5">
                                          {item.furigana}
                                        </rt>
                                      )}
                                    </ruby>
                                  ))}
                                </p>
                              </div>
                            ),
                          )}

                          <div className="border-t border-white/30 mt-3 pt-3 text-sm italic">
                            {quizData[
                              currentIndex
                            ].conversation.translation.map((line, index) => (
                              <p key={index}>{line}</p>
                            ))}
                          </div>
                        </div>
                      )} */}
                    </div>

                    <button
                      onClick={handleNext}
                      className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition flex items-center justify-center gap-2 mt-auto"
                    >
                      {currentIndex < quizData.length - 1
                        ? "Soal Berikutnya"
                        : "Lihat Hasil Akhir"}
                      <ChevronRight />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RESULT */}
          {quizMode === "finished" &&
            (() => {
              const percentage = Math.round((score / 20) * 100);

              let level = "";
              let color = "";
              let message = "";

              if (percentage >= 85) {
                level = "Excellent 🎉";
                color = "text-green-600";
                message = "Luar biasa! Pemahaman kamu sudah sangat kuat!";
              } else if (percentage >= 60) {
                level = "Good Job 👍";
                color = "text-indigo-600";
                message = "Bagus! Tinggal sedikit lagi untuk jadi sempurna.";
              } else {
                level = "Keep Practicing 💪";
                color = "text-red-500";
                message = "Jangan menyerah! Latihan lagi dan kamu pasti bisa.";
              }

              return (
                <div className="flex flex-col items-center justify-start lg:justify-center flex-1 text-center max-w-xl mx-auto pt-8 lg:pt-0 px-6">
                  {/* Trophy */}
                  <div className="mb-5 inline-flex p-6 lg:p-10 bg-yellow-100 rounded-full text-yellow-600 shadow-lg">
                    <Trophy size={48} className="lg:w-[72px] lg:h-[72px]" />
                  </div>

                  {/* Title */}
                  <h2 className="text-4xl font-black mb-2 text-slate-800">
                    Selesai!
                  </h2>

                  {/* Score */}
                  <div
                    className={`text-5xl lg:text-6xl font-black mb-2 ${color}`}
                  >
                    {score} / 20
                  </div>

                  {/* Percentage */}
                  <div className="text-lg font-semibold text-slate-500 mb-6">
                    {percentage}% Benar
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 lg:h-4 bg-slate-200 rounded-full overflow-hidden mb-5">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Level Badge */}
                  <div className={`text-xl font-bold mb-2 ${color}`}>
                    {level}
                  </div>

                  {/* Message */}
                  <p className="text-slate-500 mb-10">{message}</p>

                  {/* Button */}
                  <button
                    onClick={() => {
                      stopAudio();
                      setQuizMode("selection");
                    }}
                    className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition shadow-lg hover:scale-105 flex items-center gap-2"
                  >
                    <RefreshCw size={24} />
                    Menu Utama
                  </button>
                </div>
              );
            })()}

          {/* DICTIONARY - VERSI BARU YANG LEBIH MENARIK */}
          {quizMode === "dictionary" && isReady && (
            <div className="w-full flex flex-col min-h-screen lg:h-full lg:min-h-0 lg:flex-1 lg:pt-16">
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 flex-shrink-0 w-full">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={18}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari kata, kanji, atau arti..."
                    className="w-full pl-10 pr-9 py-3 border border-slate-300 rounded-2xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Filter Chips */}
              <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
                <button
                  onClick={() => setSelectedFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    selectedFilter === "all"
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Semua
                </button>
                {Object.keys(groupedVocab).map((group) => (
                  <button
                    key={group}
                    onClick={() => setSelectedFilter(group)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition capitalize ${
                      selectedFilter === group
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {getGroupLabel(group)}
                  </button>
                ))}
              </div>

              {/* Words Grid */}
              <div className="mt-2 pl-3 pr-2 lg:pl-0 lg:flex-1 lg:min-h-0 lg:overflow-y-auto space-y-4 pb-6">
                {getFilteredWords().length === 0 ? (
                  <div className="text-center py-10">
                    <div className="inline-flex p-5 bg-slate-100 rounded-full text-slate-400 mb-3">
                      <Search size={32} />
                    </div>
                    <p className="text-slate-500">
                      Tidak ada kata yang ditemukan
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Coba kata kunci lain
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 space-y-4 pb-20 lg:pb-6 lg:overflow-y-auto pr-4">
                    {getFilteredWords().map((word) => (
                      <div
                        key={word.id}
                        className="
                          group bg-white border border-slate-200 
                          hover:border-indigo-400 
                          rounded-2xl p-4 sm:p-5 lg:p-6 
                          transition-all duration-300 
                          hover:shadow-xl 
                          hover:-translate-y-1
                        "
                      >
                        <div className="flex items-start justify-between">
                          {/* Left: Kanji & Furigana */}
                          <div className="flex-1">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="text-3xl lg:text-4xl font-black text-slate-900 flex flex-wrap items-baseline leading-none">
                                {word.reading?.map((item, index) => (
                                  <ruby
                                    key={index}
                                    className="mx-[1px] align-bottom"
                                  >
                                    {item.kanji}
                                    {item.furigana &&
                                      !["は", "へ", "を"].includes(
                                        item.kanji,
                                      ) && (
                                        <rt className="text-indigo-500 text-xs relative -top-1.5 font-medium">
                                          {item.furigana}
                                        </rt>
                                      )}
                                  </ruby>
                                ))}
                              </div>
                              <button
                                onClick={() =>
                                  speakText(getTextFromReading(word.reading))
                                }
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition opacity-0 group-hover:opacity-100"
                                title="Dengarkan"
                              >
                                <Headphones size={16} />
                              </button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getGroupColor(word.group)}`}
                              >
                                {getGroupLabel(word.group)}
                              </span>
                              <span className="text-slate-400 text-xs">•</span>
                              <span className="text-slate-600 text-sm font-medium">
                                {word.answer.join(", ")}
                              </span>
                            </div>
                          </div>

                          {/* Right: Expand Button */}
                          <button
                            onClick={() =>
                              setExpandedWord(
                                expandedWord === word.id ? null : word.id,
                              )
                            }
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
                          >
                            <ChevronRight
                              size={18}
                              className={`text-slate-400 transition-transform ${expandedWord === word.id ? "rotate-90" : ""}`}
                            />
                          </button>
                        </div>

                        {/* Expanded Content */}
                        {expandedWord === word.id && (
                          <div className="mt-3 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                            <p className="text-slate-600 text-sm mb-3">
                              <span className="font-semibold text-slate-700">
                                Penjelasan:
                              </span>{" "}
                              {word.explanation}
                            </p>

                            {word.conversation && (
                              <div className="bg-indigo-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <Type size={12} /> Contoh Percakapan
                                  </p>

                                  <button
                                    onClick={() =>
                                      speakText(
                                        word.conversation.japanese
                                          .map((line) =>
                                            line.reading
                                              .map((r) => r.furigana || r.kanji)
                                              .join(""),
                                          )
                                          .join(" "),
                                      )
                                    }
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition"
                                  >
                                    <Volume2 size={14} /> Dengarkan
                                  </button>
                                </div>

                                {word.conversation.japanese.map((line, idx) => (
                                  <div key={idx} className="mb-4 last:mb-0">
                                    <p className="text-lg leading-relaxed text-slate-800">
                                      <strong
                                        className={
                                          line.speaker === "A"
                                            ? "text-indigo-600"
                                            : "text-indigo-700"
                                        }
                                      >
                                        {line.speaker}:
                                      </strong>{" "}
                                      {line.reading.map((item, i) => (
                                        <ruby key={i} className="mx-[1px]">
                                          {item.kanji}
                                          {item.furigana &&
                                            !["は", "へ", "を"].includes(
                                              item.kanji,
                                            ) && (
                                              <rt className="text-xs text-indigo-500 relative -top-1 font-medium">
                                                {item.furigana}
                                              </rt>
                                            )}
                                        </ruby>
                                      ))}
                                    </p>

                                    <p className="text-sm text-slate-500 italic mt-1">
                                      {word.conversation.translation[idx]}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
