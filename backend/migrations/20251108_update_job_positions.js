/**
 * Knex migration: update job positions to match frontend fallback changes.
 * - Rename 'Host' -> 'Cashier' if 'Cashier' does not already exist.
 * - If 'Cashier' exists, mark any 'Host' rows as inactive (is_active = 0).
 * - Mark 'Prep Cook' rows as inactive (is_active = 0) to preserve history.
 */

exports.up = async function(knex) {
  await knex.transaction(async (trx) => {
    // Count existing Cashier rows
    const [{ cnt }] = await trx('job_positions').where('name', 'Cashier').count('* as cnt');
    const cashierExists = Number(cnt) > 0;

    if (!cashierExists) {
      // Rename Host -> Cashier
      await trx('job_positions').where('name', 'Host').update({ name: 'Cashier' });
    } else {
      // If Cashier exists, mark Host rows inactive to avoid duplicates
      await trx('job_positions').where('name', 'Host').update({ is_active: 0 });
    }

    // Mark Prep Cook rows inactive (preserve history)
    await trx('job_positions').where('name', 'Prep Cook').update({ is_active: 0 });
  });
};

exports.down = async function(knex) {
  await knex.transaction(async (trx) => {
    // If we previously renamed Host->Cashier and there is no Host row, attempt to revert
    const [{ hostCnt }] = await trx('job_positions').where('name', 'Host').count('* as hostCnt');
    const [{ cashierCnt }] = await trx('job_positions').where('name', 'Cashier').count('* as cashierCnt');

    if (Number(hostCnt) === 0 && Number(cashierCnt) > 0) {
      // Only revert if there isn't already a Host row to avoid overwriting intentional Cashier rows
      await trx('job_positions').where('name', 'Cashier').update({ name: 'Host' });
    }

    // Re-activate any Prep Cook rows that were deactivated by this migration
    await trx('job_positions').where('name', 'Prep Cook').update({ is_active: 1 });
  });
};
