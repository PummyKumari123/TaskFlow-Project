# ⚡ TaskFlow — Project & Task Management App

A full-stack web app with role-based access control (Admin/Member), project management, task tracking with Kanban board, and a live dashboard.

---

## 🗂 Project Structure

```
taskflow/
├── backend/          ← Express.js REST API (Node.js + SQLite)
│   ├── models/db.js        ← Database setup & tables
│   ├── middleware/auth.js  ← JWT auth & role checks
│   ├── routes/
│   │   ├── auth.js         ← /api/auth/*
│   │   ├── projects.js     ← /api/projects/*
│   │   ├── tasks.js        ← /api/projects/:id/tasks/*
│   │   └── api.js          ← /api/dashboard, /api/users
│   └── server.js           ← Entry point
│
└── frontend/         ← React + Vite SPA
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── Projects.jsx
        │   ├── ProjectDetail.jsx  ← Kanban board
        │   └── Profile.jsx
        ├── context/AuthContext.jsx
        ├── api.js             ← Axios API calls
        └── App.jsx
```

---

## 🛠 Prerequisites (Install These First)

### 1. Install Node.js
- Go to: https://nodejs.org
- Download the **LTS version** (e.g. 20.x)
- Install it — this also installs `npm`
- Verify: open Terminal/CMD and run:
  ```
  node --version
  npm --version
  ```
  You should see version numbers like `v20.x.x` and `10.x.x`

---

## 🚀 Step-by-Step Setup

### Step 1 — Set up the Backend

Open a terminal in the `taskflow/backend` folder:

```bash
# Navigate to backend folder
cd taskflow/backend

# Install dependencies
npm install

# Start the server
npm run dev
```

✅ You should see:
```
🚀 TaskFlow API running on http://localhost:5000
```

The SQLite database (`taskflow.db`) is created automatically on first run. No separate database setup needed!

---

### Step 2 — Set up the Frontend

Open a **second terminal** in the `taskflow/frontend` folder:

```bash
# Navigate to frontend folder
cd taskflow/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

✅ You should see:
```
  VITE v5.x.x  ready in ...ms
  ➜  Local:   http://localhost:5173/
```

---

### Step 3 — Open the App

Visit: **http://localhost:5173**

That's it! 🎉

---

## 👤 Getting Started in the App

### Register Your First User
1. Click **"Create one"** on the login page
2. Fill in your name, email, password
3. Choose role:
   - **Admin** → Can see all projects, manage everything
   - **Member** → Can only see projects they're added to

### Suggested Test Setup
1. Register as **Admin** (e.g. admin@test.com)
2. Register a second account as **Member** (e.g. member@test.com)
3. Log in as Admin → Create a project
4. Add the member via their email
5. Create tasks and assign them

---

## 🔑 Role-Based Access Control

| Feature | Admin | Project Admin | Member |
|---------|-------|--------------|--------|
| View all projects | ✅ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ✅ |
| Delete any project | ✅ | Own only | ❌ |
| Add project members | ✅ | ✅ | ❌ |
| Create tasks | ✅ | ✅ | ✅ |
| Update any task | ✅ | ✅ | Own/Assigned only |
| Delete tasks | ✅ | ✅ | Own only |

---

## 📡 API Endpoints Reference

### Auth
```
POST /api/auth/register    → Create account
POST /api/auth/login       → Login, returns JWT token
GET  /api/auth/me          → Get current user
PUT  /api/auth/profile     → Update name
```

### Projects
```
GET    /api/projects              → List my projects
POST   /api/projects              → Create project
GET    /api/projects/:id          → Project + members
PUT    /api/projects/:id          → Update project
DELETE /api/projects/:id          → Delete project
POST   /api/projects/:id/members  → Add member by email
DELETE /api/projects/:id/members/:userId → Remove member
```

### Tasks
```
GET    /api/projects/:id/tasks           → List tasks (filterable)
POST   /api/projects/:id/tasks           → Create task
PUT    /api/projects/:id/tasks/:taskId   → Update task
DELETE /api/projects/:id/tasks/:taskId   → Delete task
GET    /api/projects/:id/tasks/:taskId/comments → Get comments
POST   /api/projects/:id/tasks/:taskId/comments → Add comment
```

### Dashboard
```
GET /api/dashboard    → Stats, overdue tasks, recent activity
GET /api/users        → All users (admin only)
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Axios |
| Styling | Custom CSS (no framework — pure variables) |
| Build Tool | Vite |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Fonts | Syne (headings) + DM Sans (body) |

---

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Kill whatever is on port 5000
npx kill-port 5000
# Or change PORT in server.js
```

**Module not found errors?**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

**Database errors?**
```bash
# Delete the DB file to start fresh
rm taskflow.db
# Then restart the backend
npm run dev
```

**Frontend can't reach API?**
- Make sure backend is running on port 5000
- Check vite.config.js proxy is set to `http://localhost:5000`

---

## 🔒 Environment Variables (Optional)

Create `backend/.env` to customize:
```
PORT=5000
JWT_SECRET=your_custom_secret_here
```

---

## 📦 Production Build

```bash
# Build frontend
cd frontend
npm run build

# Serve dist/ with any static file server
# The backend already serves the API — point nginx/Apache to dist/
```

---

Built with ❤️ using Node.js + React
