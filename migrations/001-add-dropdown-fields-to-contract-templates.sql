-- Migration: Add dropdown_fields column to contract_templates table
-- Date: 2024-08-31
-- Description: Add JSON column to store dropdown field configurations for contract templates

-- Check if the column already exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'contract_templates' 
        AND column_name = 'dropdown_fields'
    ) THEN
        -- Add the dropdown_fields column
        ALTER TABLE contract_templates 
        ADD COLUMN dropdown_fields JSONB NULL;
        
        -- Add a comment to document the column purpose
        COMMENT ON COLUMN contract_templates.dropdown_fields IS 'JSON object containing dropdown field configurations for the contract template';
        
        RAISE NOTICE 'Added dropdown_fields column to contract_templates table';
    ELSE
        RAISE NOTICE 'dropdown_fields column already exists in contract_templates table';
    END IF;
END $$;

-- Create an index on the dropdown_fields column for better query performance
CREATE INDEX IF NOT EXISTS idx_contract_templates_dropdown_fields 
ON contract_templates USING GIN (dropdown_fields);

-- Example of what the dropdown_fields JSON structure looks like:
/*
dropdown_fields example:
{
  "service_type": {
    "label": "Service Type",
    "options": [
      {"label": "Basic Service", "value": "basic"},
      {"label": "Premium Service", "value": "premium"}
    ],
    "required": true,
    "placeholder": "Select service type"
  },
  "contract_duration": {
    "label": "Contract Duration",
    "options": [
      {"label": "1 Year", "value": "1year"},
      {"label": "2 Years", "value": "2years"}
    ],
    "required": false
  }
}
*/