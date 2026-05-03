/**
 * questions.js
 * Quiz questions for the application process.
 */

const questions = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: {
      A: "London",
      B: "Paris",
      C: "Berlin",
      D: "Madrid",
    },
    answer: "B",
  },
  {
    id: 2,
    question: "Which programming language is used for Discord bots?",
    options: {
      A: "Python",
      B: "JavaScript",
      C: "Java",
      D: "C++",
    },
    answer: "B",
  },
  {
    id: 3,
    question: "What does 'DM' stand for in Discord?",
    options: {
      A: "Direct Message",
      B: "Discord Mail",
      C: "Data Message",
      D: "Direct Mail",
    },
    answer: "A",
  },
  {
    id: 4,
    question: "Which of these is NOT a Discord permission?",
    options: {
      A: "Manage Roles",
      B: "Send Messages",
      C: "Delete Files",
      D: "Moderate Members",
    },
    answer: "C",
  },
  {
    id: 5,
    question: "What is the maximum number of characters in a Discord message?",
    options: {
      A: "1000",
      B: "2000",
      C: "4000",
      D: "8000",
    },
    answer: "B",
  },
];

function getShuffledQuestions() {
  // Create a copy and shuffle
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = { getShuffledQuestions };
