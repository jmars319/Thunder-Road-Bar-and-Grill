/**
 * Knex migration: create job_positions and application_fields tables
 * Generated: 2025-11-01
 */

exports.up = function (knex) {
  return Promise.all([
    knex.schema.hasTable('job_positions').then((exists) => {
      if (exists) return null;
      return knex.schema.createTable('job_positions', (t) => {
        t.increments('id').primary();
        t.string('name', 150).notNullable();
        t.text('description');
        t.integer('display_order').defaultTo(0);
        t.boolean('is_active').defaultTo(true);
        t.timestamp('created_at').defaultTo(knex.fn.now());
      });
    }),

    knex.schema.hasTable('application_fields').then((exists) => {
      if (exists) return null;
      return knex.schema.createTable('application_fields', (t) => {
        t.increments('id').primary();
        t.string('field_name', 150).notNullable();
        t.string('field_type', 50).defaultTo('text');
        t.boolean('required').defaultTo(false);
        t.text('options');
        t.integer('display_order').defaultTo(0);
        t.timestamp('created_at').defaultTo(knex.fn.now());
      });
    })
  ]);
};

exports.down = function (knex) {
  return Promise.all([
    knex.schema.hasTable('application_fields').then((exists) => {
      if (!exists) return null;
      return knex.schema.dropTable('application_fields');
    }),
    knex.schema.hasTable('job_positions').then((exists) => {
      if (!exists) return null;
      return knex.schema.dropTable('job_positions');
    })
  ]);
};
