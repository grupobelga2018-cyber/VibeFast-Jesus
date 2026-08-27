import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

const files = [
  "supabase/migrations/008_appointments.sql",
  "supabase/migrations/009_appointment_proposed.sql",
  "supabase/migrations/010_google_calendar.sql",
]

const root = resolve(import.meta.dirname, "../..")

for (const file of files) {
  const result = spawnSync(
    "supabase",
    ["db", "query", "--linked", "--file", file],
    { cwd: root, stdio: "inherit", shell: true }
  )
  if (result.status !== 0) {
    console.error("migrate_error", file)
    process.exit(result.status || 1)
  }
}

const verify = spawnSync(
  "supabase",
  [
    "db",
    "query",
    "--linked",
    "notify pgrst, 'reload schema'; select tablename from pg_tables where schemaname = 'public' and tablename in ('appointments','telegram_conversations','google_calendar_auth') order by 1;",
  ],
  { cwd: root, stdio: "inherit", shell: true }
)
if (verify.status !== 0) process.exit(verify.status || 1)
console.log("appointments_tables_ok")
