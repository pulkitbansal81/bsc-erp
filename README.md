# BSC ERP — Supabase version

Google Sheets + Apps Script wala ERP ab: **Supabase (Postgres + Edge Functions)** backend, **Vercel** par frontend. Frontend code (js1/js2/js3) wahi hai jo Apps Script mein tha — sirf engine badla hai.

```
web/                      → Vercel par serve hota hai (index.html + js1/js2/js3 + shim)
supabase/migrations/      → database tables + functions (erp_rows = sheet tabs ka parity model)
supabase/functions/api    → Code.gs ka port (login, readAll, appendRow, updateCells, scope, decoy, WhatsApp…)
supabase/functions/import → purane Sheet se data import (bridge.gs bhejta hai)
appsscript-bridge/        → PURANE Apps Script project mein add karne wali file (export + B2B/IMS/PDF bridge)
```

## Setup (ek baar, ~30 min)

### 1. GitHub secrets (is repo mein)
Repo → Settings → Secrets and variables → Actions → New repository secret (3 baar):
- `SUPABASE_ACCESS_TOKEN` — supabase.com → apne avatar → Account Settings → Access Tokens → Generate new token
- `SUPABASE_PROJECT_REF` — Supabase → Project Settings → General → **Project ID** (chhota random text, jaise `abcdefghij`)
- `SUPABASE_DB_PASSWORD` — project banate waqt wala database password

Phir repo → Actions tab → "Deploy to Supabase" → **Run workflow**. Green ho gaya = database + API deploy.

### 2. Storage bucket
Supabase → Storage → New bucket → naam **`erp-files`** → **Public bucket ON** → Save.
(Attendance selfies + task attachments yahan jaate hain.)

### 3. kv table mein properties (Script Properties ka replacement)
Supabase → Table Editor → `kv` → Insert row (key, value):

| key | value |
|---|---|
| `IMPORT_KEY` | lamba random text (khud banao, 30+ characters) |
| `BRIDGE_KEY` | lamba random text (alag) |
| `BRIDGE_URL` | purane Apps Script ka `/exec` URL (wahi jo abhi ERP kholta hai) |
| `WA_TOKEN` | purane ERP Script Properties se copy |
| `WA_PHONE_ID` | purane ERP Script Properties se copy |
| `ALERT_PHONE` | purane ERP se copy |
| `DECOY_KEY` | purane ERP se copy (Ziva kill/live ke liye) |
| `GEMINI_KEY` | purane ERP se copy (AI slip reader) |
| `TPL_LANG` / `TPL_PENDING` / `TPL_PROMISE` ... | sirf tab jab purane mein set kiye the |

### 4. Purane Apps Script mein bridge
Purana ERP project kholo → Files **+** → Script → naam `Bridge` → `appsscript-bridge/bridge.gs` ka content paste → Save.
Script Properties mein add karo:
- `BRIDGE_KEY` = wahi jo upar kv mein daala
- `SUPA_IMPORT_URL` = `https://<PROJECT_REF>.supabase.co/functions/v1/import`
- `SUPA_IMPORT_KEY` = wahi IMPORT_KEY

Deploy → Manage deployments → ✏️ Edit → Version: **New version** → Deploy (URL wahi rehta hai).

### 5. Data import (baar-baar chala sakte ho)
Purane Apps Script editor mein function dropdown se **`exportAllToSupabase`** chuno → Run ▶.
~1–2 minute. Executions/Logger mein har tab ka "N rows" dikhega.
**Cutover wale din yahi dobara chalana = final fresh data.**

### 6. Frontend (Vercel)
1. `web/config.js` mein `YOUR_PROJECT_REF` ki jagah apna Project ID likho (GitHub par hi ✏️ edit karke commit).
2. vercel.com → Add New → Project → ye repo import karo → **Root Directory = `web`** → Framework: Other → Deploy.
3. Jo URL mile (jaise `bsc-erp.vercel.app`) wahi naya ERP hai — login karke dekho.
4. Apna domain: Vercel project → Settings → Domains → `erp.bscinterio.com` add → jo CNAME bataye wo DNS mein daalo.

## Kya abhi bhi purane Apps Script se chalta hai (bridge)
B2B/IMS sheets (jo staff seedha sheet mein edit karta hai), Documents, Tasks, aur **ledger PDF banana** — ye abhi purana script karta hai (isliye purana project delete nahi karna). Baad mein ek-ek karke idhar aayenge.

## Ziva bot
Bot abhi purani sheet padhta hai. **Cutover se pehle bot ko naye API se jodna zaroori hai** — warna bot purana data bolega. (Agla step, alag change.)

## Roz ka development
- Frontend change: `web/js1.js` etc edit → push → Vercel khud deploy (~30 sec).
- Backend change: `supabase/functions/api/index.ts` edit → push → Action deploy karta hai.
- Database change: nayi file `supabase/migrations/0002_*.sql` → push.

## Design notes (future dev ke liye)
- `erp_rows(tab, rid, vals jsonb)` — har sheet row = ek record, `vals` = cells **frontend COLS ke order** mein. `rid` = sheet row number (header=1). Ye v1 ka parity model hai; module-by-module proper columns mein normalize hoga.
- Append/update **Postgres functions** se hote hain (`erp_append_row`, `erp_update_cells`) — advisory lock + duplicate-ID guard + idempotency wahi Code.gs wala, par ab transactional.
- Security model wahi: apna token-session (kv), role/branch scoping server-side (`applyScope`), office hours, decoy/kill-switch, access log + WhatsApp alerts.
- `headers.ts` frontend COLS se generate hota hai — COLS badle to use bhi badalna.
