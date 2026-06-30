CREATE DATABASE IF NOT EXISTS amigoweb_timesheet;
USE amigoweb_timesheet;

-- Drop tables if they exist to start fresh
DROP TABLE IF EXISTS timesheet_entries;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS staff;

-- Students table
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  batch VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff table
CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timesheet/Attendance entries table
CREATE TABLE timesheet_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_type ENUM('student', 'staff') NOT NULL,
  student_ref_id INT NULL,
  staff_ref_id INT NULL,
  date DATE NOT NULL,
  check_in DATETIME NOT NULL,
  check_out DATETIME NULL,
  purpose VARCHAR(255) NULL,
  notes TEXT NULL,
  FOREIGN KEY (student_ref_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_ref_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Insert dummy data for demonstration
INSERT INTO students (student_id, name, email, department, batch) VALUES
('STU001', 'Arjun Kumar', 'arjun@example.com', 'Computer Science', '2023-2027'),
('STU002', 'Priya Sharma', 'priya@example.com', 'Electrical Engineering', '2024-2028'),
('STU003', 'Rohan Das', 'rohan@example.com', 'Mechanical Engineering', '2023-2027');

INSERT INTO staff (staff_id, name, email, department, designation) VALUES
('STF001', 'Dr. Ramesh Babu', 'ramesh@example.com', 'Computer Science', 'Professor'),
('STF002', 'Sarah Jenkins', 'sarah@example.com', 'Electrical Engineering', 'Lab Assistant');
