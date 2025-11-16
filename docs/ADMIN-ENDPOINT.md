# Admin Endpoint - Database Initialization

This document explains how to use the admin endpoint to populate your production database with RMF funds data.

## Overview

The admin endpoint `/admin/init-database` triggers the full data pipeline to fetch and load all Thai RMF funds data into your production database. This is a **one-time operation** you run after publishing your app.

## Endpoint Details

- **URL**: `/admin/init-database`
- **Method**: POST
- **Authentication**: Protected by `ADMIN_SECRET` via Authorization header (Bearer token)
- **Duration**: ~25-30 minutes (fetches fresh data from SEC Thailand API)
- **Data**: Loads ~442 RMF funds with 30-day NAV history
- **Concurrency**: Only one pipeline run allowed at a time

## Security Features

- **POST method**: Prevents accidental triggers from bookmarks or browser prefetch
- **Authorization header**: Secret never appears in logs, browser history, or URL bars
- **Constant-time comparison**: Prevents timing attacks on secret validation
- **Concurrency lock**: Ensures only one pipeline runs at a time

## Usage

### Step 1: Get Your Published URL

After publishing your Replit app, you'll have a URL like:
```
https://your-app-name.replit.app
```

### Step 2: Call the Admin Endpoint

Use curl to trigger the pipeline (replace `YOUR_ADMIN_SECRET` with the value from Replit Secrets):

```bash
curl -X POST https://your-app-name.replit.app/admin/init-database \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

**Important**: The secret is sent via Authorization header, NOT in the URL. This keeps it out of logs and browser history.

### Step 3: Monitor Progress

The endpoint will open a live progress page showing:
- Real-time pipeline execution logs
- Data fetch progress from SEC Thailand API
- Validation results
- Database load statistics
- Success/failure status

### Step 4: Wait for Completion

The pipeline will:
1. **Fetch Data** (~20-25 min): Download fresh RMF fund data from SEC Thailand API
2. **Validate** (~1 min): Check data completeness before loading
3. **Load** (~5 min): Populate production database using safe UPSERT mode

Total time: **~25-30 minutes**

### Step 5: Verify Success

When complete, you'll see:
```
✅ Pipeline completed successfully! 
Your production database is now populated with RMF funds data.
```

Verify by checking your production database:
- Funds loaded: ~442 RMF funds
- NAV records: ~12,000+ historical NAV data points
- Tables populated: rmf_funds, rmf_nav_history, rmf_dividends, pipeline_runs

## When to Use

**Call this endpoint:**
- ✅ Once immediately after publishing for the first time
- ✅ Anytime you want to refresh production data with latest RMF funds
- ✅ After database schema changes that require fresh data

**Don't call:**
- ❌ During active user sessions (pipeline is heavy)
- ❌ Multiple times simultaneously (one pipeline run at a time)
- ❌ From development environment (dev database already has data)

## Security Features

- **Secret-based authentication**: Only you can trigger the pipeline
- **Production-safe UPSERT**: Never truncates data, always safe to run
- **Validation before load**: Ensures data completeness before updating database
- **Process crash-safe**: Database remains valid even if pipeline fails mid-run

## Checking Pipeline Status

You can check if a pipeline is currently running:

```bash
curl https://your-app-name.replit.app/admin/status
```

Response when running:
```json
{
  "running": true,
  "elapsedMinutes": 15,
  "message": "Pipeline has been running for 15 minutes. Estimated total: 25-30 minutes."
}
```

Response when idle:
```json
{
  "running": false,
  "message": "No pipeline is currently running."
}
```

## Example: Full Flow

After publishing:

```bash
# 1. Trigger the pipeline (opens streaming HTML response in browser/terminal)
curl -X POST https://rmf-market-pulse-mcp.replit.app/admin/init-database \
  -H "Authorization: Bearer YOUR_SECRET"

# 2. In a separate terminal, check progress:
curl https://rmf-market-pulse-mcp.replit.app/admin/status

# 3. Wait for completion message:
✅ Pipeline completed successfully!
```

**Note**: The curl command above will stream real-time logs for 25-30 minutes. Keep the terminal open to watch progress.

Your production MCP server now has fresh RMF data and is ready to serve ChatGPT!

## Troubleshooting

**"Unauthorized" error**:
- Check that `ADMIN_SECRET` is set in Replit Secrets
- Verify you're using the correct secret value in the URL

**Pipeline fails during fetch**:
- SEC Thailand API might be temporarily unavailable
- Try again in a few minutes
- Check the logs for specific error messages

**Database connection errors**:
- Verify production database is provisioned
- Check that DATABASE_URL is configured in deployment settings

**Already have data but want to refresh**:
- It's safe to run again - UPSERT mode updates existing + inserts new funds
- No data loss occurs

## Notes

- The pipeline fetches **live data** from SEC Thailand API (not cached)
- Cancelled/liquidated funds are NOT automatically removed (intentional for safety)
- You can run this endpoint anytime to refresh production data
- Development database is separate - this only affects production

## Need Help?

If the pipeline fails, check:
1. Live progress logs on the endpoint page
2. Production deployment logs in Replit
3. Database connection status
4. SEC Thailand API availability
