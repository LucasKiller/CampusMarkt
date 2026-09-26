# CampusMarkt Launch Operations & Disaster Recovery Runbook

**Document Version:** 1.0.0  
**Scope:** CampusMarkt V1 Production Environment (Braunschweig)  
**Architecture Reference:** AD-006 (Modular Monolith on Single Budget VPS), AD-018 (Launch Hardening)

---

## 1. System Overview & Architecture Constraints

CampusMarkt runs as a self-hosted modular monolith on a single budget Virtual Private Server (VPS) located in Germany. All persistence, authentication, and storage reside on-host using containerized PostgreSQL and Supabase services orchestrated via Docker Compose and secured through Caddy ingress.

- **Primary URL:** `https://campusmarkt.tu-braunschweig.de`
- **Database:** PostgreSQL with `marketplace` schema and strict Row Level Security (RLS)
- **Object Storage:** Self-hosted S3-compatible Supabase Storage
- **Identity & Verification:** Pseudonymized email HMAC with pepper (AD-008)

---

## 2. Host & VPS Capacity Management

### 2.1 Resource Thresholds and Alerts
| Metric | Normal Range | Alert Threshold | Action Required |
| --- | --- | --- | --- |
| **CPU Utilization** | 10% - 40% | > 75% sustained for > 10m | Inspect running containers via `docker stats`, check for abusive crawler traffic. |
| **Memory (RAM)** | 2.0GB - 3.2GB | > 80% (of 4GB/8GB VPS) | Restart leaking worker containers, check Node.js heap consumption. |
| **Disk Storage** | < 50% | > 75% | Prune dangling Docker images, inspect image upload directory and logs. |
| **Swap Usage** | 0% - 10% | > 30% | Scale VPS RAM or adjust PostgreSQL shared buffers. |

### 2.2 Container Health & Daily Log Rotation
Docker daemon configuration (`/etc/docker/daemon.json`) enforces automated log rotation to prevent disk exhaustion:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
```

Health check verification:
```bash
docker compose ps
```

All core containers (`campusmarkt-web`, `campusmarkt-db`, `campusmarkt-auth`, `campusmarkt-storage`, `campusmarkt-caddy`) must report `healthy` or `running`.

---

## 3. Automated Backup Strategy

### 3.1 Daily Snapshot Routine
Backups run automatically once every 24 hours at **03:00 UTC** via system cron.

1. **Database Dump:** Complete transactional schema and data dump of the `marketplace` schema using `pg_dump` with `--clean --if-exists`.
2. **Storage Artifact:** Archived snapshot of public listing media stored in the upload directory.
3. **Manifest & Checksums:** Generation of SHA-256 integrity checksums saved to the backup manifest.
4. **Off-Host Transfer:** Encrypted sync (`rsync` / `rclone`) to an off-site secondary storage volume or S3 cold storage.

### 3.2 Backup Retention Policy
- **Daily Snapshots:** Retained for 14 days.
- **Weekly Snapshots:** Retained for 4 weeks.
- **Monthly Snapshots:** Retained for 3 months.
- Automatically pruned after retention expiration.

### 3.3 Automated Verification Script
To verify the integrity of any backup dump without restoring to production:
```bash
node --experimental-strip-types scripts/backup-verify.ts
```
The script validates:
- Presence of all required tables: `marketplace.listings`, `marketplace.profiles`, `marketplace.moderation_actions`.
- Non-empty row definitions and valid PostgreSQL DDL syntax.
- Exact SHA-256 hash match against the backup catalog.

---

## 4. Disaster Recovery & Restoration Procedures

### 4.1 Service Recovery Targets
- **Recovery Point Objective (RPO):** $\le 24$ hours (maximum potential data loss equals elapsed time since last daily backup).
- **Recovery Time Objective (RTO):** $\le 1$ hour (system fully restored and serving traffic from secondary snapshot).

### 4.2 Step-by-Step Restoration Protocol

In the event of hardware failure, VPS corruption, or catastrophic data loss:

1. **Provision New Host:**
   - Deploy clean Ubuntu LTS VPS with Docker and Docker Compose installed.
   - Clone repository and checkout production release tag:
     ```bash
     git clone https://github.com/LucasKiller/CampusMarkt.git /opt/campusmarkt
     ```

2. **Restore Environment Variables:**
   - Retrieve secure backup of `.env` configuration from password manager / secret store.
   - Verify secrets using validation script:
     ```bash
     npm run env:validate
     ```

3. **Fetch Latest Verified Backup Artifacts:**
   - Download the latest daily snapshot tarball from off-host storage.
   - Extract to `/opt/campusmarkt/backups/latest`.

4. **Verify Backup Dump Integrity:**
   ```bash
   node --experimental-strip-types scripts/backup-verify.ts
   ```
   Ensure output indicates `Backup verification succeeded!`.

5. **Execute Database & Storage Restore:**
   ```bash
   npm run restore -- --backup-dir=/opt/campusmarkt/backups/latest
   ```

6. **Validate Health & Ingress:**
   ```bash
   docker compose up -d
   docker compose ps
   npm run preflight
   ```

7. **Verify Frontend & SSL Ingress:**
   - Access `https://campusmarkt.tu-braunschweig.de/impressum`.
   - Confirm HTTP 200 response, valid SSL certificate, and correct security headers.

