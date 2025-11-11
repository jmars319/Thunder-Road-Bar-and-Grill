/**
 * Knex migration: add `area` column to business_hours and create 'bar' rows.
 * - Adds `area` VARCHAR(32) NOT NULL DEFAULT 'kitchen'
 * - Backfills existing rows as 'kitchen'
 * - Inserts 'bar' rows for each day if none exist
 */

exports.up = async function(knex) {
  await knex.transaction(async (trx) => {
    // Add column if missing
    try {
      const exists = await trx.schema.hasColumn('business_hours', 'area');
      if (!exists) {
        await trx.schema.alterTable('business_hours', (t) => {
          t.string('area', 32).notNullable().defaultTo('kitchen');
        });
      }
    } catch (err) {
      // If alter fails, bubble up
      throw err;
    }

    // Ensure existing rows have area = 'kitchen'
    await trx('business_hours').whereNull('area').orWhere('area', '').update({ area: 'kitchen' });

    // Insert bar rows for days that do not already have a bar entry
    const kitchenRows = await trx('business_hours').select('day_of_week', 'opening_time', 'closing_time', 'is_closed').where('area', 'kitchen');

    for (const r of kitchenRows) {
      const existing = await trx('business_hours').where({ day_of_week: r.day_of_week, area: 'bar' }).first();
      if (!existing) {
        await trx('business_hours').insert({ day_of_week: r.day_of_week, opening_time: r.opening_time, closing_time: r.closing_time, is_closed: r.is_closed, area: 'bar' });
      }
    }
  });
};

exports.down = async function(knex) {
  await knex.transaction(async (trx) => {
    // Remove bar rows that were inserted by this migration (best-effort)
    try {
      await trx('business_hours').where('area', 'bar').del();
    } catch (err) {
      // swallow - nothing else to do
    }

    // Optionally drop the column if desired
    const exists = await trx.schema.hasColumn('business_hours', 'area');
    if (exists) {
      await trx.schema.alterTable('business_hours', (t) => {
        t.dropColumn('area');
      });
    }
  });
};
