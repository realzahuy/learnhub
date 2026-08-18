
CREATE DATABASE IF NOT EXISTS elearning_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE elearning_db;

CREATE TABLE role (
    id SMALLINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar VARCHAR(500),
    bio TEXT,

    email_verified BOOLEAN DEFAULT FALSE,
    account_status ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    last_login DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_session (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    refresh_token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,

    INDEX idx_user_session_user_id (user_id),
    INDEX idx_user_session_expires_at (expires_at),

    CONSTRAINT fk_user_session_user
        FOREIGN KEY (user_id)
        REFERENCES user(id)
        ON DELETE CASCADE
);

CREATE TABLE user_role (
    user_id BIGINT NOT NULL,
    role_id SMALLINT NOT NULL,

    PRIMARY KEY (user_id, role_id),

    CONSTRAINT fk_user_role_user
        FOREIGN KEY (user_id)
        REFERENCES user(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_role_role
        FOREIGN KEY (role_id)
        REFERENCES role(id)
        ON DELETE CASCADE
);

CREATE TABLE category (
    id SMALLINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE course (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    short_description VARCHAR(500),
    description TEXT,
    thumbnail VARCHAR(500),

    price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK(price >= 0),

    status ENUM(
        'DRAFT',
        'PENDING',
        'PUBLISHED',
        'REJECTED'
    ) NOT NULL DEFAULT 'DRAFT',

    instructor_id BIGINT NOT NULL,
    category_id SMALLINT NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_course_instructor
        FOREIGN KEY (instructor_id)
        REFERENCES user(id),

    CONSTRAINT fk_course_category
        FOREIGN KEY (category_id)
        REFERENCES category(id)
);

CREATE TABLE course_reject (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    course_id BIGINT NOT NULL,
    comment TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_course_reject_course
        FOREIGN KEY (course_id)
        REFERENCES course(id)
        ON DELETE CASCADE
);

CREATE TABLE notification (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    recipient_id BIGINT NOT NULL,
    sender_id BIGINT NULL,
    course_id BIGINT NULL,

    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,

    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_recipient
        FOREIGN KEY (recipient_id)
        REFERENCES user(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_sender
        FOREIGN KEY (sender_id)
        REFERENCES user(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_notification_course
        FOREIGN KEY (course_id)
        REFERENCES course(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_notification_recipient_created
ON notification(recipient_id, created_at, id);

CREATE INDEX idx_notification_recipient_read
ON notification(recipient_id, read_at);

CREATE TABLE lesson (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(255) NOT NULL,
    position INT NOT NULL CHECK(position > 0),

    is_preview BOOLEAN NOT NULL DEFAULT FALSE,

    course_id BIGINT NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_lesson_course
        FOREIGN KEY (course_id)
        REFERENCES course(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_course_position
        UNIQUE (course_id, position)
);

CREATE TABLE video (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    lesson_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,

    storage_key VARCHAR(500) NULL,

    mediaconvert_job_id VARCHAR(255) NULL,

    status ENUM(
        'UPLOADING',
        'PROCESSING',
        'READY',
        'FAILED'
    ) NOT NULL DEFAULT 'UPLOADING',

    duration_seconds INT NULL,

    position INT NOT NULL DEFAULT 1 CHECK(position > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_video_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES lesson(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_video_position
        UNIQUE (lesson_id, position)
);

CREATE TABLE question (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    question VARCHAR(1000) NOT NULL,

    position INT NOT NULL DEFAULT 0,

    lesson_id BIGINT NOT NULL,

    CONSTRAINT fk_question_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES lesson(id)
        ON DELETE CASCADE
);

CREATE TABLE answer (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    answer VARCHAR(500) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,

    question_id BIGINT NOT NULL,

    CONSTRAINT fk_answer_question
        FOREIGN KEY (question_id)
        REFERENCES question(id)
        ON DELETE CASCADE
);

CREATE TABLE payment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    total_price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK(total_price >= 0),
    method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255) UNIQUE,

    status ENUM(
        'PENDING',
        'SUCCESS',
        'FAILED',
        'EXPIRED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    user_id BIGINT NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_user
        FOREIGN KEY(user_id)
        REFERENCES user(id)
);

CREATE TABLE payment_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    payment_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,

    price DECIMAL(10,2) NOT NULL CHECK(price >= 0),

    CONSTRAINT uk_payment_item_payment_course
        UNIQUE (payment_id, course_id),

    CONSTRAINT fk_payment_item_payment
        FOREIGN KEY(payment_id)
        REFERENCES payment(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_payment_item_course
        FOREIGN KEY(course_id)
        REFERENCES course(id)
);

CREATE TABLE enrollment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,

    enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_user_course
        UNIQUE(user_id, course_id),

    CONSTRAINT fk_enrollment_user
        FOREIGN KEY(user_id)
        REFERENCES user(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_enrollment_course
        FOREIGN KEY(course_id)
        REFERENCES course(id)
        ON DELETE CASCADE
);

CREATE TABLE lesson_progress (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT NOT NULL,
    lesson_id BIGINT NOT NULL,

    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    video_completed BOOLEAN NOT NULL DEFAULT FALSE,
    quiz_completed BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT uk_user_lesson
        UNIQUE(user_id, lesson_id),

    CONSTRAINT fk_progress_user
        FOREIGN KEY(user_id)
        REFERENCES user(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_progress_lesson
        FOREIGN KEY(lesson_id)
        REFERENCES lesson(id)
        ON DELETE CASCADE
);

CREATE TABLE user_action_code (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,

    used_at DATETIME NULL,

    attempts INT NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_action_code_latest (user_id, purpose, id),

    CONSTRAINT chk_user_action_code_purpose
        CHECK (purpose IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET')),

    CONSTRAINT fk_user_action_code_user
        FOREIGN KEY (user_id)
        REFERENCES user(id)
        ON DELETE CASCADE
);

CREATE TABLE quiz_attempt (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT NOT NULL,
    lesson_id BIGINT NOT NULL,

    correct_count INT NOT NULL,

    total_questions INT NOT NULL,

    score_percent INT NOT NULL,

    passed BOOLEAN NOT NULL DEFAULT FALSE,

    answer_snapshot JSON NULL,

    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_quiz_attempt_user
        FOREIGN KEY (user_id)
        REFERENCES user(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_quiz_attempt_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES lesson(id)
        ON DELETE CASCADE
);

CREATE TABLE course_review (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    course_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    rating INT NOT NULL CHECK(rating BETWEEN 1 AND 5),

    comment TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uk_review_user_course
        UNIQUE(user_id, course_id),

    CONSTRAINT fk_review_course
        FOREIGN KEY(course_id)
        REFERENCES course(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_user
        FOREIGN KEY(user_id)
        REFERENCES user(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_user_created
ON user(created_at, id);

CREATE INDEX idx_course_status_created
ON course(status, created_at, id);

CREATE INDEX idx_course_instructor_status_created
ON course(instructor_id, status, created_at);

CREATE INDEX idx_course_category
ON course(category_id);

CREATE INDEX idx_question_lesson
ON question(lesson_id);

CREATE INDEX idx_answer_question
ON answer(question_id);

CREATE INDEX idx_video_mediaconvert_job
ON video(mediaconvert_job_id);

CREATE INDEX idx_payment_user_status_created
ON payment(user_id, status, created_at);

CREATE INDEX idx_payment_status_created
ON payment(status, created_at);

CREATE INDEX idx_payment_item_course
ON payment_item(course_id);

CREATE INDEX idx_enrollment_course
ON enrollment(course_id);

CREATE INDEX idx_enrollment_user_enrolled
ON enrollment(user_id, enrolled_at, id);

CREATE INDEX idx_lesson_progress_lesson
ON lesson_progress(lesson_id);

CREATE INDEX idx_quiz_attempt_user_lesson_latest
ON quiz_attempt(user_id, lesson_id, submitted_at, id);

CREATE INDEX idx_review_course_created
ON course_review(course_id, created_at DESC);

INSERT INTO role(name)
VALUES
('ROLE_ADMIN'),
('ROLE_INSTRUCTOR'),
('ROLE_USER');

--admin:admin123
INSERT INTO user (username, password, email, full_name, email_verified)
VALUES ('admin', '$2y$10$CwAX.I8MMlOoQFymgG2NL.KjaT1a5sv1hywaXjDiqyLd69/Wm1yfG', 'zahuy911@gmail.com', 'Admin', 1);

INSERT INTO user_role (user_id, role_id)
VALUES (
    (SELECT id FROM user WHERE username = 'admin'),
    (SELECT id FROM role WHERE name = 'ROLE_ADMIN')
);
