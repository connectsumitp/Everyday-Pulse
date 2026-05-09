# Everyday Pulse

**Everyday Pulse** is a mobile-first, gamified self-growth app that helps people stop living on autopilot by completing small, meaningful real-life missions.

Instead of becoming another productivity app, habit tracker, or generic to-do list, Everyday Pulse gives users action-based missions based on what they need right now: kindness, courage, presence, creativity, reset, meaning, lightness, and slowing down.

Users choose a path, complete a real-world mission, earn **Life XP**, build momentum, unlock deeper mission packs, and reflect on how each mission made them feel.

> **Do something real today. Break autopilot, one pulse at a time.**

---

## Live Demo

**Production:** [everyday-pulse.vercel.app](https://everyday-pulse.vercel.app)

---

## Repository

GitHub: [connectsumitp/Everyday-Pulse](https://github.com/connectsumitp/Everyday-Pulse)

---

## What Everyday Pulse Solves

People do not just forget tasks.

They forget to do small meaningful actions that make life feel intentional.

Examples:

- Calling someone who deserves their time
- Sending a message they are overthinking
- Clearing the one space that keeps bothering them
- Writing something honest
- Taking a proper offline walk
- Helping someone with a real problem
- Sharing something creative before it feels perfect
- Completing one pending life admin task

Everyday Pulse turns these postponed actions into structured, rewarding **real-life missions**.

---

## Product Philosophy

Everyday Pulse is built around one core belief:

> A mission should make the user feel, “I actually did something.”

The app avoids missions that feel too passive or too tiny.

Weak examples:

- Smile at someone
- Think about your future
- Take one breath
- Notice the sky
- Read one page
- Be grateful silently

Strong examples:

- Call someone who deserves your time
- Write one full page about what matters right now
- Send the message you have been avoiding
- Clear one visible surface
- Help someone with a real problem
- Share one creative draft
- Complete one pending admin task

The product is designed around **action, effort, friction, completion proof, and emotional payoff**.

---

## Core Product Loop

```text
Onboarding
→ Choose first pulse
→ Start mission
→ Complete mission
→ Choose feeling
→ Add optional one-line reflection
→ Earn Life XP
→ Build momentum
→ Unlock deeper mission packs
→ Return tomorrow
```

---

## Key Features

### 1. Onboarding

A simple onboarding experience introduces the user to the app promise:

```text
Do small real-life pulses.
Earn Life XP.
Change the script.
```

The goal is not to over-explain the product. The goal is to get the user into their first real mission quickly.

---

### 2. First Mission Flow

New users start with a small but concrete mission instead of being dropped into a large library.

Example first missions:

- Reply to one message you have been delaying
- Clear one small surface near you
- Step outside for 5 minutes without scrolling

This teaches the core app loop through action.

---

### 3. Home Page States

The Home page changes based on the user’s current mission status.

#### State A: No Mission Selected

The user sees:

- XP chip in the top-right
- Mission discovery options
- Weekly momentum
- Next unlock
- Recent progress

Main actions:

- **Surprise Me**
- **Find My Mission**
- **Browse Categories**

#### State B: Mission In Progress

Once a user accepts a mission, the Home page shows:

- Today’s mission card
- Mission title
- Time required
- Difficulty
- XP
- Status: In Progress
- Continue Mission
- Save for Later

#### State C: Mission Completed

After completion, the Home page shows:

- Checkmark completion card
- Completed mission title
- Feeling emoji
- XP earned
- Tap-to-view reflection

This makes the app feel like a personal progress timeline rather than a static task list.

---

### 4. Find My Mission

Users can choose what they need right now using paths and time buckets.

#### Mission Paths

- I want to feel lighter
- I want to slow down
- I want to do something meaningful
- I want a small courage boost
- I want to do something kind
- I want to feel more present
- I want to reset my life
- I want to do something creative
- I’m open to anything

#### Time Buckets

- Under 5 minutes
- 5–15 minutes
- More than 15 minutes

The app uses rule-based matching instead of AI.

---

### 5. Surprise Me

The **Surprise Me** flow gives the user one unexpected mission.

The selection is still controlled by simple safety and quality rules:

- Mission must be unlocked
- Mission must not be recently completed
- Mission must not be recently skipped
- Sensitive missions should be avoided by default
- Easy and Medium missions are preferred unless the user has progressed further

This keeps randomness fun without making it chaotic.

---

### 6. Browse Categories

Everyday Pulse organizes missions into 5 larger worlds and 15 creative categories.

#### Connect

| Category | Meaning |
|---|---|
| Open Lines | Reconnect with people |
| Good Sparks | Kindness and gratitude |
| Tiny Dares | Small courage and confidence missions |

#### Reflect

| Category | Meaning |
|---|---|
| Inner Pages | Self-awareness and reflection |
| North Star | Purpose and values |
| Money Mirror | Money awareness |

#### Recharge

| Category | Meaning |
|---|---|
| Refuel | Rest, sleep, hydration, energy |
| Body Quest | Movement and physical activity |
| Fun Fuel | Play, joy, hobbies |

#### Build

| Category | Meaning |
|---|---|
| Next Chapter | Career, learning, skills |
| Deep Work | Focus and discipline |
| Spark Lab | Creativity and making things |

#### Reset

| Category | Meaning |
|---|---|
| Clear Space | Physical cleaning and decluttering |
| Screen Cleanse | Digital cleanup |
| Fresh Trails | Exploration and new experiences |

---

## Mission Detail Structure

Each mission should feel useful, specific, and complete.

A mission includes:

- Title
- Path
- World
- Category
- Time bucket
- Difficulty
- XP
- Why it matters
- Done when
- Examples, if useful
- Safety note, if needed

Example:

```text
Send the Overdue Thank You

Path:
I want to do something kind

Time:
Under 5 minutes

Difficulty:
Easy

XP:
10

Why it matters:
People often remember the one person who noticed their effort.

Done when:
You send one specific thank-you message.
```

---

## Completion Flow

After completing a mission, the user selects how it felt.

Feelings include:

- Proud
- Calm
- Connected
- Brave
- Lighter

The user can also add an optional one-line reflection.

Example prompt:

```text
What did you notice?
```

This keeps reflection lightweight without turning the app into a heavy journaling product.

---

## Life XP

Users earn XP for completing missions.

| Mission Difficulty | XP |
|---|---:|
| Easy | 10 XP |
| Medium | 25 XP |
| Hard | 50 XP |

XP is used for:

- Visible progress
- Leveling
- Unlocks
- Mission packs
- Motivation

---

## Levels

| XP | Level |
|---:|---|
| 0 | Starter |
| 250 | Explorer |
| 750 | Builder |
| 1500 | Brave Mode |
| 3000 | Life Architect |
| 5000 | Pulse Master |

---

## Unlocks

| XP | Unlock |
|---:|---|
| 0 | Starter Pulses |
| 250 | 5-Minute Wins Pack |
| 500 | Weekend Reset Pack |
| 750 | Reconnect Pack |
| 1500 | Tiny Dares Pack |
| 2000 | Screen Cleanse Pack |
| 3000 | 7-Day Life Reset Pack |
| 5000 | Brave Conversations Pack |

---

## Weekly Momentum

Instead of aggressive streak mechanics, Everyday Pulse uses a softer idea:

```text
Weekly Momentum
```

Example:

```text
3/5 mission days this week
```

The goal is to encourage consistency without guilt.

---

## Example Mission Paths

### I Want to Do Something Kind

Missions focus on real effort and useful kindness:

- Send the overdue thank you
- Send a useful lead
- Write a real appreciation note
- Take one task off someone’s plate
- Call someone who deserves your time
- Help someone with a real problem

### I Want a Small Courage Boost

Missions focus on micro-courage:

- Send the pending message
- Ask for the thing clearly
- Make the call you are avoiding
- Ask for real feedback
- Submit something you were holding back
- Have the respectful honest talk

### I Want to Do Something Creative

Missions require real creative output:

- Write a bad first draft
- Make a 5-photo mini story
- Build a tiny moodboard
- Make a mini carousel
- Finish one creative piece
- Publish or share one creation

### I Want to Do Something Meaningful

Missions create emotional evidence:

- Send one message that matters
- Save one memory properly
- Write a one-page life check-in
- Record a voice note to yourself
- Write a letter you may never send
- Have a meaningful conversation

### I Want to Feel Lighter

Missions reduce emotional clutter:

- Delete one small mental weight
- Send a silly message
- Clear one annoying notification pile
- Do a 10-minute reset walk
- Finish one thing that has been irritating you

### I Want to Feel More Present

Missions interrupt autopilot:

- Do one thing without your phone
- Eat one thing properly
- Take a no-scroll walk
- Sit with one person properly
- Complete a 30-minute offline block

### I Want to Reset My Life

Missions reduce chaos:

- Delete one tiny backlog
- Clear one visible surface
- Clean the chair pile
- Fix one annoying small problem
- Clear one life admin backlog
- Do a money clarity sweep

### I Want to Slow Down

Missions reduce rush mode:

- Drink something without multitasking
- Rewrite your next 30 minutes
- Take a slow no-scroll walk
- Eat one meal sitting down
- Do a full evening decompression

---

## Tech Stack

This repository uses:

- **React 18**
- **Vite 5**
- **React Router DOM**
- **Tailwind CSS**
- **Supabase JS**
- **Lucide React**
- **Vercel**

The project is a frontend-first Vite app connected to Supabase for data and authentication.

---

## Repository Structure

```text
Everyday-Pulse/
├── public/
├── src/
│   ├── lib/
│   │   ├── constants.js
│   │   ├── gameLogic.js
│   │   └── supabase.js
│   ├── main.jsx
│   └── styles.css
├── supabase/
├── .env.example
├── .gitignore
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/connectsumitp/Everyday-Pulse.git
cd Everyday-Pulse
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create a `.env` file in the project root.

Use this format:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The same keys are shown in `.env.example`.

### 4. Configure Supabase

Create a Supabase project and add the required database schema/migrations from the `supabase/` folder.

At minimum, the app expects tables for:

- Profiles/users
- Missions
- User mission status
- Completed missions
- XP/progress
- Weekly momentum
- Unlocks/badges, if enabled

Make sure Row Level Security is enabled where needed.

### 5. Start Development Server

```bash
npm run dev
```

The app should run at:

```text
http://localhost:5173
```

### 6. Build for Production

```bash
npm run build
```

### 7. Preview Production Build

```bash
npm run preview
```

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |

Do **not** expose Supabase service role keys in the frontend.

---

## Supabase Notes

The app uses Supabase for:

- Authentication
- Mission data
- User progress
- Mission completion
- XP tracking
- Weekly momentum
- Saved missions

The frontend should use only the anon/public key.

Sensitive writes should be protected with Row Level Security policies.

---

## Rule-Based Recommendation Logic

Everyday Pulse intentionally avoids an AI recommendation engine.

Recommendations are based on:

- Selected path
- Selected time bucket
- Mission tags
- User XP
- Unlock status
- Completion history
- Skip history
- Sensitive mission rules

Example scoring model:

```text
+5 if mission matches selected path
+3 if mission matches selected time bucket
+3 if mission is unlocked for the user
+2 if mission has not been shown recently
-5 if skipped recently
-10 if completed recently
-10 if sensitive and user did not choose a suitable path
```

---

## Mission Data Format

A mission can follow this structure:

```js
{
  title: "Send the overdue thank you",
  path: "I want to do something kind",
  world: "Connect",
  category: "Good Sparks",
  pack: "Starter",
  difficulty: "Easy",
  xp: 10,
  time_required: "<5 mins",
  tags: ["kindness", "gratitude", "quick"],
  unlock_xp: 0,
  why_it_matters: "People often remember the one person who noticed their effort.",
  completion_condition: "You send one specific thank-you message.",
  examples: [
    "Thank you for helping me when I needed it.",
    "I still remember what you did for me."
  ],
  safety_note: null,
  is_sensitive: false
}
```

---

## Visual Direction

Everyday Pulse should feel:

- Warm
- Soft
- Human
- Calm
- Slightly gamified
- Mobile-first
- Not corporate
- Not childish
- Not preachy

The visual style uses:

- Rounded cards
- Soft gradients
- Friendly icons
- XP chips
- Momentum dots
- Completion cards
- Gentle shadows
- Emotion-driven microcopy

Design inspiration:

- Duolingo-style progression, but calmer
- Headspace-style warmth, but less meditation-focused
- Habit tracker simplicity, but more emotionally meaningful

---

## Product Principles

### 1. Action Over Intention

Every mission should require the user to do something visible or concrete.

### 2. Gentle Progression

XP and streaks should motivate, not shame.

### 3. Low-Friction Reflection

Reflection should be one line, optional, and emotionally useful.

### 4. No AI Required

The MVP should work with static mission data and rule-based logic.

### 5. Real Life First

The product should gently push users back into the real world.

---

## Monetization Direction

The app can later monetize through:

- Paid mission packs
- Premium subscription
- Advanced progress insights
- Premium visual themes
- Group/community challenges

Suggested future paid packs:

- 7-Day Life Reset
- Weekend Reset
- Brave Conversations
- Reconnect Pack
- Screen Cleanse Pack
- Creative Reset Pack

Payments are not required for the current MVP.

---

## Deployment

The app is deployed on Vercel.

Before deploying, add these environment variables in Vercel:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Then redeploy the project.

---

## Security Notes

- Do not commit `.env`
- Do not expose Supabase service role keys in frontend code
- Keep Row Level Security enabled in Supabase
- Users should only access their own progress, completions, profile, saved missions, and reflections
- Public mission content can be readable by authenticated users

---

## Roadmap

### MVP

- Auth and onboarding
- First mission flow
- Home states
- Find My Mission
- Surprise Me
- Mission detail
- Completion flow
- XP
- Weekly momentum
- Saved missions
- Progress screen

### Next

- Expand mission bank
- Improve Browse Categories
- Add badges
- Add richer weekly recap
- Add unlockable mission packs
- Improve mobile animations
- Add PWA install prompt

### Later

- Paid mission packs
- Razorpay integration for web/PWA
- Shareable weekly recap cards
- Community/group challenges
- Optional AI features only if there is a clear user need

---

## Author

Built by **Sumit Pandey**

GitHub: [@connectsumitp](https://github.com/connectsumitp)

---

## License

No license has been added yet.

If this project will remain private or portfolio-only, keep it unlicensed. If you want others to use or contribute, consider adding an MIT License.

---

## Final Note

Everyday Pulse is not about doing more.

It is about doing one real thing that makes the day feel less automatic.

> **Tiny actions count, but real actions matter.**
