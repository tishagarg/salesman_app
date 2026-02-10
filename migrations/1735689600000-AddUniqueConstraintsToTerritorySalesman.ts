import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintsToTerritorySalesman1735689600000
  implements MigrationInterface
{
  name = "AddUniqueConstraintsToTerritorySalesman1735689600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if constraints already exist
    const table = await queryRunner.getTable("territory_salesman");
    if (!table) {
      throw new Error("Table territory_salesman does not exist");
    }

    // Check for existing unique constraints
    const territoryIdUniqueExists = table.indices.some(
      (index) =>
        index.isUnique &&
        index.columnNames.length === 1 &&
        index.columnNames[0] === "territory_id"
    );

    const salesmanIdUniqueExists = table.indices.some(
      (index) =>
        index.isUnique &&
        index.columnNames.length === 1 &&
        index.columnNames[0] === "salesman_id"
    );

    // Add unique constraint on territory_id (one territory = one salesman)
    if (!territoryIdUniqueExists) {
      await queryRunner.query(`
        ALTER TABLE territory_salesman 
        ADD CONSTRAINT UQ_territory_salesman_territory_id 
        UNIQUE (territory_id)
      `);
    }

    // Add unique constraint on salesman_id (one salesman = one territory)
    if (!salesmanIdUniqueExists) {
      await queryRunner.query(`
        ALTER TABLE territory_salesman 
        ADD CONSTRAINT UQ_territory_salesman_salesman_id 
        UNIQUE (salesman_id)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop unique constraints
    await queryRunner.query(`
      ALTER TABLE territory_salesman 
      DROP CONSTRAINT IF EXISTS UQ_territory_salesman_territory_id
    `);

    await queryRunner.query(`
      ALTER TABLE territory_salesman 
      DROP CONSTRAINT IF EXISTS UQ_territory_salesman_salesman_id
    `);
  }
}
