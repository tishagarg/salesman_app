export function renderContract(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    // Handle signature-related tags specially to ensure HTML is preserved
    if (key.toLowerCase().includes('signature') || key.toLowerCase().includes('image')) {
      const value = values[key];
      // If the value contains HTML img tag, preserve it as-is
      if (value && value.includes('<img')) {
        return value;
      }
      // If the value is a URL, convert to img tag
      if (value && (value.startsWith('http') || value.startsWith('data:image'))) {
        return `<img src="${value}" class="signature-image" alt="Signature" style="max-width: 200px; height: auto; border: 1px solid #ddd; padding: 5px; display: block; margin: 10px 0;" />`;
      }
    }
    return values[key] ?? "";
  });
}

export function extractDropdownFields(template: string): string[] {
  const dropdownMatches = template.match(/{dropdown:(\w+)}/g);
  if (!dropdownMatches) return [];
  
  return dropdownMatches.map(match => {
    const fieldName = match.match(/{dropdown:(\w+)}/)?.[1];
    return fieldName || '';
  }).filter(Boolean);
}

export function renderContractWithDropdowns(
  template: string,
  values: Record<string, string>,
  dropdownValues: Record<string, string>
): string {
  // First replace dropdown tags with their selected values
  let processedTemplate = template.replace(/{dropdown:(\w+)}/g, (match, fieldName) => {
    return dropdownValues[fieldName] ?? '';
  });
  
  // Then replace regular tags with special handling for signature images
  return processedTemplate.replace(/{(\w+)}/g, (match, key) => {
    // Handle signature-related tags specially to ensure HTML is preserved
    if (key.toLowerCase().includes('signature') || key.toLowerCase().includes('image')) {
      const value = values[key];
      // If the value contains HTML img tag, preserve it as-is
      if (value && value.includes('<img')) {
        return value;
      }
      // If the value is a URL, convert to img tag
      if (value && (value.startsWith('http') || value.startsWith('data:image'))) {
        return `<img src="${value}" class="signature-image" alt="Signature" style="max-width: 200px; height: auto; border: 1px solid #ddd; padding: 5px; display: block; margin: 10px 0;" />`;
      }
    }
    return values[key] ?? "";
  });
}

export function validateDropdownValues(
  dropdownFields: Record<string, {
    options: Array<{ label: string; value: string }>;
    required?: boolean;
  }>,
  dropdownValues: Record<string, string>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [fieldName, fieldConfig] of Object.entries(dropdownFields)) {
    const selectedValue = dropdownValues[fieldName];
    
    // Check if required field is provided
    if (fieldConfig.required && !selectedValue) {
      errors.push(`${fieldName} is required`);
      continue;
    }
    
    // Check if provided value is valid option
    if (selectedValue && !fieldConfig.options.some(option => option.value === selectedValue)) {
      errors.push(`Invalid value for ${fieldName}: ${selectedValue}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
