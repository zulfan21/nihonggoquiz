import { useState } from "react";

export const useQuiz = () => {
  const [quizMode, setQuizMode] = useState("selection");
  const [quizData, setQuizData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  const nextQuestion = () => {
    if (currentIndex < quizData.length - 1)
      setCurrentIndex(prev => prev + 1);
    else
      setQuizMode("finished");
  };

  const resetQuiz = () => {
    setQuizMode("selection");
    setCurrentIndex(0);
    setScore(0);
    setQuizData([]);
  };

  return {
    quizMode,
    setQuizMode,
    quizData,
    setQuizData,
    currentIndex,
    score,
    setScore,
    nextQuestion,
    resetQuiz
  };
};
