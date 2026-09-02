import type { Href } from 'expo-router'

import type { IconName } from './icons'

export type PlayKind =
  | 'know_me'
  | 'choose_date'
  | 'appreciation'
  | 'memory'
  | 'dreams'
  | 'challenge'
  | 'ritual'
  | 'repair'

export type PlayRouteKind =
  | 'know-me'
  | 'choose-date'
  | 'appreciation'
  | 'memory'
  | 'dreams'
  | 'challenge'
  | 'ritual'
  | 'repair'

export type PlayLauncherItem = {
  kind: PlayKind | 'weekly'
  route: PlayRouteKind | 'weekly-review'
  href: Href
  title: string
  body: string
  icon: IconName
}

export const FEED_LAUNCHER: PlayLauncherItem[] = [
  {
    kind: 'know_me',
    route: 'know-me',
    href: '/(app)/play/know-me',
    title: 'How well do you know me?',
    body: 'One answers. One guesses. Match points.',
    icon: 'heart',
  },
  {
    kind: 'choose_date',
    route: 'choose-date',
    href: '/(app)/play/choose-date',
    title: 'Choose our date',
    body: 'Pick privately. Keep only the overlap.',
    icon: 'map-pin',
  },
  {
    kind: 'appreciation',
    route: 'appreciation',
    href: '/(app)/play/appreciation',
    title: 'Three-minute appreciation',
    body: 'Noticed, appreciated, looking forward to.',
    icon: 'sun',
  },
  {
    kind: 'weekly',
    route: 'weekly-review',
    href: '/(app)/weekly-review',
    title: 'Weekly check-in',
    body: 'Connection, stress, affection, teamwork, plans.',
    icon: 'calendar',
  },
  {
    kind: 'memory',
    route: 'memory',
    href: '/(app)/play/memory',
    title: 'Memory lane',
    body: 'A private collection of days you would relive.',
    icon: 'book-open',
  },
  {
    kind: 'dreams',
    route: 'dreams',
    href: '/(app)/play/dreams',
    title: 'Dream together',
    body: 'Wishes for travel, home, family, money, life.',
    icon: 'star',
  },
  {
    kind: 'challenge',
    route: 'challenge',
    href: '/(app)/play/challenge',
    title: 'Mini challenges',
    body: 'A small mission for the two of you.',
    icon: 'zap',
  },
  {
    kind: 'ritual',
    route: 'ritual',
    href: '/(app)/play/ritual',
    title: 'Shared rituals',
    body: 'Sunday coffee, evening walks, bedtime check-in.',
    icon: 'repeat',
  },
]

export function playKindFromRoute(route: string | undefined): PlayKind | null {
  switch (route) {
    case 'know-me':
      return 'know_me'
    case 'choose-date':
      return 'choose_date'
    case 'appreciation':
      return 'appreciation'
    case 'memory':
      return 'memory'
    case 'dreams':
      return 'dreams'
    case 'challenge':
      return 'challenge'
    case 'ritual':
      return 'ritual'
    case 'repair':
      return 'repair'
    default:
      return null
  }
}

export function playHref(kind: PlayKind): Href {
  const item = FEED_LAUNCHER.find((row) => row.kind === kind)
  if (item) return item.href
  return '/(app)/play/repair'
}

export function playMeta(kind: PlayKind | 'weekly' | 'checkin'): {
  title: string
  icon: IconName
} {
  if (kind === 'checkin') return { title: 'Daily question', icon: 'message-circle' }
  if (kind === 'weekly') return { title: 'Weekly check-in', icon: 'calendar' }
  if (kind === 'repair') {
    return { title: 'Repair together', icon: 'life-buoy' }
  }
  const item = FEED_LAUNCHER.find((row) => row.kind === kind)
  return { title: item?.title ?? 'Together', icon: item?.icon ?? 'heart' }
}

export type KnowMeQuestion = {
  id: string
  text: string
  options: string[]
}

