export const LEVELS = [
  { name: 'Starter', xp: 0 },
  { name: 'Explorer', xp: 250 },
  { name: 'Builder', xp: 750 },
  { name: 'Brave Mode', xp: 1500 },
  { name: 'Life Architect', xp: 3000 },
  { name: 'Pulse Master', xp: 5000 },
];

export const UNLOCKS = [
  { name: 'Starter Pulses', xp: 0 },
  { name: '5-Minute Wins Pack', xp: 250 },
  { name: 'Weekend Reset Pack', xp: 500 },
  { name: 'Reconnect Pack', xp: 750 },
  { name: 'Tiny Dares Pack', xp: 1500 },
  { name: 'Screen Cleanse Pack', xp: 2000 },
  { name: '7-Day Life Reset Pack', xp: 3000 },
  { name: 'Brave Conversations Pack', xp: 5000 },
];

export const FEELINGS = [
  { label: 'Proud', emoji: '😊' },
  { label: 'Calm', emoji: '😌' },
  { label: 'Connected', emoji: '🤝' },
  { label: 'Brave', emoji: '💪' },
  { label: 'Lighter', emoji: '✨' },
];

export const FILTER_GROUPS = [
  {
    heading: 'Time',
    options: [
      { label: 'I only have 5 minutes', tags: ['quick', 'easy'] },
      { label: 'I have 10-15 minutes', tags: ['short', 'doable'] },
      { label: 'I have 15-30 minutes', tags: ['doable', 'focus', 'meaningful'] },
      { label: 'I have more than 30 minutes', tags: ['deep', 'purpose', 'creative', 'reset'] },
    ],
  },
  {
    heading: 'Mission Type',
    options: [
      { label: 'I want to feel lighter', tags: ['fun', 'joy', 'play'] },
      { label: 'I want to slow down', tags: ['calm', 'mindful', 'rest'] },
      { label: 'I want to do something meaningful', tags: ['deep', 'reflection', 'purpose'] },
      { label: 'I want a small courage boost', tags: ['brave', 'confidence', 'discomfort'] },
      { label: 'I want to do something kind', tags: ['kindness', 'gratitude', 'helpful'] },
      { label: 'I want to feel more present', tags: ['offline', 'nature', 'movement'] },
      { label: 'I want to reset my life', tags: ['reset', 'admin', 'focus', 'money'] },
      { label: 'I want to do something creative', tags: ['creative', 'expression', 'craft'] },
      { label: "I'm open to anything", tags: ['all'] },
    ],
  },
];

export const WORLDS = [
  {
    name: 'Connect',
    accent: 'bg-pulse-purpleSoft text-pulse-primary',
    categories: [
      { name: 'Open Lines', description: 'Reconnect with people' },
      { name: 'Good Sparks', description: 'Kindness and gratitude' },
      { name: 'Tiny Dares', description: 'Small courage and confidence missions' },
    ],
  },
  {
    name: 'Reflect',
    accent: 'bg-pulse-blueSoft text-pulse-blue',
    categories: [
      { name: 'Inner Pages', description: 'Self-awareness and reflection' },
      { name: 'North Star', description: 'Purpose and values' },
      { name: 'Money Mirror', description: 'Money awareness' },
    ],
  },
  {
    name: 'Recharge',
    accent: 'bg-pulse-greenSoft text-pulse-green',
    categories: [
      { name: 'Refuel', description: 'Rest, sleep, hydration, energy' },
      { name: 'Body Quest', description: 'Movement and physical activity' },
      { name: 'Fun Fuel', description: 'Play, joy, hobbies' },
    ],
  },
  {
    name: 'Build',
    accent: 'bg-pulse-yellowSoft text-pulse-gold',
    categories: [
      { name: 'Next Chapter', description: 'Career, learning, skills' },
      { name: 'Deep Work', description: 'Focus and discipline' },
      { name: 'Spark Lab', description: 'Creativity and making things' },
    ],
  },
  {
    name: 'Reset',
    accent: 'bg-pulse-purpleSoft text-pulse-primary',
    categories: [
      { name: 'Clear Space', description: 'Physical cleaning and decluttering' },
      { name: 'Screen Cleanse', description: 'Digital cleanup' },
      { name: 'Fresh Trails', description: 'Exploration and new experiences' },
    ],
  },
];

export const SKIP_REASONS = ['Too hard right now', 'Not relevant', 'Not today', 'Show me something else'];

export const DAY_ONE_MISSIONS = [
  'Reply to one message you have been delaying',
  'Clear one small surface near you',
  'Step outside for 5 minutes without scrolling',
];

