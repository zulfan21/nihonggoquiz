const SidePanel = ({ currentCategory, quizMode, currentIndex, quizData, score }) => {
  return (
    <div className={`lg:w-1/3 p-8 text-white flex flex-col justify-between 
    ${currentCategory ? currentCategory.color : 'bg-indigo-600'}`}>

      <div>
        <h1 className="text-2xl font-bold mb-4">Nihongo Master</h1>
      </div>

      {quizMode === "quiz" && (
        <div>
          <p>{currentIndex + 1} / {quizData.length}</p>
          <p>Benar: {score}</p>
        </div>
      )}

    </div>
  );
};

export default SidePanel;
