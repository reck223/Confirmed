export type Lesson = {
  id: string
  title: string
  duration: string
  content: string[]
  reflection: string
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
]
