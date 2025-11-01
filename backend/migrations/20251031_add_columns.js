exports.up = async function(knex) {
  // Ensure columns exist before altering to avoid errors on repeated runs
  const hasAvailability = await knex.schema.hasColumn('job_applications', 'availability');
  if (!hasAvailability) {
    await knex.schema.alterTable('job_applications', (t) => {
      t.string('availability', 255).nullable();
    });
  }

  const hasHero = await knex.schema.hasColumn('site_settings', 'hero_images');
  if (!hasHero) {
    await knex.schema.alterTable('site_settings', (t) => {
      t.text('hero_images').nullable();
    });
  }

  const hasMenuDesc = await knex.schema.hasColumn('site_settings', 'menu_description');
  if (!hasMenuDesc) {
    await knex.schema.alterTable('site_settings', (t) => {
      t.text('menu_description').nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasAvailability = await knex.schema.hasColumn('job_applications', 'availability');
  if (hasAvailability) {
    await knex.schema.alterTable('job_applications', (t) => {
      t.dropColumn('availability');
    });
  }

  const hasHero = await knex.schema.hasColumn('site_settings', 'hero_images');
  if (hasHero) {
    await knex.schema.alterTable('site_settings', (t) => {
      t.dropColumn('hero_images');
    });
  }

  const hasMenuDesc = await knex.schema.hasColumn('site_settings', 'menu_description');
  if (hasMenuDesc) {
    await knex.schema.alterTable('site_settings', (t) => {
      t.dropColumn('menu_description');
    });
  }
};
