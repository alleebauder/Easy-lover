/*
 * Self Authoring Suite: content.
 *
 * Every module is plain data. To add a module, add an object to this array.
 *
 * Section kinds:
 *   "text"   one free-writing prompt (a textarea)
 *   "list"   up to `max` short lines, typed in (ranked items, commitments)
 *   "choose" tick up to `max` items from `options`
 *
 * Module status:
 *   "active" navigable, saved, and exported
 *   "coming" shown as a roadmap card until it is built
 *
 * The structure follows the publicly described Past / Present (Faults and
 * Virtues, organized by the Big Five personality dimensions) / Future
 * programs. All prompts and option wording here are original.
 */

var BIG_FIVE_FAULTS = [
  { id: "f_open", title: "Openness: where curiosity turns against you", prompt: "Which of these show up as a problem for you?", options: [
    "I chase new ideas and leave the practical follow-through behind",
    "I resist unfamiliar methods even when they would help",
    "I am so drawn to everything that I can't plan ahead",
    "I cling to one idea and stop hearing other views"
  ] },
  { id: "f_consc", title: "Conscientiousness: where order slips", prompt: "Which of these show up as a problem for you?", options: [
    "I start strong and lose interest before I finish",
    "I leave things until the last minute and hope it works out",
    "My space and schedule get chaotic, and I lose track of things",
    "I say I'll do something, then forget it"
  ] },
  { id: "f_extra", title: "Extraversion: where energy goes wrong", prompt: "Which of these show up as a problem for you?", options: [
    "I withdraw from people when I most need them",
    "I dominate conversations without noticing the silence around me",
    "I avoid new people and social risk",
    "I bottle up feelings until they come out sideways"
  ] },
  { id: "f_agree", title: "Agreeableness: where relationships strain", prompt: "Which of these show up as a problem for you?", options: [
    "I avoid conflict even when I need to speak up",
    "I go along with others, then resent it later",
    "I assume the worst about people's motives",
    "I am blunt in ways that hurt people I care about"
  ] },
  { id: "f_stable", title: "Emotional stability: where stress takes over", prompt: "Which of these show up as a problem for you?", options: [
    "I replay mistakes and worry for days",
    "Small setbacks knock me off balance",
    "I react with anger or tears faster than I'd like",
    "Several demands at once overwhelm me quickly"
  ] }
];

var BIG_FIVE_VIRTUES = [
  { id: "v_open", title: "Openness: where curiosity helps you", prompt: "Which of these are true of you at your best?", options: [
    "I'm curious and willing to try new things",
    "I connect ideas from different fields",
    "I change my mind when I meet good evidence",
    "I find beauty, meaning, or imagination in ordinary things"
  ] },
  { id: "v_consc", title: "Conscientiousness: where you are dependable", prompt: "Which of these are true of you at your best?", options: [
    "I follow through on what I commit to",
    "I keep my work and space in reasonable order",
    "I plan ahead and track what matters",
    "I keep going through boredom or difficulty"
  ] },
  { id: "v_extra", title: "Extraversion: where your energy helps others", prompt: "Which of these are true of you at your best?", options: [
    "I start conversations and make people feel welcome",
    "I bring energy and warmth to a room",
    "I speak up comfortably in groups",
    "I take initiative and organize people well"
  ] },
  { id: "v_agree", title: "Agreeableness: where you build trust", prompt: "Which of these are true of you at your best?", options: [
    "I'm patient and kind under pressure",
    "I listen closely to what people actually need",
    "I cooperate well and share credit",
    "I repair relationships after conflict"
  ] },
  { id: "v_stable", title: "Emotional stability: where you steady yourself and others", prompt: "Which of these are true of you at your best?", options: [
    "I stay calm in a crisis",
    "I recover quickly from setbacks",
    "I can sit with uncertainty without panicking",
    "I take criticism without spiraling"
  ] }
];

