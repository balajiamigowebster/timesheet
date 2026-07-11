const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { sendWhatsAppMessage } = require('./whatsapp');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Middleware to strip cPanel subfolder prefix from req.url
app.use((req, res, next) => {
  if (req.url.startsWith('/attendancetimesheet')) {
    req.url = req.url.substring('/attendancetimesheet'.length);
    if (!req.url.startsWith('/')) {
      req.url = '/' + req.url;
    }
  }
  next();
});

// Helper to format WhatsApp dates and times
function formatWhatsAppMessageParts(dateObj) {
  const d = dateObj ? new Date(dateObj) : new Date();

  // Time formatting: 6.00pm
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const minStr = minutes < 10 ? '0' + minutes : minutes;
  const timeStr = `${hours}.${minStr}${ampm}`;

  // Date formatting: D/M/YYYY
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  return { timeStr, dateStr };
}

// Helper functions for validating fields
const isValidPhone = (phone) => {
  return /^\+?[0-9\s\-()]{7,20}$/.test(phone);
};

// ==========================================
// 1. STUDENTS ENDPOINTS
// ==========================================

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM students ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve students' });
  }
});

// Add a student
app.post('/api/students', async (req, res) => {
  const { student_id, name, phone, department, batch } = req.body;

  // Validation
  if (!student_id || !name || !phone || !department || !batch) {
    return res.status(400).json({ error: 'All fields (student_id, name, phone, department, batch) are required' });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    // Check if student_id or phone already exists
    const [existing] = await db.query(
      'SELECT student_id, phone FROM students WHERE student_id = ? OR phone = ?',
      [student_id, phone]
    );

    if (existing.length > 0) {
      if (existing.some(s => s.student_id === student_id)) {
        return res.status(400).json({ error: 'Student ID already exists' });
      }
      if (existing.some(s => s.phone === phone)) {
        return res.status(400).json({ error: 'Phone number already exists' });
      }
    }

    const [result] = await db.query(
      'INSERT INTO students (student_id, name, phone, department, batch) VALUES (?, ?, ?, ?, ?)',
      [student_id, name, phone, department, batch]
    );

    res.status(201).json({
      message: 'Student registered successfully',
      student: { id: result.insertId, student_id, name, phone, department, batch }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register student' });
  }
});

// Update a student
app.put('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  const { student_id, name, phone, department, batch } = req.body;

  if (!student_id || !name || !phone || !department || !batch) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    // Check uniqueness excluding current record
    const [existing] = await db.query(
      'SELECT id, student_id, phone FROM students WHERE (student_id = ? OR phone = ?) AND id != ?',
      [student_id, phone, id]
    );

    if (existing.length > 0) {
      if (existing.some(s => s.student_id === student_id)) {
        return res.status(400).json({ error: 'Student ID already exists' });
      }
      if (existing.some(s => s.phone === phone)) {
        return res.status(400).json({ error: 'Phone number already exists' });
      }
    }

    const [result] = await db.query(
      'UPDATE students SET student_id = ?, name = ?, phone = ?, department = ?, batch = ? WHERE id = ?',
      [student_id, name, phone, department, batch, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student details updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// Delete a student
app.delete('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM students WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student record deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Bulk delete students
app.post('/api/students/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty IDs array' });
  }
  try {
    await db.query('DELETE FROM students WHERE id IN (?)', [ids]);
    res.json({ message: `Successfully deleted ${ids.length} student(s)` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to bulk delete students' });
  }
});

// ==========================================
// 2. STAFF ENDPOINTS
// ==========================================

// Get all staff
app.get('/api/staff', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM staff ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve staff' });
  }
});

// Add a staff member
app.post('/api/staff', async (req, res) => {
  const { staff_id, name, phone, department, designation } = req.body;

  if (!staff_id || !name || !phone || !department || !designation) {
    return res.status(400).json({ error: 'All fields (staff_id, name, phone, department, designation) are required' });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    // Check if staff_id or phone already exists
    const [existing] = await db.query(
      'SELECT staff_id, phone FROM staff WHERE staff_id = ? OR phone = ?',
      [staff_id, phone]
    );

    if (existing.length > 0) {
      if (existing.some(s => s.staff_id === staff_id)) {
        return res.status(400).json({ error: 'Staff ID already exists' });
      }
      if (existing.some(s => s.phone === phone)) {
        return res.status(400).json({ error: 'Phone number already exists' });
      }
    }

    const [result] = await db.query(
      'INSERT INTO staff (staff_id, name, phone, department, designation) VALUES (?, ?, ?, ?, ?)',
      [staff_id, name, phone, department, designation]
    );

    res.status(201).json({
      message: 'Staff registered successfully',
      staff: { id: result.insertId, staff_id, name, phone, department, designation }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register staff' });
  }
});

// Update a staff member
app.put('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  const { staff_id, name, phone, department, designation } = req.body;

  if (!staff_id || !name || !phone || !department || !designation) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    const [existing] = await db.query(
      'SELECT id, staff_id, phone FROM staff WHERE (staff_id = ? OR phone = ?) AND id != ?',
      [staff_id, phone, id]
    );

    if (existing.length > 0) {
      if (existing.some(s => s.staff_id === staff_id)) {
        return res.status(400).json({ error: 'Staff ID already exists' });
      }
      if (existing.some(s => s.phone === phone)) {
        return res.status(400).json({ error: 'Phone number already exists' });
      }
    }

    const [result] = await db.query(
      'UPDATE staff SET staff_id = ?, name = ?, phone = ?, department = ?, designation = ? WHERE id = ?',
      [staff_id, name, phone, department, designation, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json({ message: 'Staff details updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

// Delete a staff member
app.delete('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM staff WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json({ message: 'Staff record deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});

// Bulk delete staff members
app.post('/api/staff/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty IDs array' });
  }
  try {
    await db.query('DELETE FROM staff WHERE id IN (?)', [ids]);
    res.json({ message: `Successfully deleted ${ids.length} staff member(s)` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to bulk delete staff members' });
  }
});

// ==========================================
// 3. TIMESHEET / ENTRY LOGS ENDPOINTS
// ==========================================

// Get all logs with filters
app.get('/api/timesheet/logs', async (req, res) => {
  const { user_type, checked_in, start_date, end_date, search } = req.query;

  let query = `
    SELECT 
      t.*,
      CASE 
        WHEN t.user_type = 'student' THEN s.name
        WHEN t.user_type = 'staff' THEN st.name
      END as name,
      CASE 
        WHEN t.user_type = 'student' THEN s.student_id
        WHEN t.user_type = 'staff' THEN st.staff_id
      END as id_code,
      CASE 
        WHEN t.user_type = 'student' THEN s.department
        WHEN t.user_type = 'staff' THEN st.department
      END as department,
      CASE 
        WHEN t.user_type = 'student' THEN s.phone
        WHEN t.user_type = 'staff' THEN st.phone
      END as phone
    FROM timesheet_entries t
    LEFT JOIN students s ON t.student_ref_id = s.id AND t.user_type = 'student'
    LEFT JOIN staff st ON t.staff_ref_id = st.id AND t.user_type = 'staff'
    WHERE 1=1
  `;
  const params = [];

  if (user_type) {
    query += ' AND t.user_type = ?';
    params.push(user_type);
  }

  if (checked_in === 'true') {
    query += ' AND t.check_out IS NULL';
  } else if (checked_in === 'false') {
    query += ' AND t.check_out IS NOT NULL';
  }

  if (start_date) {
    query += ' AND t.date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND t.date <= ?';
    params.push(end_date);
  }

  if (search) {
    query += ` AND (
      s.name LIKE ? OR s.student_id LIKE ? 
      OR st.name LIKE ? OR st.staff_id LIKE ?
    )`;
    const searchWildcard = `%${search}%`;
    params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
  }

  query += ' ORDER BY t.check_in DESC, t.id DESC';

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve timesheet logs' });
  }
});

// Check-in user
app.post('/api/timesheet/check-in', async (req, res) => {
  const { user_type, user_id, purpose, notes, latitude, longitude, photo } = req.body;

  if (!user_type || !user_id) {
    return res.status(400).json({ error: 'user_type (student/staff) and user_id (primary key ID) are required' });
  }

  try {
    // 1. Verify user exists
    let userTable = user_type === 'student' ? 'students' : 'staff';
    const [userCheck] = await db.query(`SELECT id, name, phone FROM ${userTable} WHERE id = ?`, [user_id]);
    if (userCheck.length === 0) {
      return res.status(404).json({ error: `${user_type.charAt(0).toUpperCase() + user_type.slice(1)} user not found` });
    }

    // 2. Check if user is already checked in (no checkout record)
    const refColumn = user_type === 'student' ? 'student_ref_id' : 'staff_ref_id';
    const [activeCheck] = await db.query(
      `SELECT id FROM timesheet_entries WHERE user_type = ? AND ${refColumn} = ? AND check_out IS NULL`,
      [user_type, user_id]
    );

    if (activeCheck.length > 0) {
      return res.status(400).json({ error: 'User is already checked in. Check out first before checking in again.' });
    }

    // 3. Perform check-in
    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
    // Format to local date-time string in MySQL format
    const localDateTime = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    const studentRefVal = user_type === 'student' ? user_id : null;
    const staffRefVal = user_type === 'staff' ? user_id : null;

    const [result] = await db.query(
      `INSERT INTO timesheet_entries 
        (user_type, student_ref_id, staff_ref_id, date, check_in, purpose, notes, latitude_in, longitude_in, photo_in) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_type,
        studentRefVal,
        staffRefVal,
        currentDate,
        localDateTime,
        purpose || 'General',
        notes || '',
        latitude || null,
        longitude || null,
        photo || null
      ]
    );

    res.status(201).json({
      message: 'Check-in successful',
      entryId: result.insertId,
      check_in: localDateTime
    });

    // Send WhatsApp notification asynchronously
    const user = userCheck[0];
    if (user && user.phone) {
      const parts = formatWhatsAppMessageParts(now);
      const msg = `*From Madhusphonics*\n\nHello ${user.name}, you have successfully checked in at ${parts.timeStr} on ${parts.dateStr}  Madhu's Phonics & Handwriting....Thank you\n\nFor more info: www.madhusphonics.in.`;
      sendWhatsAppMessage(user.phone, msg).catch(err => console.error('Error sending WhatsApp check-in:', err));
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record check-in' });
  }
});

// Check-out user
app.post('/api/timesheet/check-out', async (req, res) => {
  const { entry_id, user_type, user_id, notes, latitude, longitude, photo } = req.body;

  try {
    let activeLogId = entry_id;

    // If entry_id is not provided, look it up via user_type + user_id
    if (!activeLogId) {
      if (!user_type || !user_id) {
        return res.status(400).json({ error: 'Provide either entry_id OR both user_type and user_id' });
      }

      const refColumn = user_type === 'student' ? 'student_ref_id' : 'staff_ref_id';
      const [activeCheck] = await db.query(
        `SELECT id FROM timesheet_entries WHERE user_type = ? AND ${refColumn} = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`,
        [user_type, user_id]
      );

      if (activeCheck.length === 0) {
        return res.status(404).json({ error: 'No active check-in record found for this user.' });
      }
      activeLogId = activeCheck[0].id;
    }

    // Perform check-out
    const now = new Date();
    const localDateTime = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    let updateQuery = 'UPDATE timesheet_entries SET check_out = ?, latitude_out = ?, longitude_out = ?, photo_out = ?';
    const params = [
      localDateTime,
      latitude || null,
      longitude || null,
      photo || null
    ];

    if (notes !== undefined) {
      updateQuery += ', notes = ?';
      params.push(notes);
    }
    updateQuery += ' WHERE id = ? AND check_out IS NULL';
    params.push(activeLogId);

    const [result] = await db.query(updateQuery, params);

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'Record is already checked out or does not exist.' });
    }

    res.json({
      message: 'Check-out successful',
      check_out: localDateTime
    });

    // Send WhatsApp notification asynchronously
    try {
      const [entryCheck] = await db.query(
        `SELECT t.check_out, 
                COALESCE(s.name, st.name) AS name, 
                COALESCE(s.phone, st.phone) AS phone
         FROM timesheet_entries t
         LEFT JOIN students s ON t.student_ref_id = s.id
         LEFT JOIN staff st ON t.staff_ref_id = st.id
         WHERE t.id = ?`,
        [activeLogId]
      );

      if (entryCheck.length > 0 && entryCheck[0].phone) {
        const entry = entryCheck[0];
        const parts = formatWhatsAppMessageParts(new Date(entry.check_out));
        const msg = `*From Madhusphonics*\n\nHello ${entry.name}, you have successfully checked out at ${parts.timeStr} on ${parts.dateStr} - Madhu's Phonics & Handwriting....Thank you\n\nFor more info: www.madhusphonics.in.`;
        sendWhatsAppMessage(entry.phone, msg).catch(err => console.error('Error sending WhatsApp check-out:', err));
      }
    } catch (notificationError) {
      console.error('Failed to trigger checkout notification:', notificationError);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record check-out' });
  }
});

// Create manual timesheet entry
app.post('/api/timesheet/manual-entry', async (req, res) => {
  const { user_type, user_id, date, check_in, check_out, purpose, notes } = req.body;

  if (!user_type || !user_id || !date || !check_in || !check_out) {
    return res.status(400).json({ error: 'Fields (user_type, user_id, date, check_in, check_out) are required' });
  }

  try {
    let userTable = user_type === 'student' ? 'students' : 'staff';
    const [userCheck] = await db.query(`SELECT id FROM ${userTable} WHERE id = ?`, [user_id]);
    if (userCheck.length === 0) {
      return res.status(404).json({ error: `${user_type.charAt(0).toUpperCase() + user_type.slice(1)} user not found` });
    }

    const studentRefVal = user_type === 'student' ? user_id : null;
    const staffRefVal = user_type === 'staff' ? user_id : null;

    // Build complete datetime strings (assuming input format "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM")
    const formattedCheckIn = check_in.replace('T', ' ');
    const formattedCheckOut = check_out.replace('T', ' ');

    await db.query(
      `INSERT INTO timesheet_entries 
        (user_type, student_ref_id, staff_ref_id, date, check_in, check_out, purpose, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_type, studentRefVal, staffRefVal, date, formattedCheckIn, formattedCheckOut, purpose || 'General', notes || '']
    );

    res.status(201).json({ message: 'Manual timesheet entry created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create manual entry' });
  }
});

// Delete timesheet entry log
app.delete('/api/timesheet/logs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM timesheet_entries WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    res.json({ message: 'Timesheet log entry deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete log entry' });
  }
});

// Bulk delete timesheet entry logs
app.post('/api/timesheet/logs/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty IDs array' });
  }
  try {
    await db.query('DELETE FROM timesheet_entries WHERE id IN (?)', [ids]);
    res.json({ message: `Successfully deleted ${ids.length} log entry/entries` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to bulk delete log entries' });
  }
});

// ==========================================
// 4. ANALYTICS & STATS ENDPOINT
// ==========================================

app.get('/api/timesheet/stats', async (req, res) => {
  try {
    // 1. Total Student count
    const [[{ total_students }]] = await db.query('SELECT COUNT(*) as total_students FROM students');

    // 2. Total Staff count
    const [[{ total_staff }]] = await db.query('SELECT COUNT(*) as total_staff FROM staff');

    // 3. Active Checked-in students count
    const [[{ active_students }]] = await db.query(
      "SELECT COUNT(*) as active_students FROM timesheet_entries WHERE user_type = 'student' AND check_out IS NULL"
    );

    // 4. Active Checked-in staff count
    const [[{ active_staff }]] = await db.query(
      "SELECT COUNT(*) as active_staff FROM timesheet_entries WHERE user_type = 'staff' AND check_out IS NULL"
    );

    // 5. Weekly counts (last 7 days of entries)
    // We construct a query to get checks count for each of the last 7 days.
    const [weeklyData] = await db.query(`
      SELECT 
        DATE(check_in) as log_date,
        SUM(CASE WHEN user_type = 'student' THEN 1 ELSE 0 END) as students_count,
        SUM(CASE WHEN user_type = 'staff' THEN 1 ELSE 0 END) as staff_count
      FROM timesheet_entries
      WHERE check_in >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(check_in)
      ORDER BY log_date ASC
    `);

    // 6. Recent activities (last 5 logs check-in/out)
    const [recentLogs] = await db.query(`
      SELECT 
        t.id, t.user_type, t.check_in, t.check_out, t.purpose,
        CASE 
          WHEN t.user_type = 'student' THEN s.name
          WHEN t.user_type = 'staff' THEN st.name
        END as name,
        CASE 
          WHEN t.user_type = 'student' THEN s.student_id
          WHEN t.user_type = 'staff' THEN st.staff_id
        END as id_code
      FROM timesheet_entries t
      LEFT JOIN students s ON t.student_ref_id = s.id AND t.user_type = 'student'
      LEFT JOIN staff st ON t.staff_ref_id = st.id AND t.user_type = 'staff'
      ORDER BY COALESCE(t.check_out, t.check_in) DESC, t.id DESC
      LIMIT 6
    `);

    res.json({
      counts: {
        totalStudents: total_students,
        totalStaff: total_staff,
        activeStudents: active_students,
        activeStaff: active_staff
      },
      weeklyData,
      recentLogs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve dashboard statistics' });
  }
});

// Admin Authentication Route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === adminUser && password === adminPass) {
    res.json({ success: true, token: 'madhusphonics-secret-token-key' });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve React's index.html for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Database migration to update WhatsApp phone numbers (from +91 9445332233 to +91 93424 66095)
app.get('/api/migrate-phone', async (req, res) => {
  try {
    const [result1] = await db.query(
      `UPDATE students SET phone = '+91 93424 66095' WHERE phone LIKE '%9445332233%'`
    );
    const [result2] = await db.query(
      `UPDATE staff SET phone = '+91 93424 66095' WHERE phone LIKE '%9445332233%'`
    );
    res.json({
      success: true,
      message: `Successfully migrated database records. Updated ${result1.affectedRows} student(s) and ${result2.affectedRows} staff member(s).`
    });
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ error: 'Migration failed', details: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
