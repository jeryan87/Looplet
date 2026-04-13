export interface Prompt {
  id: string;
  text: string;
}

// The 10 fixed prompts parents choose from each letter.
// {name} is replaced at render time with the child's name.
// {pronoun} is replaced with the configured pronoun (he/she/they).
export const PROMPTS: Prompt[] = [
  { id: 'p1', text: 'Something {name} learned this week' },
  { id: 'p2', text: 'A funny moment we want to remember' },
  { id: 'p3', text: 'What {name} is currently obsessed with' },
  { id: 'p4', text: 'A challenge we\'re working through' },
  { id: 'p5', text: 'Something that surprised us' },
  { id: 'p6', text: 'A milestone, big or small' },
  { id: 'p7', text: 'What made {name} laugh' },
  { id: 'p8', text: 'Something {name} said or did for the first time' },
  { id: 'p9', text: 'How {name} is changing lately' },
  { id: 'p10', text: 'A moment we want to remember forever' },
];

export const PROMPTS_PER_LETTER = 3;

export function formatPrompt(
  prompt: Prompt,
  childName: string,
  pronoun: string = 'they'
): string {
  return prompt.text
    .replace(/{name}/g, childName)
    .replace(/{pronoun}/g, pronoun);
}
