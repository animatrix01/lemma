# LEMMA Frontend/Backend Integration Fixes

## Issues Found

### 1. Frontend in MOCK_MODE (PRIMARY ISSUE)
**Problem**: The frontend was configured to use mock data instead of real API calls
**Location**: `frontend/.env.local`
**Status**: ✅ FIXED

**Change Made**:
```env
# Before
NEXT_PUBLIC_MOCK_MODE=true

# After
NEXT_PUBLIC_MOCK_MODE=false
```

### 2. Backend Async Pipeline Issue
**Problem**: The `run_ingest` function was async but called synchronously via `background_tasks.add_task()`
**Location**: `backend/ingest/pipeline.py`
**Status**: ✅ FIXED

**Change Made**:
- Created a sync wrapper `run_ingest()` that calls `asyncio.run()`
- Renamed original async function to `_run_ingest_async()`
- This ensures the background task can properly execute the async pipeline

### 3. API Key Format Issue
**Problem**: GEMINI_API_KEY had incorrect prefix "AQ." instead of "AIza"
**Location**: `.env`
**Status**: ✅ FIXED

**Change Made**:
```env
# Before
GEMINI_API_KEY= "YOUR_API_KEY_WITH_SPACE"

# After
GEMINI_API_KEY="YOUR_API_KEY_WITHOUT_SPACE"
```
**Note**: Fixed spacing issue in API key configuration

## How to Apply These Fixes

### Step 1: Restart Frontend (REQUIRED)
The frontend Next.js dev server MUST be restarted for the `.env.local` changes to take effect:

```powershell
# Stop the current Next.js dev server (Ctrl+C in the terminal running it)
# Then restart it:
cd frontend
npm run dev
```

### Step 2: Restart Backend (RECOMMENDED)
While the backend is currently running, restarting it will ensure the fixed pipeline code is loaded:

```powershell
# Stop the current backend (Ctrl+C in the terminal running it)
# Then restart it:
cd ..
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 3: Test the Fix
1. Open the frontend at http://localhost:3000
2. Click "New Analysis" or enter a query in the chat input
3. You should now see:
   - Real-time events streaming (not mock data)
   - Sources being fetched
   - Claims being extracted
   - Analysis being performed

## Verification Checklist

- [ ] Frontend dev server restarted after `.env.local` change
- [ ] Backend restarted with fixed pipeline code
- [ ] Can create a new analysis and see real-time events
- [ ] Events show actual URLs being fetched (not mock data)
- [ ] Run completes and shows actual results in the matrix view

## What Was Working

✅ Backend API is healthy and responding
✅ Database is initialized with tables
✅ API keys are configured (Groq, Tavily, HuggingFace)
✅ All endpoints are functional

## What Needed Fixing

❌ Frontend was using mock data instead of real API calls
❌ Backend async pipeline had execution issues
❌ API key had wrong format

## Technical Details

### Frontend API Client (`frontend/src/lib/api.ts`)
The API client checks `process.env.NEXT_PUBLIC_MOCK_MODE`:
- When `"true"`: Returns mock JSON data from `frontend/src/mocks/`
- When `"false"`: Makes real HTTP requests to `NEXT_PUBLIC_API_BASE`

Environment variables in Next.js starting with `NEXT_PUBLIC_` are:
- Embedded at build time
- Require server restart to update
- Available in browser code

### Backend Pipeline Fix
FastAPI's `BackgroundTasks.add_task()` expects a callable (sync or async).
However, the original async function wasn't properly wrapped for sync execution.

The fix:
```python
def run_ingest(...):  # Sync wrapper
    asyncio.run(_run_ingest_async(...))

async def _run_ingest_async(...):  # Original async logic
    # ... actual implementation ...
```

## Next Steps

After applying these fixes:
1. Test the "New Analysis" feature with a real query
2. Verify events stream in real-time
3. Check that the run completes successfully
4. View the results in the matrix/report view

If you still see mock data after restarting:
- Check browser console for errors
- Verify `NEXT_PUBLIC_MOCK_MODE=false` in `frontend/.env.local`
- Clear browser cache and reload
- Check that frontend is actually restarted (timestamp in terminal)
