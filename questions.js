/**
 * questions.js
 * Quiz questions for the application process.
 */

const questions = [
  {
    id: 1,
    question: "Why do you want to work at Ibeka Store?",
    options: {
      A: "To earn Robux",
      B: "Because I like helping customers and working in a team",
      C: "Because my friend works here",
      D: "No reason",
    },
    answer: "B",
  },
  {
    id: 2,
    question: "What should you do if a customer is being rude?",
    options: {
      A: "Be rude back",
      B: "Ignore them",
      C: "Stay calm and respectful",
      D: "Kick them from the game",
    },
    answer: "C",
  },
  {
    id: 3,
    question: "What is good customer service?",
    options: {
      A: "Helping customers quickly and politely",
      B: "Ignoring customers",
      C: "Only helping friends",
      D: "Talking with staff only",
    },
    answer: "A",
  },
  {
    id: 4,
    question: "What should you do if you don’t know the answer to a question?",
    options: {
      A: "Make something up",
      B: "Ask a higher rank for help",
      C: "Ignore the customer",
      D: "Leave the game",
    },
    answer: "B",
  },
  {
    id: 5,
    question: "What is important when working in a team?",
    options: {
      A: "Communication",
      B: "Ignoring others",
      C: "Working alone only",
      D: "Competing with teammates",
    },
    answer: "A",
  },
  {
    id: 6,
    question: "How should you behave as staff in Ibeka Store?",
    options: {
      A: "Professional and friendly",
      B: "Funny but disrespectful",
      C: "Silent all the time",
      D: "Only talk to friends",
    },
    answer: "A",
  },
  {
    id: 7,
    question: "What should you do if you see someone breaking the rules?",
    options: {
      A: "Join them",
      B: "Ignore it",
      C: "Report it to a supervisor",
      D: "Argue with them",
    },
    answer: "C",
  },
  {
    id: 8,
    question: "Why is activity important as staff?",
    options: {
      A: "To look cool",
      B: "To help customers and keep the store running",
      C: "No reason",
      D: "Only for promotions",
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
