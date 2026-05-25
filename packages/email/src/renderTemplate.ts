export function renderEmailTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    template
  );
}
