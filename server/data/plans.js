// Seed training plans. Each plan has a weekly schedule of workout days; every
// day lists exercises by slug. `reps` is a string so it can hold ranges or
// holds like "20s".
export const plans = [
  {
    slug: 'beginner-foundations',
    name: 'Beginner Foundations',
    level: 'beginner',
    weeks: 6,
    description:
      'Three full-body sessions a week to build the base strength for push-ups, pull-ups and squats. Ideal if you are brand new to calisthenics.',
    days: [
      {
        name: 'Day A — Full Body',
        exercises: [
          { slug: 'incline-push-up', sets: 3, reps: '8-12', rest: 90 },
          { slug: 'australian-row', sets: 3, reps: '8-12', rest: 90 },
          { slug: 'squat', sets: 3, reps: '15', rest: 60 },
          { slug: 'plank', sets: 3, reps: '20-30s', rest: 60 },
        ],
      },
      {
        name: 'Day B — Full Body',
        exercises: [
          { slug: 'bench-dip', sets: 3, reps: '8-12', rest: 90 },
          { slug: 'scapular-pull', sets: 3, reps: '8', rest: 60 },
          { slug: 'dead-hang', sets: 3, reps: '20-30s', rest: 60 },
          { slug: 'reverse-lunge', sets: 3, reps: '10 each', rest: 60 },
          { slug: 'glute-bridge', sets: 3, reps: '15', rest: 60 },
        ],
      },
      {
        name: 'Day C — Full Body',
        exercises: [
          { slug: 'push-up', sets: 3, reps: 'max (stop 1 short of failure)', rest: 90 },
          { slug: 'negative-pull-up', sets: 3, reps: '3-5', rest: 120 },
          { slug: 'squat', sets: 3, reps: '20', rest: 60 },
          { slug: 'hollow-body-hold', sets: 3, reps: '15-20s', rest: 60 },
        ],
      },
    ],
  },
  {
    slug: 'first-pull-up',
    name: 'Your First Pull-up',
    level: 'beginner',
    weeks: 8,
    description:
      'A focused pulling plan using hangs, scap pulls, rows and slow negatives to get your chin over the bar for the first time.',
    days: [
      {
        name: 'Day 1 — Strength',
        exercises: [
          { slug: 'dead-hang', sets: 3, reps: '30s', rest: 60 },
          { slug: 'scapular-pull', sets: 3, reps: '10', rest: 60 },
          { slug: 'negative-pull-up', sets: 4, reps: '3 (5s lower)', rest: 120 },
          { slug: 'australian-row', sets: 3, reps: '10', rest: 90 },
        ],
      },
      {
        name: 'Day 2 — Volume',
        exercises: [
          { slug: 'australian-row', sets: 4, reps: '12', rest: 60 },
          { slug: 'chin-up', sets: 3, reps: 'max or 3 negatives', rest: 120 },
          { slug: 'hanging-knee-raise', sets: 3, reps: '8', rest: 60 },
        ],
      },
      {
        name: 'Day 3 — Test & Build',
        exercises: [
          { slug: 'pull-up', sets: 1, reps: 'test max', rest: 180 },
          { slug: 'negative-pull-up', sets: 3, reps: '4 (5s lower)', rest: 120 },
          { slug: 'dead-hang', sets: 2, reps: 'max', rest: 90 },
        ],
      },
    ],
  },
  {
    slug: 'intermediate-push-pull-legs',
    name: 'Intermediate Push / Pull / Legs',
    level: 'intermediate',
    weeks: 8,
    description:
      'A split for athletes who can do 10+ push-ups and 5+ pull-ups. Builds the strength base for dips, muscle-ups and pistols.',
    days: [
      {
        name: 'Push',
        exercises: [
          { slug: 'dip', sets: 4, reps: '6-10', rest: 120 },
          { slug: 'pike-push-up', sets: 4, reps: '6-10', rest: 120 },
          { slug: 'diamond-push-up', sets: 3, reps: '10-15', rest: 90 },
          { slug: 'handstand-wall-hold', sets: 3, reps: '30s', rest: 90 },
        ],
      },
      {
        name: 'Pull',
        exercises: [
          { slug: 'pull-up', sets: 5, reps: '5-8', rest: 150 },
          { slug: 'australian-row', sets: 3, reps: '12-15', rest: 90 },
          { slug: 'chin-up', sets: 3, reps: '6-10', rest: 120 },
          { slug: 'hanging-knee-raise', sets: 3, reps: '12', rest: 60 },
        ],
      },
      {
        name: 'Legs & Core',
        exercises: [
          { slug: 'bulgarian-split-squat', sets: 4, reps: '8-12 each', rest: 90 },
          { slug: 'pistol-squat', sets: 3, reps: '3-5 each (assisted ok)', rest: 120 },
          { slug: 'glute-bridge', sets: 3, reps: '15 single-leg', rest: 60 },
          { slug: 'hollow-body-hold', sets: 3, reps: '30-45s', rest: 60 },
        ],
      },
    ],
  },
  {
    slug: 'skills-muscle-up-lever',
    name: 'Skills: Muscle-up & Front Lever',
    level: 'advanced',
    weeks: 10,
    description:
      'Skill-focused plan for strong athletes (12+ pull-ups, 15+ dips) chasing the bar muscle-up, L-sit and front lever.',
    days: [
      {
        name: 'Explosive Pull & Muscle-up',
        exercises: [
          { slug: 'muscle-up', sets: 5, reps: '1-3 (or transition drills)', rest: 180 },
          { slug: 'pull-up', sets: 4, reps: '5 explosive, chest to bar', rest: 150 },
          { slug: 'dip', sets: 4, reps: '10-12', rest: 120 },
        ],
      },
      {
        name: 'Levers & Core',
        exercises: [
          { slug: 'tuck-front-lever', sets: 5, reps: '10-15s', rest: 120 },
          { slug: 'l-sit', sets: 5, reps: '10-20s', rest: 90 },
          { slug: 'hanging-knee-raise', sets: 3, reps: '15', rest: 60 },
        ],
      },
      {
        name: 'Handstand & Legs',
        exercises: [
          { slug: 'handstand-wall-hold', sets: 5, reps: '45-60s', rest: 90 },
          { slug: 'pike-push-up', sets: 4, reps: '8-12 feet elevated', rest: 120 },
          { slug: 'pistol-squat', sets: 4, reps: '5 each', rest: 120 },
        ],
      },
    ],
  },
];

export const channels = [
  { slug: 'general', name: 'General', description: 'Say hi and chat about anything calisthenics.' },
  { slug: 'progress', name: 'Progress', description: 'Share PRs, milestones and wins.' },
  { slug: 'form-checks', name: 'Form Checks', description: 'Post your form and get feedback from the community.' },
  { slug: 'beginners', name: 'Beginners', description: 'No question is too basic. Ask away.' },
];