export const KNOW_ME_QUESTIONS: KnowMeQuestion[] = [
  {
    id: 'km1',
    text: 'My ideal Saturday is…',
    options: [
      'Sleeping in, then a slow brunch',
      'A long walk outside',
      'A project at home',
      'Seeing friends',
    ],
  },
  {
    id: 'km2',
    text: 'When I feel stressed, I most want…',
    options: [
      'Quiet and space',
      'A hug and company',
      'A practical plan',
      'A distraction that makes me laugh',
    ],
  },
  {
    id: 'km3',
    text: 'My favorite way to feel loved is…',
    options: [
      'Words that are specific',
      'Time with phones away',
      'A small helpful act',
      'Physical closeness',
    ],
  },
  {
    id: 'km4',
    text: 'On a menu, I usually pick…',
    options: [
      'Whatever looks most comforting',
      'Something I have never tried',
      'The thing I always get',
      'Whatever you are excited about',
    ],
  },
  {
    id: 'km5',
    text: 'A perfect evening at home is…',
    options: [
      'Cooking and talking',
      'A show we both like',
      'Reading in the same room',
      'Music and a little dance in the kitchen',
    ],
  },
  {
    id: 'km6',
    text: 'If we had a free afternoon, I would choose…',
    options: [
      'A museum or bookstore',
      'Being outside',
      'Napping, then a treat',
      'A small adventure in a new neighborhood',
    ],
  },
]

export type DateIdea = {
  id: string
  label: string
  icon: IconName
}

export const DATE_DECK: DateIdea[] = [
  { id: 'coffee', label: 'Coffee date', icon: 'coffee' },
  { id: 'picnic', label: 'Picnic', icon: 'sun' },
  { id: 'cook', label: 'Cook together', icon: 'home' },
  { id: 'movie', label: 'Movie night', icon: 'film' },
  { id: 'museum', label: 'Museum wander', icon: 'image' },
  { id: 'hike', label: 'Walk or hike', icon: 'navigation' },
  { id: 'music', label: 'Live music', icon: 'music' },
  { id: 'books', label: 'Bookstore browse', icon: 'book' },
  { id: 'stars', label: 'Stargazing', icon: 'moon' },
  { id: 'dance', label: 'Dance in the kitchen', icon: 'heart' },
  { id: 'restaurant', label: 'New restaurant', icon: 'map-pin' },
  { id: 'games', label: 'Board games', icon: 'grid' },
]

export const APPRECIATION_FIELDS = [
  { id: 'noticed', label: 'Something I noticed', placeholder: 'A small thing from today' },
  {
    id: 'appreciated',
    label: 'Something I appreciated',
    placeholder: 'What it meant to you',
  },
  {
    id: 'forward',
    label: "Something I'm looking forward to",
    placeholder: 'A moment still ahead',
  },
] as const

export const MEMORY_PROMPTS = [
  { id: 'm1', text: 'What was your first impression of me?' },
  { id: 'm2', text: 'Which day together would you relive?' },
  { id: 'm3', text: 'What small moment still makes you smile?' },
  { id: 'm4', text: 'When did you first feel at home with me?' },
  { id: 'm5', text: 'What is a quiet memory you do not want to lose?' },
]

export type DreamCategoryId =
  | 'travel'
  | 'home'
  | 'family'
  | 'finances'
  | 'lifestyle'

export const DREAM_CATEGORIES: {
  id: DreamCategoryId
  label: string
  icon: IconName
  options: string[]
}[] = [
  {
    id: 'travel',
    label: 'Travel',
    icon: 'navigation',
    options: [
      'A long train trip',
      'A beach week',
      'A city we have never seen',
      'A cabin in the woods',
      'Visiting people we love',
    ],
  },
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    options: [
      'A plant-filled corner',
      'A kitchen we cook in often',
      'A quieter bedroom',
      'A place for guests',
      'A home that feels more ours',
    ],
  },
  {
    id: 'family',
    label: 'Family',
    icon: 'users',
    options: [
      'More time with family',
      'Clearer boundaries',
      'Traditions of our own',
      'Kids, someday',
      'Chosen family nearby',
    ],
  },
  {
    id: 'finances',
    label: 'Finances',
    icon: 'briefcase',
    options: [
      'An emergency cushion',
      'A shared savings goal',
      'Less money stress week to week',
      'A trip fund',
      'A home fund',
    ],
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    icon: 'sun',
    options: [
      'Slower mornings',
      'Phones away after dinner',
      'A weekly date night',
      'More time outside',
      'A creative hobby together',
    ],
  },
]

