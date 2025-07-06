export function renderContract(
  template: string,
  values: Record<string, string>
): string {
  // Replace placeholders like {key} with values, including {signature_image_url}
  return template.replace(/{(\w+)}/g, (match, key) => {
    if (key === "signature_image_url" && values[key]) {
      return `<img src="${values[key]}" alt="Signature" style="width: 150px; height: auto;" />`;
    } else if (key === "signature_image_url" && !values[key]) {
      return '<span>No signature provided</span>';
    }
    return values[key] ?? "";
  });
}
