export function renderContract(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/{(\w+)}/g, (_, key) => values[key] ?? "");
}
