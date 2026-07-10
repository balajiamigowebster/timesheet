-- Migration Script: Rename email to phone in students and staff tables
USE amigoweb_timesheet;

ALTER TABLE students CHANGE email phone VARCHAR(50) NOT NULL UNIQUE;
ALTER TABLE staff CHANGE email phone VARCHAR(50) NOT NULL UNIQUE;
