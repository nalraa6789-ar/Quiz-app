# QuizApp — Full-Stack Quiz Web Application

A complete quiz platform built with **vanilla HTML/CSS/JS** on the frontend and
**Node.js + Express + MySQL** on the backend, with real authentication, a
question bank stored in the database, score tracking, a leaderboard, and an
admin dashboard.

---

## 1. Tech Stack

| Layer          | Technology                              |
|----------------|------------------------------------------|
| Frontend       | HTML5, CSS3, Vanilla JavaScript          |
| Backend        | Node.js, Express.js                      |
| Database       | MySQL                                    |
| Auth           | bcrypt password hashing + JWT tokens     |

---

## 2. Project Structure

```
quiz-app/
│
├── frontend/
│   ├── index.html, login.html, register.html
│   ├── dashboard.html, quiz.html, result.html, profile.html, leaderboard.html
│   ├── forgot-password.html
│   ├── admin/
│   │   ├── dashboard.html, questions.html, categories.html, users.html
│   ├── css/style.css
│   └── js/
│       ├── common.js      (API wrapper, auth storage, navbar, toasts, theme)
│       ├── auth.js        (register/login forms)
│       ├── dashboard.js
│       ├── quiz.js        (timer, progress bar, scoring flow)
│       ├── result.js
│       ├── profile.js
│       ├── leaderboard.js
│       └── admin.js       (question/category/user CRUD)
│
├── backend/
│   ├── server.js
│   ├── config/database.js
│   ├── middleware/auth.js, admin.js
│   ├── routes/            (auth, users, categories, questions, quiz, admin)
│   └── controllers/       (matching business logic)
│
├── database/
│   └── database.sql       (schema + seed categories/questions)
│
├── package.json
├── .env.example
└── README.md
```

---

## 3. Setup Instructions (Beginner-Friendly)

### Step 1 — Install Node.js
Download and install Node.js (LTS) from https://nodejs.org. Verify with:
```bash
node -v
npm -v
```

### Step 2 — Install MySQL
Install MySQL Community Server from https://dev.mysql.com/downloads/
(or use a package manager: `brew install mysql` on macOS, or MySQL
Workbench / XAMPP on Windows). Make sure the MySQL service is running.

### Step 3 — Create the database & import the schema
From a terminal, log into MySQL:
```bash
mysql -u root -p
```
Then either let the SQL file create the database for you:
```bash
mysql -u root -p < database/database.sql
```
This creates the `quiz_app` database, all tables, and seeds it with 6
categories and 9 sample questions so you have something to quiz on
immediately.

### Step 4 — Configure environment variables
Copy the example file and fill in your own values:
```bash
copy .env.example .env
```
Edit `.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=quiz_app
JWT_SECRET=some_long_random_string   # e.g. output of: openssl rand -hex 32
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_ORIGIN=http://localhost:5000
```
**Never commit your real `.env` file** — it's already in `.gitignore`.

### Step 5 — Install dependencies
From the project root:
```bash
npm install
```

### Step 6 — Start the server
```bash
npm start
```
You should see:
```
🚀 Quiz app server running at http://localhost:5000
✅ Connected to MySQL database: quiz_app
```
(For auto-restart on file changes during development: `npm run dev`.)

### Quick Start on Windows
You can double-click `start.bat`. The first run creates `.env` from `.env.example` and installs npm packages. You still need to enter your MySQL root password in `.env` and import `database/database.sql` once.

### Step 7 — Open the application
The Express server also serves the frontend as static files, so just open:
```
http://localhost:5000
```
in your browser. (No separate frontend server needed — though you're free
to serve `/frontend` from a different static server/port if you prefer;
just update `CLIENT_ORIGIN` in `.env` to match.)

### Step 8 — Create your first Admin account
1. Register a normal account through the UI (`/register.html`).
2. Promote it to admin directly in MySQL:
   ```sql
   USE quiz_app;
   UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
   ```
3. Log out and log back in (the JWT embeds the role, so you need a fresh
   token). You'll now see an "Admin" link in the navbar.

---

## 4. Database Relationships

```
users (1) ───< quiz_results (many)
quiz_results (1) ───< quiz_answers (many)
questions (1) ───< quiz_answers (many)
categories (1) ───< questions (many)
categories (1) ───< quiz_results (many)
```

