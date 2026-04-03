"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderContract = renderContract;
exports.extractDropdownFields = extractDropdownFields;
exports.renderContractWithDropdowns = renderContractWithDropdowns;
exports.validateDropdownValues = validateDropdownValues;
function renderContract(template, values) {
    return template.replace(/{(\w+)}/g, (match, key) => {
        var _a;
        return (_a = values[key]) !== null && _a !== void 0 ? _a : "";
    });
}
function extractDropdownFields(template) {
    const dropdownMatches = template.match(/{dropdown:(\w+)}/g);
    if (!dropdownMatches)
        return [];
    return dropdownMatches
        .map((match) => {
        var _a;
        const fieldName = (_a = match.match(/{dropdown:(\w+)}/)) === null || _a === void 0 ? void 0 : _a[1];
        return fieldName || "";
    })
        .filter(Boolean);
}
function renderContractWithDropdowns(template, values, dropdownValues) {
    // First replace dropdown tags with their selected values
    let processedTemplate = template.replace(/{dropdown:(\w+)}/g, (match, fieldName) => {
        var _a;
        return (_a = dropdownValues[fieldName]) !== null && _a !== void 0 ? _a : "";
    });
    // Then replace regular tags with special handling for signature images
    return processedTemplate.replace(/{(\w+)}/g, (match, key) => {
        var _a;
        return (_a = values[key]) !== null && _a !== void 0 ? _a : "";
    });
}
function validateDropdownValues(dropdownFields, dropdownValues) {
    const errors = [];
    for (const [fieldName, fieldConfig] of Object.entries(dropdownFields)) {
        const selectedValue = dropdownValues[fieldName];
        // Check if required field is provided
        if (fieldConfig.required && !selectedValue) {
            errors.push(`${fieldName} is required`);
            continue;
        }
        // Check if provided value is valid option
        if (selectedValue &&
            !fieldConfig.options.some((option) => option.value === selectedValue)) {
            errors.push(`Invalid value for ${fieldName}: ${selectedValue}`);
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
