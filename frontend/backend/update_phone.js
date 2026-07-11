const db = require('./db');

(async () => {
  try {
    const [students] = await db.query('SELECT id, name, phone FROM students');
    console.log('Students List:');
    students.forEach(s => console.log(` - [ID ${s.id}] ${s.name}: "${s.phone}"`));
    
    const [staff] = await db.query('SELECT id, name, phone FROM staff');
    console.log('Staff List:');
    staff.forEach(s => console.log(` - [ID ${s.id}] ${s.name}: "${s.phone}"`));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
