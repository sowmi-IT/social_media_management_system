# SocialSphere — Social Media Management System

A full-stack rebuild of the "Social Media Management System" project: real
user accounts, real post storage, and a real database — replacing the
original localStorage-only prototype.

## Stack

- **Frontend:** Plain HTML/CSS/JS (no framework, no build step) — `client/`
- **Backend:** Node.js + Express — `server/`
- **Database:** SQLite (file-based, via `better-sqlite3`) — `server/db/socialsphere.db`
- **Auth:** JWT tokens + bcrypt-hashed passwords

## Folder structure

```
SocialSphere/
├── client/               # Frontend (served by the backend as static files)
│   ├── css/style.css
│   ├── js/api.js         # fetch wrapper + auth/token helpers
│   ├── js/guard.js        # sidebar + route guard for logged-in pages
│   ├── home.html, about.html, contact.html      (public)
│   ├── login.html, register.html,
│   │   forgot_password.html, reset_password.html (auth)
│   └── dashboard.html, create_post.html, schedule_post.html,
│       posts.html, view.html, profile.html,
│       settings.html, analytics.html            (require login)
└── server/
    ├── db/database.js    # SQLite schema + connection
    ├── middleware/auth.js
    ├── routes/auth.js    # register, login, forgot/reset password, profile
    ├── routes/posts.js   # CRUD for posts
    ├── routes/analytics.js
    ├── server.js         # Express app entry point
    ├── package.json
    └── .env.example
```

## Running it locally

1. **Install dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and change `JWT_SECRET` to your own random string before
   using this for anything beyond local testing.

3. **Start the server**
   ```bash
   npm start
   ```
   You should see:
   ```
   🚀 SocialSphere backend running on http://localhost:5000
   ```

4. **Open the app**
   Visit `http://localhost:5000` in your browser. The Express server serves
   both the API (`/api/...`) and the frontend files in `client/`, so there's
   nothing extra to run — one server, one port.

The SQLite database file is created automatically on first run at
`server/db/socialsphere.db`. Delete that file to reset all data.

## What's real vs. simplified

- **Real:** accounts, password hashing, JWT sessions, posts saved to SQLite,
  drafts/scheduled/published status, analytics computed from real rows.
- **Simplified (documented, not hidden):**
  - Password reset has no email service connected — the reset token is
    returned directly in the API response and shown on screen instead of
    being emailed.
  - Uploaded images are stored by file name only, not uploaded to the
    server or a file store — there's no image hosting in this build.
  - "Scheduled" posts are stored with a future timestamp but nothing
    actually publishes them to a real social platform when that time
    arrives — there's no external platform integration.
  - The Settings page's dark-mode toggle saves a preference to the account
    but the UI doesn't switch themes yet.

## API summary

| Method | Path                     | Auth | Description                     |
|--------|--------------------------|------|----------------------------------|
| POST   | /api/auth/register       | No   | Create an account               |
| POST   | /api/auth/login          | No   | Log in, returns a JWT           |
| POST   | /api/auth/forgot-password| No   | Generate a reset token          |
| POST   | /api/auth/reset-password | No   | Reset password with a token     |
| GET    | /api/auth/me             | Yes  | Current user                    |
| PUT    | /api/auth/me             | Yes  | Update profile / password       |
| PUT    | /api/auth/settings       | Yes  | Update theme / notifications    |
| GET    | /api/posts               | Yes  | List posts (optional `?status=`)|
| GET    | /api/posts/:id           | Yes  | Get one post                    |
| POST   | /api/posts               | Yes  | Create a post                   |
| PUT    | /api/posts/:id           | Yes  | Update a post                   |
| DELETE | /api/posts/:id           | Yes  | Delete a post                   |
| GET    | /api/analytics/summary   | Yes  | Totals + breakdown by platform  |

## Next steps you could add

- Real image upload (e.g. to disk or S3) instead of storing just the file name
- A background job that actually publishes scheduled posts via each
  platform's API at the scheduled time
- Real email delivery for password resets
- Multi-user teams / roles beyond the single `role` column already in the
  `users` table
