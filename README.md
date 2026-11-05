# EduVerse — A Universe of Learning Opportunities

EduVerse is a full-stack **Learning Management System (LMS)** built to satisfy the
functional and non-functional requirements in the accompanying Software
Requirements Specification (SRS) document. It supports three roles — **students**,
**instructors**, and **administrators** — with course enrollment, video lectures,
quizzes, assignment submission with grading, progress tracking, and downloadable
PDF certificates of completion.

## Tech stack

| Layer      | Choice                                                        |
|------------|-----------------------------------------------------------------|
| Runtime    | Node.js + Express                                               |
| Views      | EJS (server-rendered HTML)                                      |
| Database   | SQLite locally; MySQL 8+ for production                         |
| Auth       | `express-session` + `bcryptjs` password hashing                 |
| Uploads    | `multer` (assignment files and instructor MP4 lessons)           |
| Certificates | `pdfkit` (generates a real PDF certificate on the fly)         |
| Styling    | Hand-written CSS, no framework — see `public/css/style.css`     |

Local development needs no external services. Production mode uses a configured
MySQL database and stores application data and sessions there.

## Requirements coverage

This implementation maps directly onto the SRS sections:

- **FR-01 / FR-02** — Registration and secure login (bcrypt-hashed passwords,
  session cookies, role selection, IP-based throttling after repeated failed
  attempts, CSRF protection, and account settings).
- **FR-03** — Course enrollment (`Enroll now` on any published course).
- **FR-04** — Video lecture access (embedded video player per lesson).
- **FR-05** — Quiz management (instructor-authored multiple-choice quizzes,
  automatic scoring, instant results).
- **FR-06** — Assignment submission (file upload with timestamp, instructor
  download + grading, supported-file and signature checks, size limits, and
  deadline enforcement; HTML uploads are rejected).
- **FR-07** — Course creation (instructor course/lesson/quiz/assignment
  authoring, MP4 lesson uploads, publish/unpublish).
- **FR-08** — Progress tracking (per-course completion percentage on both the
  student dashboard and the course page). Lesson video completion unlocks its
  lesson quiz; passing at least 40% completes the lesson automatically, and
  lower scores can be retaken.
- **FR-09** — Certificate generation (auto-issued PDF once progress hits 100%).
- **Administrator module** — user management (suspend/delete), course
  approval/rejection, platform reports (CSV), runtime diagnostics, and daily
  database backups with seven-copy retention.
- **Maintainability/security** — Node's built-in test runner, role-based access
  control, IP-based failed-login throttling, CSRF tokens, hardened session
  cookies, and security response headers.

The application-level status and infrastructure-dependent requirements are
tracked separately in [SRS-GAP-REPORT.md](./SRS-GAP-REPORT.md).

Per-lesson quiz entries are created for every lesson. Each quiz becomes
available when it has at least 20 questions. Add topic-based sample banks to
all existing lesson quizzes with `npm run seed:sample-lesson-quizzes`; these
sample questions are not verified against the video transcript.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Seed the database with demo accounts and sample courses
npm run seed

# 3. Run automated tests
npm test

