# Cron API Documentation

This module provides protected HTTP `GET` endpoints to manually trigger cron routines for Hall of Fame (HOF) generation and monthly maintenance.

> **Note**: Automatic scheduled triggers via NestJS `@Cron` decorators are **disabled**. All tasks are triggered on-demand via the endpoints below.

---

## Environment Variables

Ensure the following variables are configured in your `.env` file:

```env
CRON_USER_KEY=cron_admin
CRON_PASSWORD_KEY=cron_secret_key_static_2026
```

---

## Authentication

All `/cron` endpoints are secured using **HTTP Basic Authentication**.

- **Header Format**: `Authorization: Basic <credentials_base64>`
- **Credentials String**: `CRON_USER_KEY:CRON_PASSWORD_KEY`
- **Example Base64**:
  - `cron_admin:cron_secret_key_static_2026` -> Base64: `Y3Jvbl9hZG1pbjpjcm9uX3NlY3JldF9rZXlfc3RhdGljXzIwMjY=`
  - Header: `Authorization: Basic Y3Jvbl9hZG1pbjpjcm9uX3NlY3JldF9rZXlfc3RhdGljXzIwMjY=`

---

## Endpoints

### 1. Daily Hall of Fame (HOF) Generation
Triggers top winner evaluations for **Paling Eksis**, **Pendatang Terbaik**, and **Tampil Kembali**.

- **Method**: `GET`
- **URL**: `/cron/daily-hof`
- **Auth**: Basic Auth

#### Example Response (`200 OK`)
```json
{
  "message": "Daily Hall of Fame generation triggered successfully",
  "data": {
    "executedAt": "2026-09-30T15:30:00.000Z",
    "status": "SUCCESS",
    "details": {
      "mostExistSuccess": true,
      "newcomerSuccess": true,
      "tampilKembaliSuccess": true
    }
  }
}
```

---

### 2. Monthly Maintenance Routine
Triggers backup of user activity (`log_last_active_manual`) and resets member quest points for the concluded period.

- **Method**: `GET`
- **URL**: `/cron/monthly-maintenance`
- **Auth**: Basic Auth

#### Example Response (`200 OK`)
```json
{
  "message": "Monthly maintenance routine triggered successfully",
  "data": {
    "executedAt": "2026-09-30T15:30:00.000Z",
    "status": "SUCCESS",
    "details": {
      "syncResult": {
        "executionTimeMs": 120,
        "totalProcessed": 1500,
        "totalWithActivity": 450
      },
      "resetSuccess": true,
      "targetPeriod": "2026-8"
    }
  }
}
```

---

## How to Call the Endpoints

### 1. cURL Command
```bash
# Using -u flag (cURL handles Basic Auth encoding automatically)
curl -u "cron_admin:cron_secret_key_static_2026" http://localhost:5100/cron/daily-hof

curl -u "cron_admin:cron_secret_key_static_2026" http://localhost:5100/cron/monthly-maintenance
```

### 2. Linux Crontab (External Cron Execution)
If you want to trigger these endpoints on a schedule from another server or system crontab:

```bash
# Trigger daily HOF every day at 13:00 (1:00 PM)
0 13 * * * curl -s -u "cron_admin:cron_secret_key_static_2026" https://mimate-api.mymitsubishiapps.com/cron/daily-hof > /dev/null 2>&1

# Trigger monthly maintenance on the 1st of every month at midnight
0 0 1 * * curl -s -u "cron_admin:cron_secret_key_static_2026" https://mimate-api.mymitsubishiapps.com/cron/monthly-maintenance > /dev/null 2>&1
```

### 3. JavaScript / Node.js Fetch
```javascript
const credentials = Buffer.from('cron_admin:cron_secret_key_static_2026').toString('base64');

const response = await fetch('http://localhost:5100/cron/daily-hof', {
  method: 'GET',
  headers: {
    'Authorization': `Basic ${credentials}`
  }
});

const result = await response.json();
console.log(result);
```

### 4. Postman
1. Set HTTP Method to `GET`.
2. URL: `http://localhost:5100/cron/daily-hof` or `http://localhost:5100/cron/monthly-maintenance`.
3. Under the **Authorization** tab, select Type: **Basic Auth**.
4. Set **Username**: `cron_admin` (matches `CRON_USER_KEY`).
5. Set **Password**: `cron_secret_key_static_2026` (matches `CRON_PASSWORD_KEY`).
6. Click **Send**.
