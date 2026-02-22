import { useState } from "react";
import { updateStats } from "../utils/adaptiveEngine";

const QuizQuestion = ({ question, onNext, increaseScore }) => {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const correct = question.answer.includes(input.toLowerCase());

    updateStats(question.id, correct);

    if (correct) {
      increaseScore();
      setFeedback("correct");
    } else {
      setFeedback("wrong");
    }
  };

  return (
    <div>
      <h2 className="text-4xl mb-6">{question.display}</h2>

      {!feedback ? (
        <form onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border p-3 w-full mb-3"
          />
          <button className="bg-black text-white p-3 w-full">
            Cek
          </button>
        </form>
      ) : (
        <button onClick={onNext} className="bg-indigo-600 text-white p-3 w-full">
          Soal Berikutnya
        </button>
      )}
    </div>
  );
};

export default QuizQuestion;
