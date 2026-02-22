const QuizSelection = ({ categories, startQuiz }) => {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Pilih Kategori</h2>

      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => startQuiz(cat.id)}
          className="block w-full p-4 border rounded-xl mb-3"
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
};

export default QuizSelection;
