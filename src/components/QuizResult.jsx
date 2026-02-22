const QuizResult = ({ score, resetQuiz }) => {
  return (
    <div className="text-center">
      <h2 className="text-4xl font-bold mb-4">Selesai!</h2>
      <p className="text-xl mb-6">Skor: {score} / 20</p>
      <button
        onClick={resetQuiz}
        className="bg-indigo-600 text-white p-4 rounded-xl"
      >
        Kembali ke Menu
      </button>
    </div>
  );
};

export default QuizResult;