---

## 5. Moderator Lifecycle Management

Moderator privileges are controlled via database assignments in `marketplace.moderator_assignments` with role enforcement in RLS policies.

### 5.1 Onboarding a New Moderator
1. Ensure the user has registered and confirmed their CampusMarkt account.
2. Retrieve the user's `auth_id` from their profile:
   ```sql
   SELECT id, display_name FROM marketplace.profiles WHERE display_name = 'TargetUsername';
   ```
3. Grant moderator privileges:
   ```sql
   INSERT INTO marketplace.moderator_assignments (user_id, role, granted_by, created_at)
   VALUES ('<USER_AUTH_UUID>', 'moderator', '<SUPER_ADMIN_UUID>', NOW());
   ```
4. Verify active moderator status:
   ```sql
   SELECT * FROM marketplace.moderator_assignments WHERE user_id = '<USER_AUTH_UUID>';
   ```

### 5.2 Offboarding a Moderator
When a moderator steps down or leaves the university:
```sql
DELETE FROM marketplace.moderator_assignments
WHERE user_id = '<USER_AUTH_UUID>';
```
Revocation takes effect immediately on all subsequent API requests.

### 5.3 Audit Log Inspection
All actions taken by moderators are logged in `marketplace.moderation_actions`. Review logs regularly:
```sql
SELECT action_type, target_type, target_id, reason, created_at, moderator_id
FROM marketplace.moderation_actions
ORDER BY created_at DESC
LIMIT 50;
```

---

## 6. Security Incident Escalation & Triage

### 6.1 Severity Classification
- **P1 (Critical):** Database leak, secret exposure, total platform outage, RCE exploit.
- **P2 (High):** Widespread spam/scam campaign, localized data inconsistency, SSL renewal failure.
- **P3 (Normal):** Isolated moderation dispute, non-critical UI rendering glitch, translation typo.

### 6.2 Immediate Containment Actions (P1 Incidents)
1. **Rotate Compromised Secrets:**
   - Update `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` in `.env`.
   - Invalidate all active sessions:
     ```sql
     DELETE FROM auth.sessions;
     ```
2. **Lockout Suspicious Accounts:**
   ```sql
   UPDATE marketplace.profiles SET is_suspended = true WHERE id = '<SUSPICIOUS_UUID>';
   ```
3. **Escalation Notification:**
   - Notify CampusMarkt lead engineer: `admin@campusmarkt.tu-braunschweig.de`.
   - If user data was compromised, inform TU Braunschweig data protection contact within 72 hours per Art. 33 DSGVO.
