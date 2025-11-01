const mysql = require('mysql2');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'thunder_road',
});

function run() {
  const selectSql = "SELECT id,file_url,file_name,file_type,file_size,title,category,uploaded_at FROM media_library WHERE title LIKE 'E2E%' OR file_name LIKE '%real_png%' OR title LIKE '%real_png%'";
  pool.query(selectSql, (err, rows) => {
    if (err) {
      console.error('Select error:', err.message || err);
      pool.end();
      process.exit(1);
    }
    console.log('ROWS MATCHING CLEANUP CRITERIA:');
    console.table(rows.map(r => ({ id: r.id, file_name: r.file_name, title: r.title, category: r.category, uploaded_at: r.uploaded_at })));

    if (rows.length === 0) {
      console.log('No rows to delete.');
      pool.end();
      process.exit(0);
    }

    const delSql = "DELETE FROM media_library WHERE title LIKE 'E2E%' OR file_name LIKE '%real_png%' OR title LIKE '%real_png%'";
    pool.query(delSql, (dErr, result) => {
      if (dErr) {
        console.error('Delete error:', dErr.message || dErr);
        pool.end();
        process.exit(1);
      }
      console.log('Deleted rows count:', result.affectedRows);
      // Show the most recent 10 rows after deletion
      pool.query('SELECT id,file_url,file_name,title,category,uploaded_at FROM media_library ORDER BY uploaded_at DESC LIMIT 10', (sErr, afterRows) => {
        if (sErr) console.error('Select after error:', sErr.message || sErr);
        else {
          console.log('RECENT MEDIA AFTER CLEANUP:');
          console.table(afterRows.map(r => ({ id: r.id, file_name: r.file_name, title: r.title, category: r.category, uploaded_at: r.uploaded_at })));
        }
        pool.end();
      });
    });
  });
}

run();
