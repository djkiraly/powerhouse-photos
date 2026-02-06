-- Script to create an admin user
-- Run this in your AUTH database after signing up

-- Replace 'your-email@example.com' with the email you used to sign up
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Verify the update
SELECT id, email, name, role FROM users WHERE email = 'your-email@example.com';
