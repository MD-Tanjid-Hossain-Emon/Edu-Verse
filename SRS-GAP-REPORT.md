# EduVerse SRS Gap Report

Source: `Edu-Verse_24524203120.docx` (the supplied Software Requirements Specification).

## Functional requirements

| Requirement | Status after this update | Notes |
|---|---|---|
| FR-01 Registration | Implemented | Registration validates name/email and unique email; passwords require 10-128 characters and are bcrypt-hashed. |
| FR-02 Login | Implemented | Authentication, in-process IP-based throttling after 10 failed attempts per 15-minute window, role guards, session ID rotation, CSRF protection, secure production cookies, and account settings are present. A shared limiter store is needed if the app runs across multiple instances. |
| FR-03 Course enrollment | Implemented | Students can enroll in published courses and get access to course lessons. |
| FR-04 Video lecture access | Implemented | Students stream local MP4 lessons in the native player with range requests; instructors can upload MP4 lessons or use supported YouTube embeds. |
| FR-05 Quiz management | Implemented | Instructors author multiple-choice quizzes; students receive automatically scored attempts visible in course and learning dashboards. |
| FR-06 Assignment submission | Implemented | Upload timestamp, grading, supported file/size and content-signature checks, and due-date enforcement are implemented. HTML uploads are excluded; antivirus scanning/quarantine remains an operational security gap. |
| FR-07 Course creation | Implemented | Instructors can author courses, lessons, quizzes, and assignments; course publishing and admin moderation are supported. |
| FR-08 Progress tracking | Implemented | Progress is calculated from lessons passed. Finishing a lesson video unlocks its quiz; a score of at least 40% completes the lesson automatically, and lower scores can be retaken. There is no manual completion shortcut. |
| FR-09 Certificates | Implemented | Completion automatically marks a certificate as issued; students can download the PDF. |
| Student profile management | Implemented | Name/email updates and password changes with current-password verification are available under Account. |
| Instructor performance analytics | Implemented | Course completion rate, average quiz score, quiz attempts, and submission review are shown. |
| Administrator management/reporting | Implemented | User/course moderation, platform counts, runtime diagnostics, and an admin-only CSV report are available. |
| Learning-resource upload | Implemented for video | Instructor MP4 uploads are supported; arbitrary document/resource library management is not included. |
| Per-lesson video quizzes | Workflow implemented; sample questions added | Each lesson receives 20 topic-based sample questions, matching the user's current sample-bank request. Questions are not transcript-verified; expanding or validating the bank requires course-specific source material and is not an SRS requirement. |

## Non-functional requirements and remaining work

| Requirement | Status / remaining work |
|---|---|
| Page load under 3 seconds | Not measured. Run representative browser/load benchmarks on the intended production host, including large video streams. |
| 10,000 concurrent users | Not met or verified. Production MySQL support and asynchronous route queries are implemented, but no configured MySQL server, horizontal capacity architecture, or representative load test is available to establish this target. |
| Password security and access control | Application controls implemented (bcrypt hashes, role guards, login session rotation, CSRF checks, security headers, and IP-based failed-login throttling). Independent security testing remains advisable before public deployment. |
| HTTPS | Not configured by this local server. Production cookies require HTTPS; configure TLS at a trusted reverse proxy/load balancer and verify HTTPS end-to-end. |
| 99% uptime | Not measured or guaranteed. Add external uptime monitoring, redundant hosting, alerting, and an incident/recovery plan. |
| Automated backups | Implemented locally in SQLite mode: startup + 24-hour backup, retaining seven copies. Configure managed/off-host MySQL backups and perform restore drills for production. |
| Responsive UI | Responsive breakpoints are present. Verify target Chrome, Edge, Firefox, Safari, Android, and iOS devices with browser/device testing. |
| Accessibility | Keyboard focus styles exist; a WCAG/accessibility audit and assistive-technology testing remain outstanding. |
| Scalability/cloud capability | No cloud deployment configuration or scaling/load test is included. |
| Maintainability | Modular route/view structure, automated tests, and a GitHub Actions CI workflow are present. A deployment/runbook remains advisable before production use. |
| Production database | MySQL was selected. MySQL schema/bootstrap, pooled asynchronous queries, persistent MySQL sessions, and a guarded SQLite-to-MySQL data import command are implemented. Live connection/import verification remains outstanding because no MySQL instance is configured in this workspace. |
| Upload safety | Extension/MIME/size and file-signature checks are implemented; HTML uploads are rejected. Malware scanning/quarantine remains outstanding and requires an operational scanner. |

## Verification completed

- `npm test`: 14 tests passed, 0 failed, including sample question structure, per-lesson quiz gating, retakes, the 40% pass boundary, automatic completion, certificate issuance, login throttling, and upload-signature rejection/acceptance.
- `node --check`: all 21 JavaScript files under `routes`, `db`, and `utils`, plus `server.js`, passed syntax validation.
- `npm run seed`: succeeded against an isolated temporary SQLite database.
- `npm audit` and `npm audit --omit=dev`: 0 vulnerabilities in the current lockfile.
- The MySQL driver was installed and dependency audit remained clean; production SQL execution could not be integration-tested without a configured MySQL service.
- The final dependency CVE assessment returned no known findings for the remediated packages.
- The health endpoint and security headers are covered by the passing automated test suite.
- Integration coverage includes health/security headers, CSRF rejection, student video range streaming, profile update, admin report authorization/CSV output, instructor analytics and MP4 signature validation, assignment upload signature validation, deadline rejection, quiz scoring, and automatic certificate generation.
- Backup tests verify data integrity and seven-copy retention.

## Important deployment boundary

Application-level gaps addressed include login throttling, upload signature checks, removal of unsafe HTML uploads, a repeatable CI workflow, and the requested MySQL production path. MySQL is not live-verified yet. Configure a database endpoint and managed backup policy; migrate the current SQLite data with the guarded import command; ensure the referenced video/upload files are available; and verify HTTPS, 10,000-user capacity, sub-3-second performance, 99% availability, cross-device compatibility, accessibility, cloud deployment, off-host backups, and malware scanning in the target environment.
