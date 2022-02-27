import pg from 'pg';

/**
 * 
 * @param {pg.Client} db The PostgreSQL database.
 * @param {Record<string, Record<string, any>[]>} json The JSON data from the old database.
 */
export default async function migrate(db, json) {
  console.info('Now migrating data to PostgreSQL ' + db.database);

  await transaction(db, async db => {
    console.info('Migrating warnings...');
    // WARNINGS
    for(const warning of json.warnings) {
      console.debug(' ... Warning ' + warning._id);
      await db.query(`
        INSERT INTO "Warnings" ("Id", "GuildId", "UserId", "Time", "IssuerUserId", "Reason", "Number", "Type")
        VALUES                 ($1,   $2,        $3,       $4,     $5,             $6,       $7,       $8    );
      `, [
        guidToSnowflake(warning._id),
        $numberLong(warning.GuildId),
        $numberLong(warning.To),
        $date(warning.Time),
        $numberLong(warning.From),
        warning.Reason || "/",
        $numberLong(warning.Number),
        warning.WarningType === 'Warning' ? 1 : 2,
      ]);
    }
  })
}

/**
 * Wraps the given function in a transaction
 * @param {pg.Client} db The PostgreSQL database.
 * @param {(db: pg.Client) => Promise<void>} fn The transaction function.
 */
async function transaction(db, fn) {
  console.debug('Beginning transaction...');
  await db.query('BEGIN TRANSACTION');
  try {
    await fn(db);
    console.debug('Committing transaction...');
    await db.query('COMMIT');
  } catch(e) {
    console.debug('Rollbacking transaction...', e);
    await db.query('ROLLBACK');
    throw e;
  }
}

/**
 * Gets a long from the data.
 * @param {{$numberLong: string}} of The long string
 * @returns {number} The long.
 */
function $numberLong(of) {
  return parseInt(of.$numberLong);
}

/**
 * Gets a data from the data.
 * @param {{$date: string}} of The date string
 * @returns {Date} The date.
 */
function $date(of) {
  return new Date(of.$date);
}

/**
 * Converts a GUID to a snowflake.
 * @param {string} guid The GUID
 * @returns {number} The pseudo snowflake.
 */
function guidToSnowflake(guid) {
  return guid.split('-').map(s => parseInt(s, 16)).reduce((a, n) => a + n, 0);
}
