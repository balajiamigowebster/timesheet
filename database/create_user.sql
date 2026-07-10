-- SQL script to configure local MariaDB with cPanel production credentials
CREATE DATABASE IF NOT EXISTS `amigoweb_timesheet`;

-- Create the amigoweb_timesheet user locally with the same production password
CREATE USER IF NOT EXISTS 'amigoweb_timesheet'@'localhost' IDENTIFIED BY 'Aammigo@123';

-- Grant access permissions for this database to the local user
GRANT ALL PRIVILEGES ON `amigoweb_timesheet`.* TO 'amigoweb_timesheet'@'localhost';
FLUSH PRIVILEGES;
