import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDropdownFieldsToContractTemplates1693489200000 implements MigrationInterface {
    name = 'AddDropdownFieldsToContractTemplates1693489200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column already exists
        const table = await queryRunner.getTable("contract_templates");
        const columnExists = table?.columns.find(column => column.name === "dropdown_fields");

        if (!columnExists) {
            await queryRunner.addColumn("contract_templates", new TableColumn({
                name: "dropdown_fields",
                type: "jsonb",
                isNullable: true,
                comment: "JSON object containing dropdown field configurations for the contract template"
            }));

            // Create GIN index for better JSON query performance
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "idx_contract_templates_dropdown_fields" 
                ON "contract_templates" USING GIN ("dropdown_fields")
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the index first
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_contract_templates_dropdown_fields"`);
        
        // Drop the column
        const table = await queryRunner.getTable("contract_templates");
        const columnExists = table?.columns.find(column => column.name === "dropdown_fields");

        if (columnExists) {
            await queryRunner.dropColumn("contract_templates", "dropdown_fields");
        }
    }
}