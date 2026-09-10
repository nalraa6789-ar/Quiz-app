# QuizApp — របៀបដំណើរការ (VS Code + MySQL Workbench)

Project នេះបានភ្ជាប់រួចជា **HTML/CSS/JavaScript → Node.js/Express → MySQL**។

## 1. បង្កើត Database

បើក MySQL Workbench → ចូល connection `MySQL@127.0.0.1:3306` → បើក file:

`database/database.sql`

ចុច **Execute (⚡)** ដើម្បីបង្កើត `quiz_app`, tables និង sample questions។

## 2. បង្កើត `.env`

នៅក្នុង folder `quiz-app`:

- Copy `.env.example`
- Rename ទៅ `.env`
- បើក `.env` ហើយប្តូរ៖

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=PASSWORD_MYSQL_របស់អ្នក
DB_NAME=quiz_app
JWT_SECRET=quiz-app-secret-change-this
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_ORIGIN=http://localhost:5000
```

`DB_PASSWORD` គឺ password ដែលអ្នកបានដាក់ពេលដំឡើង MySQL Server។

## 3. Install packages

នៅក្នុង VS Code Terminal ដែលស្ថិតនៅ folder `quiz-app`៖

```bash
npm install
```

## 4. Run

```bash
npm start
```

បើជោគជ័យ ត្រូវឃើញ៖

```text
✅ Connected to MySQL database: quiz_app
🚀 Quiz app server running at http://localhost:5000
```

## 5. បើក Web App

កុំបើក HTML ដោយផ្ទាល់ និងកុំប្រើ Live Server សម្រាប់ app ពេញលេញនេះ។

បើក browser៖

`http://localhost:5000`

Flow នឹងជា៖

```text
Register/Login
      ↓
   Dashboard
      ↓
  Select Quiz
      ↓
 Node.js API
      ↓
 MySQL Database
      ↓
 Score + History + Leaderboard
```

## 6. បង្កើត Admin

Register account មួយសិន។ បន្ទាប់មកក្នុង MySQL Workbench៖

```sql
USE quiz_app;
UPDATE users SET role = 'admin' WHERE email = 'YOUR_EMAIL';
```

បន្ទាប់មក **Logout → Login ម្តងទៀត** ដើម្បីឱ្យ Admin role ចូលទៅក្នុង JWT ថ្មី។

## 7. បញ្ហាដែលជួបញឹកញាប់

### `Access denied for user 'root'`
Password ក្នុង `.env` មិនត្រឹមត្រូវ។ ប្តូរ `DB_PASSWORD` ឱ្យត្រូវ។

### `ECONNREFUSED 127.0.0.1:3306`
MySQL Server មិនទាន់ Running។ ចូល Windows Services ហើយ Start MySQL80 ឬបើក MySQL Workbench ដើម្បីពិនិត្យ connection។

### Browser បើកបាន ប៉ុន្តែ Login/Quiz មិនដំណើរការ
ពិនិត្យ Terminal ឱ្យឃើញ `Connected to MySQL database: quiz_app` ហើយត្រូវបើក app តាម `http://localhost:5000`។