# 4. Start the server
npm start
```

Then open **http://localhost:3000**.

### Demo accounts (created by `npm run seed`)

| Role       | Email                     | Password    |
|------------|----------------------------|-------------|
| Admin      | admin@eduverse.dev         | Admin@123   |
| Instructor | instructor@eduverse.dev    | Teach@123   |
| Student    | student@eduverse.dev       | Learn@123   |

The seeded course catalog includes **CCNA v1.1 200-301 | Complete Course 2026**.
MP4 files in `~/Downloads/CCNA` are added as individual lessons, ordered by
filename and played in the course page's built-in video player. To use another
folder, set `CCNA_VIDEO_DIR` before running the seed command and server.
Instructors can upload MP4 lessons (up to 500 MB) or embed a YouTube video.
MP4 uploads are checked for their file signature. Assignment uploads are limited
to 15 MB, checked against their declared format, and do not accept HTML; malware
scanning is not configured.

You can also register a brand-new student or instructor account from the
**Get started** button on the homepage.

## Project structure

```
eduverse/
├── server.js                 # App entry point
├── db/
│   ├── database.js            # SQLite local / MySQL production provider selector
│   ├── database-mysql.js      # MySQL pool, schema bootstrap, and query adapter
│   ├── schema.mysql.sql       # MySQL schema
│   ├── migrate-sqlite-to-mysql.js # Explicit, non-destructive data migration
│   └── seed.js                # Demo data
├── middleware/
│   └── auth.js                # requireAuth / requireRole guards
├── routes/
│   ├── account.js              # Profile and password settings
│   ├── auth.js                 # register / login / logout
│   ├── public.js               # landing page + course catalog
│   ├── student.js              # enrollment, lessons, quizzes, assignments, certificates
│   ├── instructor.js           # course/lesson/quiz/assignment authoring, grading
│   └── admin.js                # user + course moderation, stats
├── utils/
│   ├── async-router.js         # Async route error forwarding for Express 4
│   ├── certificate.js          # PDF certificate generator (pdfkit)
│   ├── ccna-videos.js          # Local CCNA video inventory
│   ├── login-rate-limit.js     # In-process failed-login throttling
│   ├── mysql-session-store.js  # MySQL-backed production sessions
│   ├── upload-signatures.js    # Uploaded file-content validation
│   └── database-backup.js     # Scheduled SQLite backups
├── views/                      # EJS templates (partials, auth, courses, student, instructor, admin)
├── public/css/style.css        # design system (tokens, components, responsive layout)
├── uploads/                    # assignment submissions and instructor lesson videos
└── data/                       # eduverse.db + sessions.db (created on first run)
```

`npm test` runs the automated unit and HTTP integration tests.

## Key flows to try

1. **As a student** — log in, open "Foundations of Web Development" (already
   enrolled with one lesson complete), watch each remaining lesson and pass its
   quiz with at least 40%, submit the assignment, then download your certificate
   once progress reaches 100%.
2. **As an instructor** — log in, create a new course, add a lesson, a quiz
   with questions, and an assignment, then publish it. Check the "Submissions"
   table to grade a student's uploaded file.
3. **As an admin** — log in, approve a pending course, browse users, and try
   suspending/reactivating an account.

## Going to production

This project is a locally runnable reference implementation. The SRS's
production-scale and hosting targets require deployment infrastructure and
load/availability evidence; they are not guaranteed by this local app.

- Local development defaults to SQLite. Production defaults to MySQL; configure
  `DATABASE_URL` (`mysql://user:password@host:3306/database`) or
  `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and
  `MYSQL_DATABASE`. Keep credentials in the hosting environment, not source
  control. Production connections use TLS certificate verification; set
  `MYSQL_SSL_CA` when the provider requires a custom CA certificate.
- To copy the current SQLite records into an **empty** MySQL database, set
  `DB_DIALECT=mysql`, configure the MySQL connection, optionally set
  `EDUVERSE_SOURCE_DB_PATH`, then run `npm run migrate:sqlite-to-mysql`. The
  command refuses a non-empty destination, leaves SQLite unchanged, and does
  not migrate active sessions or uploaded/video files. Keep the corresponding
  media directories and configure `EDUVERSE_UPLOADS_DIR` and `CCNA_VIDEO_DIR`.
- MySQL schema setup runs on startup. The MySQL connection and data migration
  path are implemented, but a live database connection has not been validated
  in this workspace because no MySQL instance is configured.
- Set a unique `SESSION_SECRET` for every production deployment. Startup
  intentionally fails in production without it. Production cookies are secure;
  terminate TLS at a trusted HTTPS reverse proxy. The app trusts one proxy hop
  in production; adjust this setting if the deployment uses a different topology.
- In local SQLite mode, the app creates a backup at startup and every 24 hours,
  retaining the seven newest files in `data/backups/`. Configure managed,
  off-host MySQL backups and test restores before relying on them for disaster
  recovery.
- The MySQL pool and asynchronous application queries provide a production
  database path, but do not establish the SRS's 10,000-concurrent-user target.
  Capacity planning and representative load tests are still required.
- Upload checks validate declared type, size, and file signature, but do not scan
  for malware. Add quarantine/antivirus scanning before accepting untrusted
  public uploads.
- Configure external uptime monitoring, automated restore drills, and CI/CD
  for production. The application runtime diagnostics are not an uptime SLA.

## License

MIT — for academic/educational use.
