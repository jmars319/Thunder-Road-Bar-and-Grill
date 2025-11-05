const bcrypt = require('bcrypt');

exports.up = async function(knex) {
  // Hash the default admin password
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Update the admin user with hashed password
  const exists = await knex('users').where({ username: 'admin' }).first();
  
  if (exists) {
    await knex('users')
      .where({ username: 'admin' })
      .update({ 
        password_hash: hashedPassword,
        email: 'admin@thunderroad.com',
        full_name: 'Admin User',
        role: 'admin'
      });
  } else {
    await knex('users').insert({
      username: 'admin',
      password_hash: hashedPassword,
      email: 'admin@thunderroad.com',
      full_name: 'Admin User',
      role: 'admin'
    });
  }
};

exports.down = async function(knex) {
  // Revert to plaintext (dev only - don't use in production)
  await knex('users')
    .where({ username: 'admin' })
    .update({ password_hash: 'admin123' });
};
