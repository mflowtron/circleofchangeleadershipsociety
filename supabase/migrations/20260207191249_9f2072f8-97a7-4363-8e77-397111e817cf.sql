-- Rename chapter tables to use lms_ prefix for consistency with other LMS-exclusive tables
ALTER TABLE chapters RENAME TO lms_chapters;
ALTER TABLE advisor_chapters RENAME TO lms_advisor_chapters;