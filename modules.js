/*
 * Self Authoring Suite: content.
 *
 * Every module is plain data. To add a module, add an object to this array
 * and the navigation, progress tracking, and export pick it up automatically.
 *
 * Section kinds:
 *   "text"   a free-writing prompt (one textarea)
 *   "list"   up to `max` short lines (values, traits, commitments)
 *   "domain" a 1-10 rating plus a note, for one area of life
 *
 * Module status:
 *   "active" navigable, saved, exported
 *   "coming" shown as a roadmap card until it is built
 */
window.SA_MODULES = [
  {
    id: "past",
    status: "active",
    number: "01",
    title: "Past Self",
    subtitle: "Where I have been",
    intro: "Before you choose a direction, you need an honest inventory of the road behind you. This module is not a verdict on who you are. It is a record of what you did, what it cost, and what it taught you.",
    sections: [
      {
        id: "credit",
        title: "Credit I have not given myself",
        prompt: "Name three things from the last twelve months that you handled well, including the ones nobody noticed.",
        help: "For each one, say what it asked of you: courage, patience, discipline, or care for someone else.",
        placeholder: "1. ...\n2. ...\n3. ..."
      },
      {
        id: "turning",
        title: "A turning point",
        prompt: "Describe one moment in the past year when you chose differently from your usual pattern.",
        help: "What made that choice possible, and what would make it easier to repeat?"
      },
      {
        id: "gap",
        title: "The gap between word and deed",
        prompt: "Where did you say you would do something and then not do it?",
        help: "Be specific about what got in the way: time, fear, a competing want, or a plan that was never realistic to begin with."
      },
      {
        id: "pattern",
        title: "A pattern that keeps returning",
        prompt: "Which situation keeps producing the same result for you, whoever is involved?",
        help: "Describe the trigger, your usual response, and what that response costs you over time."
      },
      {
        id: "people",
        title: "People and energy",
        prompt: "Who left you with more energy than they took? Who consistently took more than they gave?",
        help: "Notice what you need from each relationship, and what you have been offering in return."
      },
      {
        id: "friend",
        title: "The honest friend",
        prompt: "Imagine a wise friend who has watched you closely all year. What would they admire, and what would they gently challenge?",
        help: "Write in their voice. Kind, specific, and not flattering."
      }
    ]
  },
  {
    id: "present",
    status: "active",
    number: "02",
    title: "Present Self",
    subtitle: "Where I stand",
    intro: "Take an honest reading of the present. Rate each area of life from 1 (struggling) to 10 (thriving). The scores are for your own orientation, not for comparison with anyone else.",
    sections: [
      {
        id: "work",
        kind: "domain",
        title: "Work and purpose",
        prompt: "How satisfied are you with the work you do and the difference it makes?",
        placeholder: "What is working? What is missing?"
      },
      {
        id: "body",
        kind: "domain",
        title: "Body and health",
        prompt: "How well are you looking after your body: sleep, movement, food, and rest?",
        placeholder: "What is the one habit that would help most?"
      },
      {
        id: "money",
        kind: "domain",
        title: "Money and security",
        prompt: "How well do your finances match what you say matters to you?",
        placeholder: "Where does money leak, and where does it give you room?"
      },
      {
        id: "home",
        kind: "domain",
        title: "Home and partnership",
        prompt: "How well do the people and the place you live with support the person you are becoming?",
        placeholder: "What would make home feel more like rest?"
      },
      {
        id: "friends",
        kind: "domain",
        title: "Friendship and community",
        prompt: "Do you have people who know the real you, and do you see them enough?",
        placeholder: "Who would you like to see more often?"
      },
      {
        id: "inner",
        kind: "domain",
        title: "Inner life",
        prompt: "How well do you handle stress, strong emotion, and the voice in your head?",
        placeholder: "Where does your self-talk help, and where does it hurt?"
      },
      {
        id: "growth",
        kind: "domain",
        title: "Learning and craft",
        prompt: "Are you building skills and understanding that you care about?",
        placeholder: "What are you learning right now, and is it moving you?"
      },
      {
        id: "meaning",
        kind: "domain",
        title: "Meaning and conviction",
        prompt: "Do your daily actions point in the same direction as your deepest convictions?",
        placeholder: "Where do they line up, and where do they pull apart?"
      },
      {
        id: "avoiding",
        kind: "text",
        title: "What I am avoiding",
        prompt: "Name the conversation, decision, or task you keep postponing.",
        help: "Estimate what it would cost to face it this week, and what it costs you to keep avoiding it."
      },
      {
        id: "autopilot",
        kind: "text",
        title: "What I am running on autopilot",
        prompt: "Name a habit, a media diet, a spending pattern, or a story about yourself that you have stopped questioning."
      },
      {
        id: "protect",
        kind: "text",
        title: "What I should protect",
        prompt: "Name one thing that is going well right now and is easy to take for granted."
      }
    ]
  },
  {
    id: "future",
    status: "active",
    number: "03",
    title: "Future Self",
    subtitle: "Where I am going",
    intro: "Direction comes before discipline. Here you describe the person you are building toward, in enough concrete detail that you could recognize them when you meet them.",
    sections: [
      {
        id: "values",
        kind: "list",
        title: "Five values I will live by",
        prompt: "Name five values in plain words, such as honesty, patience, courage, or generosity.",
        help: "Choose the ones you would still choose if they cost you something.",
        max: 5,
        suggestions: ["Honesty", "Courage", "Patience", "Generosity", "Discipline"]
      },
      {
        id: "ideal_day",
        kind: "text",
        title: "An ordinary Tuesday, three years from now",
        prompt: "Write a single ordinary day in the present tense, as if you are already living it.",
        help: "Include where you wake up, who is with you, the work you do, and how the evening ends. Use concrete, sensory detail."
      },
      {
        id: "traits",
        kind: "list",
        title: "Three traits I am building",
        prompt: "Name three character traits you are building. Write them as the person you are becoming, not as a wish list.",
        max: 3,
        suggestions: ["Steady under pressure", "Curious without needing to win", "Generous with my time"]
      },
      {
        id: "one_year",
        kind: "text",
        title: "The outcome that makes this year a success",
        prompt: "What single result in the next twelve months would make this year feel worthwhile?",
        help: "Describe it in terms someone standing next to you could observe."
      },
      {
        id: "five_year",
        kind: "text",
        title: "Five-year direction",
        prompt: "Where do you want to be in five years? Describe the direction, not every detail."
      },
      {
        id: "unafraid",
        kind: "text",
        title: "If I were not worried about looking foolish",
        prompt: "What would you attempt if the fear of looking foolish were not in the room?"
      }
    ]
  },
  {
    id: "plan",
    status: "active",
    number: "04",
    title: "The Plan",
    subtitle: "From direction to commitment",
    intro: "Insight does not change behavior by itself. This module turns what you have written into a few specific commitments, a first step with a time on it, and a person who will check in.",
    sections: [
      {
        id: "anchor",
        kind: "text",
        title: "The area that needs me most",
        prompt: "Choose the area from Present Self with the lowest score. Why does it matter now?"
      },
      {
        id: "commitments",
        kind: "list",
        title: "Up to three if-then commitments",
        prompt: "Write each commitment in this form: If [specific situation], then I will [specific action].",
        help: "Specific situations work better than general intentions. \"If it is 9 p.m. on a weeknight\" beats \"when I have time.\"",
        max: 3,
        placeholder: "If [situation], then I will [action]"
      },
      {
        id: "first_step",
        kind: "text",
        title: "The first step",
        prompt: "What is the first concrete action you will take within 48 hours? Give it a day and a time."
      },
      {
        id: "obstacle",
        kind: "text",
        title: "What will derail me",
        prompt: "What is most likely to knock you off course, and what will you do the moment it happens?"
      },
      {
        id: "witness",
        kind: "text",
        title: "Who will know",
        prompt: "Who will know about this plan, and how will you check in with them?"
      }
    ]
  },
  {
    id: "values-in-action",
    status: "coming",
    number: "05",
    title: "Values in Action",
    subtitle: "Do my choices match what I say matters?",
    summary: "Audit a month of calendar time and spending against the values you named."
  },
  {
    id: "relationships",
    status: "coming",
    number: "06",
    title: "Relationship Ledger",
    subtitle: "Who gives me energy, and who do I give it to?",
    summary: "Map energy in and out across the people in your life, with one next move for each."
  },
  {
    id: "habit-lab",
    status: "coming",
    number: "07",
    title: "Habit Lab",
    subtitle: "Run small experiments and read the results honestly",
    summary: "Design two-week behavioral experiments, then judge them against what you wrote beforehand."
  },
  {
    id: "meaning-calling",
    status: "coming",
    number: "08",
    title: "Meaning and Calling",
    subtitle: "What am I for?",
    summary: "A longer inquiry into purpose, service, and what you would still do if nobody were watching."
  },
  {
    id: "shared-review",
    status: "coming",
    number: "09",
    title: "Shared Review",
    subtitle: "Work through the suite with a witness",
    summary: "Run the review with a trusted friend, mentor, or partner who reflects back what they hear."
  }
];
