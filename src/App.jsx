import React, { useState, useEffect } from "react";
import "./index.css";
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
    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
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
        // Jika ada furigana → gunakan
        if (item.furigana && item.furigana.trim() !== "") {
          return item.furigana;
        }

        // Jika tidak ada furigana → gunakan teks asli
        // (hiragana / katakana / tanda baca)
        return item.kanji;
      })
      .join("");
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.8;

    const japaneseVoices = voices.filter((v) => v.lang.includes("ja"));
    if (japaneseVoices.length > 0) {
      utterance.voice = japaneseVoices[0];
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

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
  const checkAnswerFuzzy = (userInput, correctAnswers) => {
    if (!userInput || !correctAnswers) {
      console.log("DEBUG: Input atau answer kosong");
      return false;
    }

    const normalizedInput = userInput
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

    const answersArray = Array.isArray(correctAnswers)
      ? correctAnswers
      : [correctAnswers];

    console.log("DEBUG: Checking:", normalizedInput);
    console.log("DEBUG: Against:", answersArray);

    const result = answersArray.some((ans) => {
      if (!ans) return false;

      const normalizedAns = ans
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");

      console.log(
        `DEBUG: Comparing "${normalizedInput}" with "${normalizedAns}"`,
      );

      if (normalizedAns === normalizedInput) {
        console.log("DEBUG: -> Exact match!");
        return true;
      }

      const ansWithoutParentheses = normalizedAns
        .replace(/\s*\([^)]*\)/g, "")
        .trim();
      console.log(
        `DEBUG: Answer without parentheses: "${ansWithoutParentheses}"`,
      );

      if (ansWithoutParentheses === normalizedInput) {
        console.log("DEBUG: -> Match without parentheses!");
        return true;
      }

      const inputWithoutParentheses = normalizedInput
        .replace(/\s*\([^)]*\)/g, "")
        .trim();
      if (ansWithoutParentheses === inputWithoutParentheses) {
        console.log("DEBUG: -> Match both without parentheses!");
        return true;
      }

      if (
        normalizedAns.startsWith(normalizedInput + " ") ||
        normalizedAns.startsWith(normalizedInput + "(")
      ) {
        console.log("DEBUG: -> Input is prefix of answer!");
        return true;
      }

      if (
        normalizedInput.startsWith(ansWithoutParentheses + " ") ||
        normalizedInput.startsWith(ansWithoutParentheses + "(")
      ) {
        console.log("DEBUG: -> Answer is prefix of input!");
        return true;
      }

      if (
        normalizedAns.includes(normalizedInput) &&
        normalizedInput.length >= 3
      ) {
        console.log("DEBUG: -> Input contained in answer!");
        return true;
      }

      if (
        normalizedInput.includes(ansWithoutParentheses) &&
        ansWithoutParentheses.length >= 3
      ) {
        console.log("DEBUG: -> Answer contained in input!");
        return true;
      }

      return false;
    });

    console.log("DEBUG: Final result:", result);
    return result;
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
  const getFilteredWords = () => {
    let filtered = fullVocabData;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((word) => {
        const kanji = word.reading
          .map((r) => r.kanji)
          .join("")
          .toLowerCase();
        const furigana = word.reading
          .map((r) => r.furigana)
          .join("")
          .toLowerCase();
        const answers = word.answer.join(" ").toLowerCase();
        return (
          kanji.includes(term) ||
          furigana.includes(term) ||
          answers.includes(term)
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
    <div className="min-h-screen w-screen bg-slate-50 font-sans text-slate-900 flex items-center justify-center">
      <div className="relative w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[550px] lg:min-h-[700px] mx-4 lg:mx-auto">
        {/* SIDE PANEL */}
        <div
          className={`lg:w-1/3 p-5 lg:p-8 text-white flex flex-col justify-between min-h-[180px] lg:min-h-full transition-colors duration-500 ${
            quizMode === "selection" ||
            quizMode === "groupSelection" ||
            quizMode === "dictionary"
              ? "bg-indigo-600"
              : currentCategory?.color
          }`}
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span
                className={`p-2 rounded-xl font-black text-xl transition-colors duration-500 ${
                  quizMode === "selection" ||
                  quizMode === "groupSelection" ||
                  quizMode === "dictionary"
                    ? "bg-white text-indigo-600"
                    : "bg-white " +
                      currentCategory?.color.replace("bg-", "text-")
                }`}
              >
                あ
              </span>
              <h1 className="text-2xl font-bold">Nihongo Quizz</h1>
            </div>

            <p className="hidden lg:block text-white/80 text-sm leading-relaxed mb-8">
              Latihan interaktif JLPT N5 dengan sistem adaptive learning.
            </p>
          </div>

          {quizMode === "quiz" && (
            <div className="bg-black/10 p-6 rounded-2xl">
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
            <div className="bg-black/10 p-6 rounded-2xl">
              <p className="text-xs uppercase tracking-widest opacity-60 mb-1">
                Total Kosakata
              </p>
              <div className="text-3xl font-black">{fullVocabData.length}</div>
              <p className="text-xs opacity-60 mt-1">kata tersedia</p>
            </div>
          )}

          <div className="hidden lg:block text-xs opacity-50 uppercase tracking-widest">
            Adaptive Japanese Trainer
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="lg:w-2/3 p-6 lg:p-12 flex flex-col justify-center relative bg-white">
          {/* Tombol X untuk keluar */}
          {quizMode !== "selection" && quizMode !== "groupSelection" && (
            <button
              onClick={() => setShowConfirm(true)}
              className="absolute top-6 right-6 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm"
            >
              ✕
            </button>
          )}

          {/* Modal Konfirmasi Keluar */}
          {showConfirm && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-8 w-[90%] max-w-sm text-center">
                <h3 className="text-xl font-bold text-slate-800 mb-3">
                  Keluar dari latihan?
                </h3>

                <p className="text-slate-500 mb-6 text-sm">
                  Progress kamu akan hilang.
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

          {/* SELECTION SCREEN */}
          {quizMode === "selection" && (
            <>
              <h2 className="text-3xl font-black mb-2 text-slate-800">
                Mulai Latihan
              </h2>
              <p className="text-slate-400 mb-8">
                Pilih kategori soal untuk memulai sesi 20 pertanyaan.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const Icon = cat.icon;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => startQuiz(cat.id)}
                      className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group shadow-sm hover:shadow-md"
                    >
                      <div className={`${cat.color} p-3 rounded-xl text-white`}>
                        <Icon />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-800">{cat.name}</h3>
                        <p className="text-xs text-slate-400">20 Soal</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
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

              <h2 className="text-3xl font-black mb-2 text-slate-800">
                Pilih Grup Kosakata
              </h2>
              <p className="text-slate-400 mb-6">
                Pilih grup kosakata yang ingin kamu latih. Kamu bisa memilih
                lebih dari satu.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {Object.keys(groupedVocab).map((group) => (
                  <label
                    key={group}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
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
                    <span className="capitalize font-medium text-slate-700">
                      {group.replace("_", " ")}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">
                      {groupedVocab[group].length} kata
                    </span>
                  </label>
                ))}
              </div>

              <button
                onClick={startQuizFromGroups}
                disabled={selectedGroups.length === 0}
                className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-bold text-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mulai Latihan <ChevronRight />
              </button>
            </div>
          )}

          {/* QUIZ */}
          {quizMode === "quiz" && quizData.length > 0 && (
            <div className="w-full">
              <div className="text-center mb-8">
                <div className="text-6xl lg:text-7xl font-black text-slate-800 mb-4 min-h-[140px] flex items-center justify-center">
                  {quizData[currentIndex]?.display}
                </div>

                <div className="inline-block px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold border border-indigo-100 uppercase tracking-widest">
                  {quizData[currentIndex]?.prompt}
                </div>
              </div>

              {!showExplanation ? (
                <form
                  onSubmit={handleSubmit}
                  className="max-w-md mx-auto space-y-4"
                >
                  <input
                    type="text"
                    autoFocus
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ketik jawaban..."
                    className="w-full p-5 text-center text-2xl border-2 border-slate-200 rounded-2xl bg-slate-50 outline-none transition-all text-slate-800 placeholder:text-slate-400 focus:border-indigo-500"
                  />

                  <button
                    type="submit"
                    disabled={!userInput}
                    className="w-full bg-slate-900 text-white p-5 rounded-2xl font-bold text-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Cek Jawaban <ChevronRight />
                  </button>
                </form>
              ) : (
                <div className="max-w-xl mx-auto space-y-4">
                  {/* FEEDBACK */}
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
                          feedback === "correct" ? "bg-green-500" : "bg-red-500"
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

                    {/* CONVERSATION DENGAN AUDIO */}
                    {quizData[currentIndex]?.conversation && (
                      <div className="bg-indigo-600 p-5 rounded-xl text-white shadow-md mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 font-bold text-xs opacity-80 uppercase">
                            <Type size={14} /> Contoh Percakapan
                          </div>

                          {/* TOMBOL AUDIO */}
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
                                  className={`${
                                    line.speaker === "A"
                                      ? "text-yellow-300"
                                      : "text-green-300"
                                  }`}
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
                          {quizData[currentIndex].conversation.translation.map(
                            (line, index) => (
                              <p key={index}>{line}</p>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleNext}
                    className="w-full bg-slate-900 text-white p-5 rounded-2xl font-bold text-xl hover:bg-slate-800 transition flex items-center justify-center gap-2"
                  >
                    {currentIndex < quizData.length - 1
                      ? "Soal Berikutnya"
                      : "Lihat Hasil Akhir"}
                    <ChevronRight />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* RESULT */}
          {quizMode === "finished" && (
            <div className="text-center">
              <div className="mb-6 inline-flex p-8 bg-yellow-100 rounded-full text-yellow-600">
                <Trophy size={64} />
              </div>

              <h2 className="text-4xl font-black mb-2 text-slate-800">
                Selesai!
              </h2>

              <div className="text-5xl font-black text-indigo-600 mb-10">
                {score} / 20
              </div>

              <button
                onClick={() => {
                  stopAudio();
                  setQuizMode("selection");
                }}
                className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition flex items-center gap-2 mx-auto"
              >
                <RefreshCw size={24} />
                Menu Utama
              </button>
            </div>
          )}

          {/* DICTIONARY - VERSI BARU YANG LEBIH MENARIK */}
          {quizMode === "dictionary" && (
            <div className="w-full flex flex-col h-[550px]">
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-shrink-0">
                {/* Search */}
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari kata, kanji, atau arti..."
                    className="w-full pl-10 pr-9 py-3 border-2 border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:outline-none transition"
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

                {/* Filter Dropdown */}
                <div className="relative">
                  <Filter
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="pl-9 pr-8 py-3 border-2 border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:outline-none appearance-none bg-white cursor-pointer min-w-[140px]"
                  >
                    <option value="all">Semua Grup</option>
                    {Object.keys(groupedVocab).map((group) => (
                      <option key={group} value={group}>
                        {getGroupLabel(group)}
                      </option>
                    ))}
                  </select>
                  <ChevronRight
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none"
                    size={14}
                  />
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
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 hide-scrollbar pb-2">
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
                  <div className="grid grid-cols-1 gap-2">
                    {getFilteredWords().map((word) => (
                      <div
                        key={word.id}
                        className="group bg-white border-2 border-slate-100 hover:border-indigo-300 rounded-xl p-4 transition-all duration-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          {/* Left: Kanji & Furigana */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-2xl font-black text-slate-800 flex flex-wrap">
                                {word.reading?.map((item, index) => (
                                  <ruby
                                    key={index}
                                    className="mx-[1px] align-bottom"
                                  >
                                    {item.kanji}
                                    {item.furigana && (
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
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getGroupColor(word.group)}`}
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
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Type size={12} /> Contoh Percakapan
                                </p>
                                {word.conversation.japanese.map((line, idx) => (
                                  <div key={idx} className="mb-2 last:mb-0">
                                    <p className="text-sm text-slate-800">
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
                                        <span key={i}>{item.kanji}</span>
                                      ))}
                                    </p>
                                    <p className="text-xs text-slate-500 italic mt-0.5">
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