window.SA_MODULES = [
  {
    id: "past",
    status: "active",
    number: "01",
    title: "Past Self",
    subtitle: "Where I have been",
    time: "4 to 5 hours, split across several sessions",
    intro: "Your life so far is a series of chapters. Mapping the chapters first lets you see patterns before you examine any single memory. This is not a verdict on who you are. It is an inventory of what happened, what it cost, and what it taught you.",
    note: "Past work can bring up strong memories. Do one epoch per session, start rested, and step away if a memory becomes overwhelming. If distress lingers, talk with someone you trust or with a professional.",
    sections: [
      {
        id: "epochs",
        kind: "text",
        title: "Your life in epochs",
        prompt: "Divide your life into six to ten epochs. Give each a name and rough years, such as \"childhood at home\" or \"first job.\"",
        help: "Use boundaries you can point to clearly: a move, a change of school, a loss, a new job, a new city."
      },
      {
        id: "experiences",
        kind: "text",
        title: "Ten experiences that shaped you",
        prompt: "List the ten most important experiences you have had, positive and negative, and note which epoch each one belongs to.",
        help: "Include the ones you would rather skip. Don't sort them by how they're supposed to feel."
      },
      {
        id: "changed",
        kind: "text",
        title: "How three of them changed you",
        prompt: "Choose the three most significant experiences. For each, describe how it changed you, or how it changed your view of other people.",
        help: "Be concrete: what did you believe before, and what did you believe afterward?"
      },
      {
        id: "differently",
        kind: "text",
        title: "What I would do differently",
        prompt: "For those same three experiences, write what you should have done differently, and what you would do now if it happened again."
      },
      {
        id: "patterns",
        kind: "text",
        title: "Patterns across the chapters",
        prompt: "Looking across all your epochs, which of your behaviors helped you most, and which kept costing you?"
      },
      {
        id: "people",
        kind: "text",
        title: "People and energy",
        prompt: "Who left you with more energy than they took? Who consistently took more than they gave?",
        help: "Notice what you need from each relationship, and what you have been offering in return."
      },
      {
        id: "friend",
        kind: "text",
        title: "The honest friend",
        prompt: "Imagine a wise friend who has watched you closely for years. What would they admire, and what would they gently challenge?",
        help: "Write in their voice. Specific, kind, and not flattering."
      }
    ]
  },
  {
    id: "faults",
    status: "active",
    number: "02",
    title: "Present: Faults",
    subtitle: "Where I get in my own way",
    time: "About 1 to 2 hours, best done on a steady day",
    intro: "Faults are the tendencies that most often get in your way. Choose from five personality dimensions, then narrow to the few that cost you most. Aim for honest and specific, not cruel. If you are low right now, start with Virtues and come back to this later.",
    note: "This is the most self-critical module. Write it when you feel steady, and remember that naming a fault is the first step toward changing it.",
    sections: [
      ...BIG_FIVE_FAULTS.map(function (dim) {
        return {
          id: dim.id,
          kind: "choose",
          title: dim.title,
          prompt: dim.prompt,
          max: 3,
          options: dim.options
        };
      }),
      {
        id: "ranked",
        kind: "list",
        title: "Your three most costly faults, ranked",
        prompt: "From everything you chose above, write the three that cost you most, in order of importance.",
        max: 3,
        placeholder: "1st most costly"
      },
      {
        id: "fault_1",
        kind: "text",
        title: "First fault: a time it caused trouble",
        prompt: "Describe a specific time the first fault you ranked caused trouble. What happened, who was affected, and what it cost you?"
      },
      {
        id: "fault_1_next",
        kind: "text",
        title: "First fault: what I could do differently",
        prompt: "Looking back, what could you have done differently? Name one concrete action you will try the next time it shows up."
      },
      {
        id: "fault_2",
        kind: "text",
        title: "Second fault: a time it caused trouble",
        prompt: "Describe a specific time the second fault you ranked caused trouble, and what you could have done differently."
      },
      {
        id: "fault_3",
        kind: "text",
        title: "Third fault: a time it caused trouble",
        prompt: "Describe a specific time the third fault you ranked caused trouble, and what you could have done differently."
      },
      {
        id: "autopilot",
        kind: "text",
        title: "What I am running on autopilot",
        prompt: "Name a habit, a media diet, a spending pattern, or a story about yourself that you have stopped questioning.",
        help: "If none of the lists fit, name the closest item and write about it as if it did."
      }
    ]
  },
  {
    id: "virtues",
    status: "active",
    number: "03",
    title: "Present: Virtues",
    subtitle: "What I do well",
    time: "About 1 to 2 hours",
    intro: "Virtues are the strengths you can build on. Most people undervalue them. Choose from the same five dimensions, then describe the times these strengths actually helped you, and how to use them on purpose.",
    note: "If Faults felt heavy, do this module first. Strengths are a good way to rebuild a steady footing before returning to the harder work.",
    sections: [
      ...BIG_FIVE_VIRTUES.map(function (dim) {
        return {
          id: dim.id,
          kind: "choose",
          title: dim.title,
          prompt: dim.prompt,
          max: 3,
          options: dim.options
        };
      }),
      {
        id: "ranked",
        kind: "list",
        title: "Your three strongest virtues, ranked",
        prompt: "From everything you chose above, write the three that matter most to you, in order.",
        max: 3,
        placeholder: "1st strongest"
      },
      {
        id: "virtue_1",
        kind: "text",
        title: "First virtue: when it helped",
        prompt: "Describe a time the first virtue you ranked got you through something hard. What did you do, and what did it cost?"
      },
      {
        id: "virtue_1_use",
        kind: "text",
        title: "First virtue: using it on purpose",
        prompt: "Where could you use this strength more deliberately in the next three months?"
      },
      {
        id: "virtue_2",
        kind: "text",
        title: "Second virtue: when it helped",
        prompt: "Describe a time the second virtue you ranked made a real difference for someone else."
      },
      {
        id: "virtue_3",
        kind: "text",
        title: "Third virtue: when it helped",
        prompt: "Describe a time the third virtue you ranked showed up when it mattered."
      },
      {
        id: "taken_for_granted",
        kind: "text",
        title: "A strength I take for granted",
        prompt: "Name one thing you do well that is easy to overlook because it comes so naturally."
      }
    ]
  },
  {
    id: "future",
    status: "active",
    number: "04",
    title: "Future Self",
    subtitle: "Where I am going",
    time: "4 to 5 hours, split across several sessions",
    intro: "Most people have never been asked to describe the person they want to become. Start by daydreaming on the page, then sharpen the picture into goals you can actually pursue. Three to five years out is a good horizon.",
    note: "Free-writing works best when you stop editing. Write for fifteen minutes at a time, without worrying about grammar, and let the vision come before the plan.",
    sections: [
      {
        id: "daydream",
        kind: "text",
        title: "My ideal future: fifteen minutes of daydreaming",
        prompt: "Describe your life three to five years from now, set up the way would be best for you. Write about an ordinary Tuesday in that life: where you wake up, who is with you, the work you do, and how the evening ends.",
        help: "Use concrete, sensory detail. Don't stop to check whether it's realistic yet."
      },
      {
        id: "avoid",
        kind: "text",
        title: "The future I want to avoid",
        prompt: "For fifteen minutes, describe the future you are trying to avoid. Where do your current habits lead if nothing changes?",
        help: "Name the specifics. This is not a prediction. It shows you what is at stake."
      },
      {
        id: "values",
        kind: "list",
        title: "Five values I would live by",
        prompt: "Name five values you would still choose even if they cost you something.",
        help: "Plain words work best: honesty, courage, patience, generosity.",
        max: 5,
        placeholder: "e.g. Honesty"
      },
      {
        id: "admired",
        kind: "text",
        title: "People I admire",
        prompt: "Name people whose way of living you admire, and what exactly you admire about them."
      },
      {
        id: "intimacy",
        kind: "text",
        title: "Intimacy and partnership",
        prompt: "What does your closest relationship look like when it's going well three to five years from now? Describe one ordinary moment."
      },
      {
        id: "family",
        kind: "text",
        title: "Family",
        prompt: "What does your family life look like when it's going well? Describe a concrete moment, such as an ordinary dinner."
      },
      {
        id: "friendship",
        kind: "text",
        title: "Friendship",
        prompt: "Who are your close friends, and how do you spend time with them? What would a well-kept friendship look like?"
      },
      {
        id: "career",
        kind: "text",
        title: "Career and work",
        prompt: "What work are you doing, what difference does it make, and what skills does it take?"
      },
      {
        id: "learning",
        kind: "text",
        title: "Learning",
        prompt: "What are you learning, and how are you learning it? Which skill would you like to be genuinely good at?"
      },
      {
        id: "self_care",
        kind: "text",
        title: "Self-care and health",
        prompt: "How do you look after your body, your sleep, and your rest? What does a healthy week look like for you?"
      },
      {
        id: "community",
        kind: "text",
        title: "Community and contribution",
        prompt: "How do you contribute beyond your own life: to a community, a cause, or the people around you?"
      },
      {
        id: "goals",
        kind: "list",
        title: "Up to five goals, ranked",
        prompt: "Name up to five goals, ranked from most to least important.",
        help: "Choose goals you can make happen yourself. Avoid goals that depend mainly on luck or other people.",
        max: 5,
        placeholder: "A goal you control"
      },
      {
        id: "goal_why",
        kind: "text",
        title: "Why each goal matters",
        prompt: "For each goal, say why you want it. Is it genuinely yours, or inherited from someone else's expectations?"
      },
      {
        id: "goal_effects",
        kind: "text",
        title: "What each goal does to others",
        prompt: "For each goal, how does pursuing it affect you, and how does it affect the people around you?"
      },
      {
        id: "unafraid",
        kind: "text",
        title: "If fear weren't a factor",
        prompt: "What would you attempt if you were not worried about looking foolish or failing in public?"
      }
    ]
  },
  {
    id: "plan",
    status: "active",
    number: "05",
    title: "The Plan",
    subtitle: "From direction to commitment",
    time: "About 1 hour",
    intro: "Insight alone doesn't change behavior. This module turns what you have written into a few specific commitments, a first step with a time on it, and a person who will check in.",
    note: "Keep commitments small enough that you could do them this week. You can always add more after your first check-in.",
    sections: [
      {
        id: "anchor",
        kind: "text",
        title: "The fault to work against and the virtue to lean on",
        prompt: "Choose one fault to work against and one virtue to lean on. Which matters most right now, and why?"
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
    number: "06",
    title: "Values in Action",
    subtitle: "Do my choices match what I say matters?",
    summary: "Audit a month of calendar time and spending against the values you named in Future."
  },
  {
    id: "relationships",
    status: "coming",
    number: "07",
    title: "Relationship Ledger",
    subtitle: "Who gives me energy, and who do I give it to?",
    summary: "Map energy in and out across the people in your life, with one next move for each."
  },
  {
    id: "habit-lab",
    status: "coming",
    number: "08",
    title: "Habit Lab",
    subtitle: "Run small experiments and read the results honestly",
    summary: "Design two-week behavioral experiments, then judge them against what you wrote beforehand."
  },
  {
    id: "meaning-calling",
    status: "coming",
    number: "09",
    title: "Meaning and Calling",
    subtitle: "What am I for?",
    summary: "A longer inquiry into purpose, service, and what you would still do if nobody were watching."
  },
  {
    id: "shared-review",
    status: "coming",
    number: "10",
    title: "Shared Review",
    subtitle: "Work through the suite with a witness",
    summary: "Run the review with a trusted friend, mentor, or partner who reflects back what they hear."
  }
];
