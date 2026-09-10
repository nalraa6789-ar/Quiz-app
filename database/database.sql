-- ============================================================
-- Quiz App Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS quiz_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quiz_app;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    profile_image VARCHAR(255) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_username (username)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- QUESTIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    question TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_answer ENUM('A', 'B', 'C', 'D') NOT NULL,
    explanation TEXT DEFAULT NULL,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_questions_category (category_id),
    INDEX idx_questions_difficulty (difficulty)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- QUIZ RESULTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard', 'mixed') NOT NULL DEFAULT 'mixed',
    total_questions INT NOT NULL,
    correct_answers INT NOT NULL DEFAULT 0,
    wrong_answers INT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    time_taken INT NOT NULL DEFAULT 0 COMMENT 'seconds',
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_results_user (user_id),
    INDEX idx_results_category (category_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- QUIZ ANSWERS (answer history)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_result_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_answer ENUM('A', 'B', 'C', 'D', 'NONE') NOT NULL DEFAULT 'NONE',
    correct_answer ENUM('A', 'B', 'C', 'D') NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_result_id) REFERENCES quiz_results(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_answers_result (quiz_result_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- SEED DATA: categories
-- ------------------------------------------------------------
INSERT IGNORE INTO categories (name, description) VALUES
('HTML', 'Questions about HTML markup and structure'),
('CSS', 'Questions about styling and layout'),
('JavaScript', 'Questions about JS fundamentals'),
('C Programming', 'Questions about the C language'),
('Database', 'Questions about SQL and databases'),
('General Knowledge', 'Miscellaneous general knowledge questions');

-- ------------------------------------------------------------
-- SEED DATA: sample questions (category_id references insert order 1-6 above)
-- ------------------------------------------------------------
INSERT INTO questions (category_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty) VALUES
(1, 'What does HTML stand for?', 'Hyper Trainer Marking Language', 'Hyper Text Markup Language', 'Hyper Text Marketing Language', 'Hyper Text Markup Leveler', 'B', 'HTML stands for Hyper Text Markup Language.', 'easy'),
(1, 'Which tag is used to create a hyperlink?', '<link>', '<a>', '<href>', '<url>', 'B', 'The <a> tag defines a hyperlink using the href attribute.', 'easy'),
(2, 'Which property changes text color in CSS?', 'font-color', 'text-color', 'color', 'foreground-color', 'C', 'The color property sets the text color.', 'easy'),
(2, 'Which CSS property controls spacing outside an element?', 'padding', 'margin', 'spacing', 'border', 'B', 'The margin property controls space outside an element border.', 'medium'),
(3, 'Which keyword declares a block-scoped variable in JS?', 'var', 'let', 'global', 'static', 'B', 'let declares a block-scoped variable, unlike var.', 'easy'),
(3, 'What does strict equality (===) check in JavaScript?', 'Value only', 'Type only', 'Value and type', 'Neither', 'C', 'Strict equality checks both value and type.', 'medium'),
(4, 'Which function is used to allocate memory dynamically in C?', 'alloc()', 'malloc()', 'new()', 'create()', 'B', 'malloc() dynamically allocates memory on the heap.', 'medium'),
(5, 'Which SQL statement is used to extract data from a database?', 'GET', 'EXTRACT', 'SELECT', 'OPEN', 'C', 'SELECT is used to query data from a database.', 'easy'),
(6, 'What is the capital of France?', 'Berlin', 'Madrid', 'Paris', 'Rome', 'C', 'Paris is the capital of France.', 'easy');

-- ------------------------------------------------------------
-- Note: create the first admin manually after registering, e.g.:
-- UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
-- ------------------------------------------------------------
USE quiz_app;

SELECT * FROM quiz_results;