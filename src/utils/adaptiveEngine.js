const STORAGE_KEY = "nihongo_stats";

export const getStats = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (err) {
    console.error("Stats corrupted. Resetting...");
    localStorage.removeItem(STORAGE_KEY);
    return {};
  }
};

export const updateStats = (questionId, isCorrect) => {
  if (!questionId) return;

  const stats = getStats();

  if (!stats[questionId]) {
    stats[questionId] = { correct: 0, wrong: 0 };
  }

  if (isCorrect) stats[questionId].correct += 1;
  else stats[questionId].wrong += 1;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

export const sortByDifficulty = (questions = []) => {
  const stats = getStats();

  if (!Array.isArray(questions)) return [];

  const cloned = [...questions];

  return cloned
    .map((q) => {
      const qStats = stats[q.id] || { correct: 0, wrong: 0 };

      const difficulty = qStats.wrong - qStats.correct;

      return {
        ...q,
        score: difficulty + Math.random() * 0.5, // 🔥 random kecil
      };
    })
    .sort((a, b) => b.score - a.score);
};
