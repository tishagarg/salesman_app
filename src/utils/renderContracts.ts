export function renderContract(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return values[key] ?? "";
  });
}
