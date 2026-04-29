const SNIPPETS: string[] = [
  `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.`,
  `Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi.`,
  `Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue.`,
];

let rotateIndex = 0;

export function nextFakeAiSummary(): string {
  const text = SNIPPETS[rotateIndex % SNIPPETS.length];
  rotateIndex += 1;
  return text;
}
