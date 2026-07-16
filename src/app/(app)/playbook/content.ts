export type LessonLink = { label: string; url: string }

export type Lesson = {
  id: string
  title: string
  duration: string
  content: string[]
  reflection: string
  pullQuote?: string
  links?: LessonLink[]
}

export type Module = {
  id: string
  title: string
  emoji: string
  color: string
  tagline: string
  lessons: Lesson[]
}

export const PLAYBOOK: Module[] = [
  {
    id: 'foundation',
    title: 'Set the Foundation',
    emoji: '🏗️',
    color: '#D4AF37',
    tagline: 'Most goals fail before they start. Learn why — and how to build ones that stick.',
    lessons: [
      {
        id: 'foundation-1',
        title: 'Why most goals fail',
        duration: '3 min',
        pullQuote: 'When you focus on what you do daily, you build a track record — and track records build identity.',
        reflection: 'Think of a goal you set and abandoned. What actually stopped you — the goal itself, your system, or your environment?',
        content: [
          'Research on goal achievement consistently finds the same thing: it\'s not motivation that makes goals stick. It\'s structure. Most people set goals that are really just wishes — vague desires with no concrete path forward.',
          'The biggest killers are outcome dependency and all-or-nothing thinking. "I want to lose 30 pounds" is an outcome, not a goal. The moment life gets in the way, there\'s no smaller win to hold on to. The whole thing collapses.',
          'What works is building goals around behavior, not outcomes. Behaviors are fully within your control. Outcomes often aren\'t. When you focus on what you do daily, you build a track record — and track records build identity. You stop trying to "become" someone and start proving you already are.',
          'The other thing that kills goals: isolation. Humans are wired to perform differently when others are watching. Accountability isn\'t a nice-to-have. It\'s the mechanism. That\'s what this platform is built around.',
        ],
      },
      {
        id: 'foundation-2',
        title: 'Anatomy of a great goal',
        duration: '4 min',
        pullQuote: 'Your Why should connect to something that genuinely matters to you, not what you think should matter. If it doesn\'t make you feel something, keep digging.',
        reflection: 'Pick one of your current goals and write the "why" behind it. Then ask why that matters. Do that three times and see what you find.',
        content: [
          'A great goal has three layers: the What, the Why, and the How. Most people only define the What. That\'s the first mistake.',
          'The What needs to be specific enough to be visualizable. Not "get fit" but "run a 5K without stopping." Not "grow my business" but "land 3 new clients this quarter." You should be able to look at a goal six months from now and know with certainty whether you achieved it or not.',
          'The Why is what keeps you moving when the motivation fades — and it always fades. Your Why should connect to something that genuinely matters to you, not what you think should matter. If your Why doesn\'t make you feel something when you say it, keep digging.',
          'The How is your milestone map. Big goals broken into concrete, sequenced steps. Each milestone should be achievable in 1-4 weeks. If a milestone takes longer than a month, it\'s actually a sub-goal — break it down further. This is where most goal-setters skip steps and then wonder why they feel stuck.',
        ],
      },
      {
        id: 'foundation-3',
        title: 'Choosing your focus areas',
        duration: '3 min',
        pullQuote: 'Energy is finite. The people who achieve the most tend to concentrate their effort intensely, not spread it thin.',
        reflection: 'If you could only move forward in two areas of your life this year, what would they be — and why those two?',
        content: [
          'Energy is finite. Trying to transform every area of your life simultaneously is a recipe for burning out and making progress in nothing. The people who achieve the most tend to concentrate their effort intensely, not spread it thin.',
          'The best framework is to pick 1-3 focus areas per quarter, not per year. A year is too abstract. A quarter is long enough to make real progress, short enough to feel urgent. At the end of each quarter, you reassess — what needs attention now, what can wait.',
          'When choosing focus areas, ask: what has the highest leverage? What area, if improved, would make everything else easier or better? Health often does this — energy and clarity compound into every other area. So does mindset. So do core relationships.',
          'It\'s also worth asking: what\'s a problem I\'ve been tolerating for too long? The thing that quietly costs you energy every day but that you keep putting off. Those problems deserve a quarter of your attention.',
        ],
      },
      {
        id: 'foundation-4',
        title: 'Milestone mapping',
        duration: '4 min',
        pullQuote: 'Milestones are what turn a goal from a destination into a route. Without them, you\'re navigating without a map.',
        reflection: 'Take one active goal and try to map it into 5-8 milestones right now. What does each step need to look like for the goal to actually happen?',
        content: [
          'Milestones are what turn a goal from a destination into a route. Without them, you\'re navigating without a map — you know where you want to end up but have no idea if you\'re moving in the right direction.',
          'Good milestones are concrete, sequenced, and near-term. Concrete means you can definitively say "done" when they\'re complete. Sequenced means they build on each other logically. Near-term means each one is achievable within a few weeks at most.',
          'A common mistake is writing milestones that are really just smaller versions of the goal. "Lose 5 pounds" as a milestone toward "lose 30 pounds" tells you nothing about what to do differently. Better: "Build a weekly workout schedule and stick to it for 3 weeks," "Cut out alcohol on weekdays for a month." Behavior-based milestones, not outcome-based ones.',
          'When you finish mapping, look at your list and ask: if I hit all these milestones, is the goal actually achieved? If yes, your map is solid. If you\'re not sure, you\'re probably missing steps. Add them now — it\'s better to over-specify than to run out of road halfway through.',
        ],
      },
    ],
  },
  {
    id: 'circle',
    title: 'Build Your Circle',
    emoji: '👥',
    color: '#38bdf8',
    tagline: 'Accountability isn\'t a mindset hack. It\'s a social technology. Learn to use it well.',
    lessons: [
      {
        id: 'circle-1',
        title: 'The science of accountability',
        duration: '3 min',
        pullQuote: 'When someone we respect knows about our goals, our sense of self becomes tied to following through. That\'s a much stronger motivator than willpower.',
        reflection: 'Who in your life already holds you accountable — even informally? What do they do that makes it work?',
        content: [
          'In 2015, the American Society of Training and Development published research that found people are 65% more likely to meet a goal if they commit to someone else. If they schedule a specific accountability appointment, that number jumps to 95%. This isn\'t anecdotal — it\'s a consistent finding across decades of behavioral science.',
          'The mechanism is social identity. When someone we respect knows about our goals, our sense of self becomes tied to following through. Backing out doesn\'t just feel like personal failure — it changes how we see ourselves in relation to people we care about. That\'s a much stronger motivator than willpower.',
          'Accountability also creates what psychologists call "implementation intentions" — specific plans for how and when you\'ll act. The act of telling someone your goal forces you to make it concrete enough to explain. Vague goals can\'t survive that process.',
          'The key is choosing the right kind of accountability. Cheerleading doesn\'t work — research shows that praise for who you are rather than what you do can actually reduce effort. What works is honest, specific check-ins focused on what you did and what got in the way.',
        ],
      },
      {
        id: 'circle-2',
        title: 'Choosing your circle',
        duration: '3 min',
        pullQuote: 'The best circle members are people who are working toward something themselves. They have skin in the game.',
        reflection: 'If you\'re building your circle right now, who are the 2-3 people you\'d want in it? What makes them the right choice?',
        content: [
          'Not everyone makes a good accountability partner. The most common mistake is choosing someone who loves you unconditionally — a close friend or family member who will always say you\'re doing great. That feels supportive but it\'s not accountability. It\'s reassurance.',
          'The best circle members are people who are working toward something themselves. They have skin in the game. They understand what momentum feels like and what excuses sound like, because they\'ve had to fight through both. Shared ambition creates mutual investment.',
          'Size matters too. A circle of 2-5 people is ideal. Smaller than that and you lose the social density that creates real culture. Larger than that and diffusion of responsibility sets in — no one feels personally responsible for showing up because everyone assumes someone else will.',
          'Finally, look for complementary strengths, not just similar goals. You want someone who will call you out on the exact kind of excuse you tend to make. If you\'re the type to rationalize quitting when it gets hard, find someone who has a track record of pushing through discomfort. They\'ll see your patterns before you do.',
        ],
      },
      {
        id: 'circle-3',
        title: 'How to give accountability',
        duration: '4 min',
        pullQuote: 'The most powerful thing you can do for someone is ask them what they\'re going to do next, not tell them what they should do.',
        reflection: 'Think of the last time you checked in on someone\'s goal. What did you say? What might have been more useful?',
        content: [
          'Most people focus on how to receive accountability. The ones who build the strongest circles know how to give it. That\'s the skill that multiplies everything.',
          'Giving accountability starts with specificity. "How are you doing?" is a social question that gets social answers. "Did you complete the two milestones you committed to last week? What got in the way if not?" is an accountability question. The difference is that accountability questions hold people to their own specific commitments.',
          'Avoid the two failure modes: excessive kindness and performative harshness. Excessive kindness feels good but doesn\'t move the needle — you\'re managing their feelings instead of supporting their growth. Performative harshness mistakes cruelty for accountability. Real accountability is honest, specific, and fundamentally caring.',
          'The most powerful thing you can do for someone is ask them what they\'re going to do next, not tell them what they should do. Autonomy matters. When people generate their own next steps, they\'re far more likely to follow through than when told what to do. Ask "What\'s your plan?" not "You should probably..."',
        ],
      },
      {
        id: 'circle-4',
        title: 'The weekly check-in ritual',
        duration: '3 min',
        pullQuote: 'After 8 weeks of honest check-ins, your circle knows your patterns, your excuses, and your strengths better than almost anyone.',
        reflection: 'Design your ideal weekly check-in. When, how long, what questions, with whom?',
        content: [
          'A ritual is a pattern with meaning attached to it. The difference between a habit and a ritual is that rituals carry intention. Your weekly circle check-in should feel like something — not just another recurring calendar event.',
          'The format that works best for most circles: a brief async post (not a meeting) at a fixed time each week. Monday morning for intentions, Sunday evening for reflection. The fixed time is crucial — it removes the friction of deciding when to check in. It just happens.',
          'Great check-in prompts: What did you commit to last week, and what actually happened? What\'s one win you\'re proud of, even if it was small? What\'s the one thing that, if you complete it this week, would move the needle most? What might get in the way, and what\'s your plan?',
          'The magic of the weekly ritual is that it creates a rhythm of accountability that compounds over time. After 8 weeks of honest check-ins, your circle knows your patterns, your excuses, and your strengths better than almost anyone. That knowledge is valuable. Don\'t waste it by keeping check-ins shallow.',
        ],
      },
    ],
  },
  {
    id: 'motion',
    title: 'Stay in Motion',
    emoji: '⚡',
    color: '#a78bfa',
    tagline: 'Starting is easy. The real skill is what you do when momentum dies.',
    lessons: [
      {
        id: 'motion-1',
        title: 'The daily intention habit',
        duration: '3 min',
        pullQuote: 'The question to ask each morning isn\'t "what do I need to do?" but "what would make today meaningful, and what\'s the one thing I\'m committed to no matter what?"',
        reflection: 'Write down your intention for tomorrow right now. One sentence, one focus. What needs to happen for tomorrow to be a success?',
        content: [
          'The single highest-leverage habit most high performers share isn\'t their morning routine or their journaling practice. It\'s a daily intention — a deliberate, specific commitment to what today is for.',
          'An intention is not a to-do list. A to-do list is reactive; you\'re responding to what exists. An intention is proactive; you\'re deciding what matters. The question to ask each morning isn\'t "what do I need to do?" but "what would make today meaningful, and what\'s the one thing I\'m committed to no matter what?"',
          'The ritual is simple: write one sentence. Not a paragraph, not a list. One sentence that captures your most important commitment for the day. This forces prioritization — you can only pick one thing. Everything else either supports that one thing or it doesn\'t.',
          'Evening reflection closes the loop: did you do what you intended? If yes, acknowledge it — small wins build momentum. If not, don\'t rationalize. Just name what actually happened. Patterns become visible when you\'re honest with yourself daily. That visibility is where change starts.',
        ],
      },
      {
        id: 'motion-2',
        title: 'When you fall behind',
        duration: '4 min',
        pullQuote: 'Motion creates motivation, not the other way around. The smallest action is always available.',
        reflection: 'Think of a time you fell behind on something important. What story did you tell yourself? Was it true?',
        content: [
          'Everyone falls behind. The difference between people who achieve their goals and those who don\'t isn\'t that the successful ones never fall off — it\'s how quickly they get back on.',
          'The most dangerous moment isn\'t falling behind. It\'s the story you tell yourself about falling behind. "I\'m not disciplined enough." "I\'m not the kind of person who finishes things." "I\'ve ruined it now, so why bother?" These stories feel like insights. They\'re actually excuses dressed up as self-awareness.',
          'The restart protocol: acknowledge exactly what happened, without minimizing or dramatizing. Then ask one question — what\'s the smallest possible action I can take right now to get moving again? Not the action that makes up for lost time. Not the one that proves you\'re serious. The smallest one. Because motion creates motivation, not the other way around.',
          'Tell your circle. This is what they\'re for. Not to witness your perfect streak — to be there when the streak breaks. The people who openly share their setbacks with their circle consistently recover faster than those who go quiet when things get hard. Hiding compounds the problem. Sharing dissolves it.',
        ],
      },
      {
        id: 'motion-3',
        title: 'Celebrate your progress',
        duration: '3 min',
        pullQuote: 'Celebration isn\'t indulgence — it\'s neurological calibration. Acknowledging a win trains your brain to associate effort with reward.',
        reflection: 'What\'s one thing you\'ve accomplished in the last month that you haven\'t given yourself credit for? Name it.',
        content: [
          'Most ambitious people are terrible at celebrating progress. There\'s always something more to do, something further to go, some version of themselves they haven\'t become yet. The milestone they just hit barely registers before their attention jumps to what\'s next.',
          'This is a mistake that compounds over time. When progress goes unacknowledged, your brain doesn\'t record it as a win. You work harder and harder but your sense of momentum stays flat. Eventually, the effort feels pointless because it never seems to add up to anything.',
          'Celebration isn\'t indulgence — it\'s neurological calibration. Acknowledging a win literally trains your brain to associate effort with reward, which makes future effort more accessible. It\'s not soft. It\'s strategic.',
          'Share your progress with your circle. Not to brag — to document. When you share a win, your circle reflects it back to you, making it more real. You also give them permission to celebrate their own wins. The culture of a circle is set by what people are willing to share. Share the real wins, and others will too.',
        ],
      },
      {
        id: 'motion-4',
        title: 'The quarterly review',
        duration: '4 min',
        pullQuote: 'A quarter of experience changes you. What mattered then might not matter now. Give yourself permission to change direction.',
        reflection: 'If you were to score your last quarter out of 10, what would it be — and what would make next quarter a 9 or 10?',
        content: [
          'A quarterly review is one of the most underused tools in goal achievement. Most people either review daily (too granular, loses the forest for the trees) or annually (too infrequent, too much drift). A quarter is the perfect unit: long enough to judge real progress, short enough to course-correct.',
          'A good quarterly review answers four questions: What did I accomplish that I\'m proud of? What didn\'t I finish, and why? What did I learn about myself that I didn\'t know at the start? What should I focus on next quarter given what I now know?',
          'The last question is the most important — and the most often skipped. Most people roll their incomplete goals forward without questioning whether they\'re still the right goals. A quarter of experience changes you. What mattered then might not matter now. Give yourself permission to change direction.',
          'Do your quarterly review with your circle, not alone. Ask them what they observed about you this quarter. What patterns did they notice? Where did they see you hold back? Where did they see you perform beyond your own expectations? External perspective on your quarter is worth more than any self-assessment.',
        ],
      },
    ],
  },
  {
    id: 'mindset',
    title: 'Master Your Mind',
    emoji: '🧠',
    color: '#ec4899',
    tagline: 'Discipline is a skill. Identity is the engine. Learn to think like someone who finishes things.',
    lessons: [
      {
        id: 'mindset-1',
        title: 'The motivation myth',
        duration: '3 min',
        pullQuote: 'Action precedes motivation, not the other way around. Starting a task — even reluctantly — almost always produces the energy you were waiting for before you started.',
        reflection: 'Think of something you do consistently without needing motivation — brushing your teeth, checking your phone. What makes it automatic? Can you apply that same structure to a goal?',
        content: [
          'Motivation is a feeling, not a plan. It comes and goes based on sleep, mood, what you ate, and a hundred things outside your control. Building your goals around motivation is like building a house on sand — it looks fine until the weather changes.',
          'The highest performers in any field don\'t rely on motivation. They rely on systems. They\'ve structured their environment and their schedule so that the right behavior happens regardless of how they feel. The action comes first; the motivation often follows.',
          'The research on this is clear: action precedes motivation, not the other way around. Starting a task — even reluctantly — almost always produces the engagement and energy you were waiting for before you started. "I\'ll do it when I feel like it" is a trap. The feeling comes from doing it.',
          'This doesn\'t mean grinding through misery indefinitely. It means having a system that gets you moving, and then trusting that the feeling will catch up. Design for consistency, not for inspiration.',
        ],
      },
      {
        id: 'mindset-2',
        title: 'Identity-based change',
        duration: '4 min',
        pullQuote: 'Every action you take is a vote for the kind of person you are. Over time, those votes form a pattern. The pattern becomes your identity.',
        reflection: 'For one goal you\'re working on, write the identity statement: "I am the kind of person who ___." Does your behavior this week match that identity? Where does it not?',
        content: [
          'Most people set outcome goals: lose 20 pounds, make $100K, write a book. Outcome goals tell you where you want to end up. They don\'t tell you who you need to become to get there. That\'s the missing layer.',
          'Identity-based change flips the script. Instead of "I want to run a marathon," the question becomes "What would a runner do today?" The identity shapes the behavior. The behavior accumulates into the outcome. You stop chasing the result and start building the self.',
          'Every action you take is a vote for the kind of person you are. Skip a workout: you vote for someone who doesn\'t follow through. Show up when it\'s inconvenient: you vote for someone who does. Over time, these votes form a pattern. The pattern becomes your identity. Your identity determines your ceiling.',
          'This isn\'t about perfection. It\'s about direction. Missing once doesn\'t make you someone who quits — it\'s missing twice in a row that starts to. The goal is never a flawless record; it\'s a consistent pattern over time.',
        ],
      },
      {
        id: 'mindset-3',
        title: 'Reframing failure',
        duration: '3 min',
        pullQuote: 'The people who advance fastest aren\'t the ones who fail least — they\'re the ones who extract the most signal from each failure and act on it quickly.',
        reflection: 'Pick a recent failure or setback. Write down three concrete things it taught you that you wouldn\'t have learned any other way.',
        content: [
          'Failure is information. It tells you something isn\'t working — your approach, your timing, your assumptions, your preparation. The people who advance fastest aren\'t the ones who fail least; they\'re the ones who extract the most signal from each failure and act on it quickly.',
          'The problem is that most people don\'t treat failure as information. They treat it as verdict. "I failed" becomes "I\'m a failure," and from there it\'s a short step to quitting. This is the most avoidable reason people don\'t reach their goals.',
          'The reframe: every failed attempt narrows the solution space. You now know at least one thing that doesn\'t work. That\'s not nothing — that\'s evidence. Scientists call this a result. They don\'t consider negative results to be failures; they consider them data that guides the next experiment.',
          'Your circle is your lab. Share what didn\'t work. Ask what others have tried. Let your failures become assets rather than things to hide. The culture you\'re building together — one where people talk openly about setbacks — is more valuable than any individual breakthrough.',
        ],
      },
      {
        id: 'mindset-4',
        title: 'Managing self-doubt',
        duration: '4 min',
        pullQuote: 'The difference isn\'t that they\'ve eliminated the doubt. It\'s that they\'ve learned to act in spite of it.',
        reflection: 'Write down the most common self-doubt you experience around your main goal. Then write what you would tell a close friend who came to you with the exact same doubt.',
        content: [
          'Self-doubt is universal. The people you admire most — the ones who seem fearless and certain — experience it too. The difference isn\'t that they\'ve eliminated the doubt. It\'s that they\'ve learned to act in spite of it.',
          'Imposter syndrome — the feeling that you\'re not as capable as people think, that you\'ll eventually be found out — affects high achievers at a disproportionately high rate. It\'s almost a sign that you\'re growing into something real. If the goal didn\'t stretch you, you wouldn\'t doubt yourself.',
          'The most effective technique isn\'t to silence the doubt — it\'s to question it. "What evidence do I actually have that I can\'t do this?" Often the doubt is making a claim that doesn\'t hold up under scrutiny. "I\'ve never done this before" is true. "I can\'t do this" is an interpretation, not a fact.',
          'Tell your circle when you\'re doubting yourself. Not to seek reassurance — to get reality-checked. The people who know you best can often see your capacity more clearly than you can from the inside of your own head.',
        ],
      },
    ],
  },
  {
    id: 'systems',
    title: 'Build Your System',
    emoji: '⚙️',
    color: '#22c55e',
    tagline: 'Goals tell you where to go. Systems are how you actually get there. Build ones that run without you.',
    lessons: [
      {
        id: 'systems-1',
        title: 'Design your environment',
        duration: '3 min',
        pullQuote: 'Before you try to discipline your way to a goal, ask: does my environment support this? Could I make the right choice so easy that discipline barely matters?',
        reflection: 'Pick one goal and identify three changes to your physical or digital environment that would make progress the path of least resistance. What would you need to remove, add, or rearrange?',
        content: [
          'You are not as in control of your behavior as you think. Your environment is constantly shaping your choices in ways you don\'t notice. The food you eat, the media you consume, the work you do — much of it is determined by what\'s convenient and immediately available, not by deliberate decision.',
          'Environment design is the most underused tool in goal achievement. It means structuring your surroundings so that the right behavior is easier than the wrong one. Put the running shoes by the door. Remove the apps that drain your focus. Keep your journal on your pillow. Make the invisible cues visible.',
          'Friction is a powerful force in both directions. Adding friction to bad habits makes them harder to do impulsively. Removing friction from good habits makes them the default. A bowl of fruit on the counter gets eaten. A bag of chips in the back of the pantry behind other things mostly doesn\'t. Same impulses, different environments, different outcomes.',
          'Before you try to discipline your way to a goal, ask: does my environment support this? Could I make the right choice so easy that discipline barely matters? The answer is almost always yes — and the changes are usually simpler than you expect.',
        ],
      },
      {
        id: 'systems-2',
        title: 'The habit stack',
        duration: '3 min',
        pullQuote: 'New habits are hard to start from scratch. But attaching them to existing habits borrows the automaticity of something already wired in.',
        reflection: 'List three habits you do automatically every day (morning coffee, locking the door, checking your phone). Now identify one new behavior you want to build and design a habit stack around each.',
        content: [
          'New habits are hard to start from scratch. But attaching them to existing habits is remarkably effective. "After I pour my morning coffee, I will write my daily intention" is far more likely to stick than "I will write my daily intention every morning." The trigger is already wired in — you\'re just adding a behavior to it.',
          'This is called habit stacking, and it works because existing habits are deeply grooved neural pathways. You don\'t choose to do them; you just do them. By linking a new behavior to an existing one, you borrow the automaticity of the established habit.',
          'The formula: After/Before [existing habit], I will [new behavior]. The more specific, the better. "After I sit down at my desk, I will set a 25-minute timer and work on my most important task before opening email." Vague intentions don\'t survive contact with the reality of a busy day.',
          'Stack habits in sequences. Morning coffee → intention → review yesterday\'s goal progress → check in with circle. Each behavior triggers the next. Over time, the whole sequence becomes one automatic block, and you\'ve built a system without ever thinking of it as one.',
        ],
      },
      {
        id: 'systems-3',
        title: 'Energy management',
        duration: '4 min',
        pullQuote: 'You can\'t make more time — everyone has 24 hours. What you can manage is energy. The same hour produces dramatically different work depending on when you use it.',
        reflection: 'Map your energy through a typical day: when are you sharpest, when do you dip, when do you recover? Now look at your schedule — are you doing your most important work during your peak hours?',
        content: [
          'Time management is a red herring. You can\'t make more time — everyone has 24 hours. What you can manage is energy. The same hour at 9am when you\'re sharp and focused will produce dramatically different work than the same hour at 3pm when you\'re running on caffeine and inertia.',
          'Every person has a chronotype — a natural pattern of energy peaks and troughs throughout the day. Most people know roughly when they\'re sharpest, but almost no one designs their schedule around it. They do email at their peak and deep work in the afternoon, then wonder why they feel unproductive.',
          'The discipline isn\'t only working when you feel good. It\'s protecting your peak hours aggressively for your most important work, and deliberately scheduling low-demand tasks for low-energy periods. This single change can produce more output than adding hours to your workday.',
          'Recovery is part of the system. Sleep is the foundation — there is no habit, strategy, or supplement that compensates for consistent sleep deprivation. Short breaks, movement, nutrition, and genuine time off aren\'t luxuries; they\'re part of what makes high performance sustainable over months and years.',
        ],
      },
      {
        id: 'systems-4',
        title: 'Your weekly reset',
        duration: '4 min',
        pullQuote: 'Without a weekly reset, weeks blur into each other. Monday arrives and you\'re still in reactive mode from last week.',
        reflection: 'Design your ideal weekly reset. What day, what time, what questions would you ask yourself? What would make you leave that session feeling set up for the week ahead?',
        content: [
          'Without a weekly reset, weeks blur into each other. Monday arrives and you\'re still in reactive mode from last week, putting out the same fires, drifting toward the same defaults. The reset is the moment you step out of the week and look at it from above.',
          'A weekly reset has two parts: a review and a plan. The review answers: What happened? What did I actually accomplish versus what I intended? What patterns do I notice? What slowed me down? The plan answers: What are the three most important things I need to move forward this week? What commitments do I need to protect? What have I been avoiding?',
          'The best resets are short — 20 to 30 minutes is enough. The goal isn\'t a comprehensive life audit every Sunday. It\'s a calibration. A way of making sure you\'re still moving in the direction you chose, and course-correcting before drift becomes distance.',
          'Share your weekly intentions with your circle. Not a list of tasks — your focus, your commitment for the week. When other people know what you\'re working toward, the week has stakes. And when you check in at the end of the week, you have someone to answer to beyond yourself.',
        ],
      },
    ],
  },
  {
    id: 'longterm',
    title: 'The Long Game',
    emoji: '🏔️',
    color: '#f97316',
    tagline: 'What you do daily is who you become eventually. Learn to think in years, not weeks.',
    lessons: [
      {
        id: 'longterm-1',
        title: 'Compounding everything',
        duration: '3 min',
        pullQuote: 'Most people quit in the compounding curve\'s flat phase, right before the inflection point. The math is invisible until suddenly it isn\'t.',
        reflection: 'Pick one area of your life — a skill, a relationship, a habit, a financial behavior. What would consistent 1% improvement look like over 12 months? What would that compound to over five years?',
        content: [
          'Compounding is the most powerful force in goal achievement, and it\'s almost entirely invisible in the short term. A 1% improvement every day for a year results in a 37x improvement by the end. A 1% decline every day results in almost nothing left. The math sounds impossible until you live it.',
          'The problem with compounding is that it\'s front-loaded with sacrifice and back-loaded with reward. For months or years, you do the work and see almost nothing. Then suddenly — often all at once — the results become undeniable. Most people quit in the compounding curve\'s flat phase, right before the inflection.',
          'This applies to everything: relationships, skills, reputation, fitness, financial capital, knowledge. Every meaningful thing in your life is either compounding in the right direction or declining from neglect. There is no neutral. Time passes regardless; the question is what it\'s doing to you.',
          'Your circle accelerates compounding. Watching others make consistent progress raises your baseline for what\'s possible. Having people who remember what you committed to three months ago keeps you honest. Community is the compound interest of accountability.',
        ],
      },
      {
        id: 'longterm-2',
        title: 'Strategic quitting',
        duration: '4 min',
        pullQuote: 'Sunk cost is the enemy of clear thinking. The only relevant question is forward-looking: given everything I now know, is this still the best use of my time?',
        reflection: 'Is there a goal, project, or commitment in your life right now that you\'re continuing out of sunk-cost thinking rather than genuine belief in its future? What would a clear-eyed decision look like?',
        content: [
          'Quitting gets a bad reputation. Grit and persistence are celebrated — sometimes to the point where people stay in the wrong direction long after it\'s clear they should change course. Strategic quitting isn\'t giving up; it\'s recognizing that not all paths lead where you thought they did.',
          'Sunk cost is the enemy of clear thinking. The money you already spent, the time you already invested, the identity you\'ve built around a goal — none of these are reasons to continue. The only relevant question is forward-looking: given everything I now know, is this still the best use of my time and energy?',
          'The distinction that matters: quitting because it\'s hard is giving up. Quitting because the goal no longer reflects who you are or what you want is clarity. People change. Priorities shift. The person who set a goal six months ago had different information than you do now. Honoring your past self\'s commitment regardless isn\'t loyalty — it\'s rigidity.',
          'Use your circle as a sounding board before a major quit. Not to be talked out of it, but to have your reasoning challenged. Is this a dip that everyone goes through, or is this genuinely the wrong direction? The people who know you best can help you tell the difference.',
        ],
      },
      {
        id: 'longterm-3',
        title: 'Playing your own game',
        duration: '3 min',
        pullQuote: 'Your goals should feel slightly embarrassing to say out loud — not because they\'re too small, but because they\'re genuinely yours.',
        reflection: 'In what areas of your life are you most likely to compare yourself to others? How does that comparison change your behavior — does it motivate you or deflect you from your actual path?',
        content: [
          'Social comparison is baked into human psychology. We\'ve always calibrated our status by looking at those around us. For most of history, "around us" meant a village of a few hundred people. Now it means a global highlight reel of billions, carefully curated to show the best of everything, all the time.',
          'Comparison is a thief. It steals satisfaction from what you\'ve already built, redirects your energy toward goals that aren\'t yours, and gives you an unrealistic picture of how people actually live. The person whose life looks perfect on screen is navigating the same invisible struggles you are.',
          'Playing your own game means defining what success looks like for you — specifically, precisely, in your own words — and then measuring yourself only against that definition. Not against your peers, not against an Instagram feed, not against who you thought you\'d be by now. Against the life you actually want.',
          'Your goals should feel slightly embarrassing to say out loud — not because they\'re too small, but because they\'re genuinely yours. Other people\'s goals, borrowed without examination, will never produce the motivation needed to see them through.',
        ],
      },
      {
        id: 'longterm-4',
        title: 'Who you\'re becoming',
        duration: '4 min',
        pullQuote: 'The person you become is a function of what you practice. Not what you intend to practice. What you actually do, repeatedly, over time.',
        reflection: 'Fast-forward five years. If you continue on your current path — the habits, the work, the relationships, the commitments — who do you become? Is that the person you want to be?',
        content: [
          'Most goal-setting focuses on what you want to have or achieve: a title, a body, a bank balance, a relationship. These are fine targets. But they\'re not really what you\'re after. What you\'re after is the version of yourself that having those things represents.',
          'The person you become is a function of what you practice. Not what you intend to practice, or what you plan to practice when life settles down. What you actually do, repeatedly, over time. That\'s who you\'re becoming — right now, in the choices you make today, this week, this year.',
          'The highest-leverage question in goal achievement isn\'t "What do I want?" It\'s "Who do I need to become to get there, and would I want to be that person even if I never got the outcome?" Because the process shapes you regardless of whether the outcome arrives on schedule.',
          'This is the last lesson in the Playbook, but it\'s really the first one. Every other skill, framework, and habit here is in service of a single thing: becoming someone who shows up for the life they actually want, consistently, over time. Not perfectly. Consistently. That\'s the whole game.',
        ],
      },
    ],
  },
]
