-- Timesheet Management System - Database Schema Setup
-- Database engine: MariaDB 12.3 / MySQL
-- Host: localhost | Port: 3306

CREATE DATABASE IF NOT EXISTS `amigoweb_timesheet`;
USE `amigoweb_timesheet`;

-- --------------------------------------------------------
-- 1. Table structure for table `students`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `department` VARCHAR(100) NOT NULL,
  `batch` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table structure for table `staff`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `staff` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `staff_id` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `department` VARCHAR(100) NOT NULL,
  `designation` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Table structure for table `timesheet_entries`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `timesheet_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_type` ENUM('student', 'staff') NOT NULL,
  `student_ref_id` INT NULL,
  `staff_ref_id` INT NULL,
  `date` DATE NOT NULL,
  `check_in` DATETIME NOT NULL,
  `check_out` DATETIME NULL,
  `purpose` VARCHAR(100) DEFAULT 'General',
  `notes` TEXT NULL,
  `latitude_in` DECIMAL(10, 8) NULL,
  `longitude_in` DECIMAL(11, 8) NULL,
  `latitude_out` DECIMAL(10, 8) NULL,
  `longitude_out` DECIMAL(11, 8) NULL,
  `photo_in` MEDIUMTEXT NULL,
  `photo_out` MEDIUMTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_ref_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`staff_ref_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Initial Seed Data
-- --------------------------------------------------------

-- Seed Students
INSERT INTO `students` (`student_id`, `name`, `email`, `department`, `batch`) VALUES
('STU001', 'Arjun Kumar', 'arjun.kumar@example.com', 'Computer Science', '2023-2027'),
('STU002', 'Priya Sharma', 'priya.sharma@example.com', 'Electrical Engineering', '2023-2027'),
('STU003', 'Rohan Das', 'rohan.das@example.com', 'Mechanical Engineering', '2024-2028')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Seed Staff
INSERT INTO `staff` (`staff_id`, `name`, `email`, `department`, `designation`) VALUES
('STF001', 'Dr. Ramesh Babu', 'ramesh.babu@example.com', 'Computer Science', 'Professor & HOD'),
('STF002', 'Dr. Kavita Rao', 'kavita.rao@example.com', 'Physics', 'Associate Professor')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);