- A **user** can have many **quiz_results** (one per completed attempt).
- Each **quiz_result** has many **quiz_answers** — one row per question in
  that attempt, recording what was selected vs. the correct answer.
- Each **category** groups many **questions**; deleting a category is
  blocked while it still has questions attached (see `categoryController.js`).
- Foreign keys use `ON DELETE CASCADE` so deleting a user or category cleans
  up their dependent rows automatically.

---

## 5. How Authentication Works

1. **Register** (`POST /api/auth/register`): validates input server-side,
   hashes the password with **bcrypt** (never stored in plain text), inserts
   the user, and returns a signed **JWT** containing `id`, `username`, `role`.
2. **Login** (`POST /api/auth/login`): looks up the user by email or
   username, compares the password with `bcrypt.compare`, and — if it
   matches — issues a new JWT.
3. The frontend stores the token in `localStorage` (if "Remember me" is
   checked) or `sessionStorage` otherwise, and sends it as
   `Authorization: Bearer <token>` on every API call (see `js/common.js`
   → `api()`).
4. The `authenticate` middleware (`backend/middleware/auth.js`) verifies the
   token on protected routes and attaches `req.user`.
5. The `requireAdmin` middleware checks `req.user.role === 'admin'` — and
   because the role comes from the **server-signed token**, not anything the
   client sends in the request body, a normal user cannot spoof admin access.
6. **Logout** simply discards the token client-side (stateless JWTs); the
   `/api/auth/logout` endpoint exists for a consistent API surface.

---

## 6. How the Quiz System Works

1. On the Dashboard, picking a category opens a modal to choose difficulty
   and question count, then navigates to `quiz.html` with those as query params.
2. `quiz.html` calls `POST /api/quiz/start`, which runs
   `ORDER BY RAND() LIMIT n` in MySQL to pick random, non-repeating questions
   for that category/difficulty. **Correct answers are stripped from the
   response** — the client never receives them, so scores can't be faked by
   reading the network tab.
3. The quiz shows one question at a time with 4 options, Next/Previous
   navigation, a question counter, a progress bar, and a 30-second-per-question
   countdown timer that auto-advances (or auto-submits on the last question).
