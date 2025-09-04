# Database Migrations

This directory contains database migrations for the Field Sales application.

## Current Migrations

### 001-add-dropdown-fields-to-contract-templates.sql
- **Purpose**: Adds dropdown field support to contract templates
- **Changes**:
  - Adds `dropdown_fields` JSONB column to `contract_templates` table
  - Creates GIN index for better JSON query performance
- **Safe**: Includes checks to prevent duplicate column creation

## Running Migrations

### Option 1: Using the Migration Runner Script
```bash
npm run build  # Compile TypeScript first
node run-migration.js
```

### Option 2: Manual SQL Execution
Connect to your PostgreSQL database and execute:
```sql
\i migrations/001-add-dropdown-fields-to-contract-templates.sql
```

### Option 3: Using Database Client
Copy the contents of the SQL file and execute it in your preferred database client (pgAdmin, DBeaver, etc.)

## Migration Status

To check if the migration has been applied:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'contract_templates' 
AND column_name = 'dropdown_fields';
```

If the query returns a row, the migration has been successfully applied.

## Rollback

To rollback the migration (remove the dropdown_fields column):
```sql
DROP INDEX IF EXISTS idx_contract_templates_dropdown_fields;
ALTER TABLE contract_templates DROP COLUMN IF EXISTS dropdown_fields;
```

## JSON Structure

The `dropdown_fields` column stores JSON with the following structure:
```json
{
  "field_name": {
    "label": "Human-readable label",
    "options": [
      {"label": "Option Label", "value": "option_value"}
    ],
    "required": true,
    "placeholder": "Optional placeholder text"
  }
}
```