export const CHALLENGES = [
  {
    id: 'walk',
    label: 'Take a 15-minute phone-free walk',
    icon: 'navigation' as IconName,
  },
  {
    id: 'recreate',
    label: 'Recreate an early date',
    icon: 'refresh-cw' as IconName,
  },
  {
    id: 'cook',
    label: 'Cook something new together',
    icon: 'coffee' as IconName,
  },
  {
    id: 'compliment',
    label: 'Give a specific compliment',
    icon: 'heart' as IconName,
  },
  {
    id: 'unasked',
    label: 'Ask one question you have never asked before',
    icon: 'message-circle' as IconName,
  },
]

export const RITUAL_TEMPLATES = [
  {
    id: 'sunday-coffee',
    name: 'Sunday coffee',
    frequency: 'weekly' as const,
    description: 'Unhurried coffee, phones in another room.',
  },
  {
    id: 'date-night',
    name: 'Monthly date night',
    frequency: 'monthly' as const,
    description: 'One evening that is just for the two of you.',
  },
  {
    id: 'evening-walk',
    name: 'Evening walks',
    frequency: 'daily' as const,
    description: 'A short walk after dinner, even around the block.',
  },
  {
    id: 'bedtime',
    name: 'Five-minute bedtime check-in',
    frequency: 'daily' as const,
    description: 'One noticed thing, one need, one goodnight.',
  },
]

export const REPAIR_STEPS = [
  {
    id: 'pause',
    title: 'Pause',
    body: 'Take a breath. This is optional. You can leave at any time. Nothing here is a verdict.',
    prompt: 'What would help you feel a little safer right now?',
  },
  {
    id: 'describe',
    title: 'Describe what happened',
    body: 'Stick to what you saw and heard, without blame.',
    prompt: 'In a few sentences, what happened?',
  },
  {
    id: 'feelings',
    title: 'Acknowledge feelings',
    body: 'Name yours. You do not have to guess theirs.',
    prompt: 'What were you feeling underneath?',
  },
  {
    id: 'responsibility',
    title: 'Take responsibility',
    body: 'Own the part that was yours. Leave the rest.',
    prompt: 'What is one thing you want to take responsibility for?',
  },
  {
    id: 'next',
    title: 'Agree on a next step',
    body: 'Keep it small enough for this week.',
    prompt: 'What is one next step you can both live with?',
  },
] as const

export const REPAIR_CONSENT =
  'Repair together is optional. Use it after a disagreement, not during one. You can stop at any step. Bond is not therapy. If you feel unsafe, leave and get support.'

export function pickKnowMeQuestion(coupleId: string, salt = ''): KnowMeQuestion {
  const index = hashString(`${coupleId}:${salt}`) % KNOW_ME_QUESTIONS.length
  return KNOW_ME_QUESTIONS[index] ?? KNOW_ME_QUESTIONS[0]
}

export function pickMemoryPrompt(coupleId: string, salt = ''): { id: string; text: string } {
  const index = hashString(`${coupleId}:memory:${salt}`) % MEMORY_PROMPTS.length
  return MEMORY_PROMPTS[index] ?? MEMORY_PROMPTS[0]
}

export function overlapStrings(a: string[] | undefined, b: string[] | undefined): string[] {
  const other = new Set(b ?? [])
  return (a ?? []).filter((item) => other.has(item))
}

function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}
