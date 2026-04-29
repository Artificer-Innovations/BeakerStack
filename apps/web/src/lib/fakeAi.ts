/** Canned “AI summary” paragraphs for dashboard demo (no API keys). */

const SNIPPETS: string[] = [
  `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam.`,

  `Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat.`,

  `Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue.`,

  `Praesent egestas tristique nibh. Sed a libero. Praesent ac massa at ligula laoreet iaculis. Fusce commodo diam libero, non interdum nunc luctus in. Integer tincidunt a nunc sed luctus.`,

  `Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Fusce id purus. Ut varius tincidunt libero. Phasellus dolor. Maecenas vestibulum mollis diam.`,

  `Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet.`,

  `Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus.`,

  `Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu.`,

  `In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi.`,
];

let rotateIndex = 0;

export function nextFakeAiSummary(): string {
  const text = SNIPPETS[rotateIndex % SNIPPETS.length];
  rotateIndex += 1;
  return text;
}