4. On submit, `POST /api/quiz/submit` sends `{ questionId, selectedAnswer }`
   pairs. **Scoring happens entirely server-side**: the server looks up the
   real correct answers, computes correct/wrong counts and percentage, and
   saves a `quiz_results` row plus one `quiz_answers` row per question
   (wrapped in a SQL transaction so a partial failure can't corrupt the data).
5. The Result page shows the score, percentage, and a message
   (Excellent / Very Good / Good / Keep Practicing) with buttons to review
   answers, try again, or return to the dashboard.
6. The Review section shows every question, your answer, the correct answer,
   and its explanation, with correct/incorrect answers visually distinguished.

---

## 7. How to Add Questions (Admin)

1. Log in as an admin → click **Admin** in the navbar → **Questions**.
2. Click **+ Add Question**, fill in the category, question text, four
   options, the correct answer, difficulty, and an optional explanation.
3. Use the search box and category/difficulty filters to find existing
   questions to edit or delete.

This all goes through `POST/PUT/DELETE /api/questions`, which are protected
by both `authenticate` and `requireAdmin` middleware.

---

## 8. How to Add Categories (Admin)

1. Admin → **Categories** → **+ Add Category**. Provide a name and
   description.
2. Categories can be edited any time. **Deleting** a category is blocked
   while it still has questions attached — delete or reassign those
   questions first (this prevents orphaned questions and broken quiz
   history).

---

## 9. How to Create an Admin

See **Step 8** in the setup instructions above — register normally, then
run one `UPDATE` statement in MySQL to set `role = 'admin'` for that user,
and log back in to get a fresh token with the new role embedded.

Admins can also promote/demote other users directly from **Admin → Users**
(the role dropdown next to each user), without touching the database.

---

## 10. How to Modify the UI

- All shared styling lives in `frontend/css/style.css`, using CSS custom
  properties (`--primary`, `--bg`, `--surface`, etc.) for easy theming —
  change the variables in `:root` and `[data-theme="dark"]` to reskin the
  whole app.
- Each page has its own small JS file (`dashboard.js`, `quiz.js`, etc.) that
  only touches that page's DOM — safe to edit one without affecting others.
- `frontend/js/common.js` is shared everywhere: the `api()` fetch wrapper,
  `toast()` notifications, `renderNavbar()`, and the light/dark theme toggle
  live there.
- To add a new page, copy the structure of an existing one (navbar mount +
  a `<script src="js/common.js">` + your page's own script), and add a link
  to it in `renderNavbar()` if it should appear in the nav.

---

## 11. API Documentation

All endpoints are prefixed with `/api`. Protected routes require header
`Authorization: Bearer <token>`. Admin routes additionally require the
token's role to be `admin`.

### Auth
| Method | Endpoint             | Auth | Description |
|--------|-----------------------|------|-------------|
| POST   | `/auth/register`      | No   | `{ fullName, username, email, password, confirmPassword }` |
| POST   | `/auth/login`         | No   | `{ identifier, password }` (identifier = email or username) |
| POST   | `/auth/logout`        | No   | Stateless — client discards token |

### Users
| Method | Endpoint            | Auth | Description |
|--------|----------------------|------|-------------|
| GET    | `/users/profile`     | Yes  | Current user's profile + stats |
| PUT    | `/users/profile`     | Yes  | `{ fullName, username, profileImage, currentPassword?, newPassword? }` |

### Categories
| Method | Endpoint                | Auth        | Description |
|--------|--------------------------|-------------|-------------|
| GET    | `/categories`            | Yes         | List all categories with question counts |
| POST   | `/categories`            | Admin       | `{ name, description }` |
| PUT    | `/categories/:id`        | Admin       | Update name/description |
| DELETE | `/categories/:id`        | Admin       | Blocked if the category has questions |

### Questions (admin management)
| Method | Endpoint              | Auth  | Description |
|--------|------------------------|-------|-------------|
| GET    | `/questions`           | Admin | `?category=&difficulty=&search=&page=&limit=` |
| GET    | `/questions/:id`       | Admin | Single question detail |
| POST   | `/questions`           | Admin | Create a question |
| PUT    | `/questions/:id`       | Admin | Update a question |
| DELETE | `/questions/:id`       | Admin | Delete a question |

### Quiz (gameplay)
| Method | Endpoint                 | Auth | Description |
|--------|---------------------------|------|-------------|
| POST   | `/quiz/start`             | Yes  | `{ categoryId, difficulty, numQuestions }` → random questions, no answers included |
| POST   | `/quiz/submit`            | Yes  | `{ categoryId, difficulty, timeTaken, answers:[{questionId, selectedAnswer}] }` → server-graded result |
| GET    | `/quiz/results`           | Yes  | Current user's quiz history |
| GET    | `/quiz/results/:id`       | Yes  | Detailed review (owner or admin only) |
| GET    | `/quiz/leaderboard`       | Yes  | `?category=&difficulty=&period=week|month|all` |

### Admin
| Method | Endpoint              | Auth  | Description |
|--------|------------------------|-------|-------------|
| GET    | `/admin/dashboard`     | Admin | Totals + recent attempts |
| GET    | `/admin/users`         | Admin | `?search=` |
| GET    | `/admin/users/:id`     | Admin | Single user detail |
| PUT    | `/admin/users/:id`     | Admin | `{ role?, isActive? }` |
| DELETE | `/admin/users/:id`     | Admin | Delete a user (and their history) |

---

## 12. Security Notes

- Passwords are hashed with **bcrypt** (10 salt rounds) — never stored or
  logged in plain text.
- All SQL queries use **parameterized placeholders** (`?`) via `mysql2` —
  no string-concatenated SQL, so no SQL injection.
- JWT role claims are set only at login time from the database — **the
  server never trusts a role sent from the client**.
- Admin routes are protected by middleware on both the route and (for quiz
  content) the underlying query, not just hidden in the UI.
- `.env` holds all secrets and is git-ignored; `.env.example` documents the
  required variables without real values.
- CORS is restricted to `CLIENT_ORIGIN` from `.env` (defaults permissively
  only if unset — tighten this for production).

---

## 13. Future Expansion (architected for, not yet built)

Email verification · forgot/reset password · Google/Facebook login · quiz
certificates (PDF) · advanced analytics · CSV question import/export ·
image/audio/video questions · multiplayer/real-time leaderboard ·
notifications · subscriptions/payments.

The current structure (separate controllers/routes, a stateless JWT auth
layer, and a normalized schema) is intentionally set up so each of these
can be added incrementally without a rewrite.
