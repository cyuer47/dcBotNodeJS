/**
 * questions.js
 * All quiz questions. Each question has 4 options (A-D) and one correct answer.
 * Questions are shuffled each run to prevent cheating.
 */

const QUESTIONS = [
  {
    id: 1,
    question: 'How would you handle a conflict between two members in the server?',
    options: {
      A: 'Ignore it and let them sort it out',
      B: 'Take sides with the one you know better',
      C: 'Listen to both sides, stay neutral, and mediate calmly',
      D: 'Immediately mute both without explanation',
    },
    answer: 'C',
  },
  {
    id: 2,
    question: 'A member posts slightly off-topic content in a serious channel. What do you do?',
    options: {
      A: 'Delete it and ban the member immediately',
      B: 'Politely redirect them to the correct channel',
      C: 'Post a meme to lighten the mood',
      D: 'Nothing — rules are just suggestions',
    },
    answer: 'B',
  },
  {
    id: 3,
    question: 'What is the primary purpose of server rules?',
    options: {
      A: 'To give staff power over members',
      B: 'To fill space in the rules channel',
      C: 'To ensure a safe and enjoyable environment for everyone',
      D: 'To have something to argue about',
    },
    answer: 'C',
  },
  {
    id: 4,
    question: 'A user is repeatedly spamming the chat. What is the correct order of actions?',
    options: {
      A: 'Warn → Mute → Kick → Ban (escalation)',
      B: 'Ban immediately — no warnings needed',
      C: 'Ask them politely once, then do nothing',
      D: 'Ignore it and hope they stop',
    },
    answer: 'A',
  },
  {
    id: 5,
    question: 'How often should you be available to moderate if accepted?',
    options: {
      A: 'Whenever I feel like it',
      B: 'Never — bots handle everything',
      C: 'At least a few hours per week, consistently',
      D: 'Once a month is enough',
    },
    answer: 'C',
  },
  {
    id: 6,
    question: 'Someone sends you a friend request and asks you to abuse your mod powers for them. You:',
    options: {
      A: 'Do it — they are your friend',
      B: 'Decline and report it to senior staff',
      C: 'Ask them what they want first',
      D: 'Accept the request and ignore the request',
    },
    answer: 'B',
  },
  {
    id: 7,
    question: 'What does "impartiality" mean in a moderation context?',
    options: {
      A: 'Only moderating people you do not like',
      B: 'Treating all members equally regardless of your personal relationship with them',
      C: 'Letting friends break rules because you know them',
      D: 'Favouring members with more server activity',
    },
    answer: 'B',
  },
  {
    id: 8,
    question: 'A member messages you in DMs complaining about another staff member. What do you do?',
    options: {
      A: 'Take immediate action without investigating',
      B: 'Tell them it is not your problem',
      C: 'Listen, document the concern, and escalate it to senior staff',
      D: 'Share their complaint publicly',
    },
    answer: 'C',
  },
  {
    id: 9,
    question: 'You are unsure how to handle a complex moderation situation. What do you do?',
    options: {
      A: 'Guess and hope for the best',
      B: 'Do nothing and walk away',
      C: 'Consult the staff guidelines or ask a senior moderator',
      D: 'Ask a random member for advice',
    },
    answer: 'C',
  },
  {
    id: 10,
    question: 'Which behaviour is NEVER acceptable as a staff member?',
    options: {
      A: 'Enforcing rules consistently',
      B: 'Leaking private staff discussions to regular members',
      C: 'Documenting mod actions',
      D: 'Escalating issues to senior staff',
    },
    answer: 'B',
  },
];

/**
 * Returns a shuffled copy of the question array.
 * Uses Fisher-Yates algorithm.
 */
function getShuffledQuestions() {
  const copy = [...QUESTIONS];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = { getShuffledQuestions, QUESTIONS };