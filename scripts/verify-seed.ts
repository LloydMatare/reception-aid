/**
 * Verifies the seeded Postgres rows against the Mongo fixtures in ./seed/data.
 * Run after `npm run seed` with the same DATABASE_URI / DATABASE_URL.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seed', 'data')
const load = (f: string) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))

const payload = await getPayload({ config })
const rows = async (sql: string) => (await payload.db.drizzle.execute(sql)).rows as any[]

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}
const iso = (s: string) => new Date(s).toISOString()
/** drizzle returns timestamptz as "YYYY-MM-DD HH:MM:SS.mmm+ZZ" strings. */
const ts = (d: any) => (d === null || d === undefined ? d : new Date(d).toISOString())

/** Users carry the migrated credentials: any drift in salt/hash is a lockout. */
const srcUsers = load('users.json')
const userRows = await rows(
  `SELECT id, email, name, role, department, phone, is_active,
          salt, hash, login_attempts, lock_until,
          reset_password_token, reset_password_expiration,
          created_at, updated_at
     FROM users ORDER BY id`,
)
check('users row count', userRows.length === srcUsers.length, `${userRows.length} vs ${srcUsers.length}`)
const userByEmail = new Map(userRows.map((r) => [r.email, r]))
for (const u of srcUsers) {
  const r = userByEmail.get(u.email)
  if (!r) {
    check(`user ${u.email}`, false, 'MISSING')
    continue
  }
  const shared =
    r.name === u.name &&
    r.role === u.role &&
    r.department === u.department &&
    r.phone === u.phone &&
    r.is_active === u.isActive &&
    ts(r.created_at) === iso(u.createdAt) &&
    ts(r.updated_at) === iso(u.updatedAt)
  const auth = r.salt === u.salt && r.hash === u.hash
  const state =
    Number(r.login_attempts) === (u.loginAttempts ?? 0) &&
    ts(r.lock_until) === (u.lockUntil ? iso(u.lockUntil) : null) &&
    r.reset_password_token === (u.resetPasswordToken ?? null) &&
    ts(r.reset_password_expiration) ===
      (u.resetPasswordExpiration ? iso(u.resetPasswordExpiration) : null)
  check(`user ${u.email} profile`, shared)
  check(`user ${u.email} salt+hash byte-identical`, auth, `${r.salt?.length}char/${r.hash?.length}char`)
  check(`user ${u.email} auth state`, state)
}
check('users emails unique', new Set(userRows.map((r) => r.email)).size === userRows.length)
check(
  'users have credentials',
  userRows.every((r) => r.salt?.length === 64 && r.hash?.length === 1024),
)

const emps = load('employees.json')
const empRows = await rows('SELECT * FROM employees ORDER BY id')
check('employees row count', empRows.length === emps.length, `${empRows.length} vs ${emps.length}`)

const byEmpId = new Map(empRows.map((r) => [r.employee_id, r]))
for (const e of emps) {
  const r = byEmpId.get(e.employeeId)
  check(
    `employee ${e.employeeId}`,
    !!r &&
      r.name === e.name &&
      r.email === e.email &&
      r.department === e.department &&
      r.phone === e.phone &&
      r.is_active === e.isActive &&
      ts(r.created_at) === iso(e.createdAt) &&
      ts(r.updated_at) === iso(e.updatedAt),
    r ? '' : 'MISSING',
  )
}
const empIdOf = (mongoId: string) =>
  byEmpId.get(emps.find((e: any) => e._id === mongoId)!.employeeId)!.id

const calls = load('phone-calls.json')
const callRows = await rows('SELECT * FROM phone_calls ORDER BY id')
check('phone-calls count', callRows.length === calls.length)
for (let i = 0; i < calls.length; i++) {
  const c = calls[i]
  const r = callRows[i]
  check(
    `phone-call ${c.callerName}`,
    r.employee_id === empIdOf(c.employee) &&
      r.caller_name === c.callerName &&
      r.caller_number === c.callerNumber &&
      ts(r.start_time) === iso(c.startTime) &&
      ts(r.end_time) === iso(c.endTime),
    `employee_id=${r.employee_id} (expected ${empIdOf(c.employee)})`,
  )
}

const travels = load('travel-logs.json')
const travelRows = await rows('SELECT * FROM travel_logs ORDER BY id')
check('travel-logs count', travelRows.length === travels.length)
for (let i = 0; i < travels.length; i++) {
  const t = travels[i]
  const r = travelRows[i]
  check(
    `travel-log ${t.destination}`,
    r.employee_id === empIdOf(t.employee) &&
      r.destination === t.destination &&
      r.status === t.status &&
      r.travel_type === t.travelType &&
      r.transportation === t.transportation &&
      Number(r.estimated_cost) === t.estimatedCost &&
      ts(r.departure_time) === iso(t.departureTime) &&
      ts(r.expected_return) === iso(t.expectedReturn) &&
      ts(r.created_at) === iso(t.createdAt) &&
      ts(r.updated_at) === iso(t.updatedAt),
  )
}

const parcelsAll = load('parcel-logs.json')
const parcels: any[] = [...new Map(parcelsAll.map((p: any) => [p._id, p])).values()]
const parcelRows = await rows('SELECT * FROM parcel_logs ORDER BY id')
check(
  'parcel-logs count = unique mongo _ids',
  parcelRows.length === parcels.length,
  `${parcelRows.length} vs ${parcels.length}`,
)
check(
  'parcel collectedAt preserved',
  parcelRows.filter((r) => r.collected_at !== null).length ===
    parcels.filter((p: any) => p.collectedAt).length,
)

let itemTotal = 0
let serialTotal = 0
const mismatches: string[] = []
for (const r of parcelRows) {
  const items = await rows(
    `SELECT i.description, array_agg(s.serial_number ORDER BY s._order) AS serials
       FROM parcel_logs_items i
       LEFT JOIN parcel_logs_items_serial_numbers s ON s._parent_id = i.id
      WHERE i._parent_id = ${r.id}
      GROUP BY i.id, i.description, i._order ORDER BY i._order`,
  )
  const src = parcels.find(
    (p: any) =>
      p.from === r.from && p.to === r.to && p.notes === r.notes && ts(r.received_at) === iso(p.receivedAt),
  )
  itemTotal += items.length
  serialTotal += items.reduce((a: number, i) => a + (i.serials?.filter(Boolean).length ?? 0), 0)
  if (!src) {
    mismatches.push(`row ${r.id}: no source parcel for ${r.from} -> ${r.to}`)
    continue
  }
  if (items.length !== src.items.length) {
    mismatches.push(`row ${r.id}: ${items.length} items vs ${src.items.length}`)
    continue
  }
  items.forEach((got, i) => {
    const want = src.items[i]
    if (got.description !== want.description) mismatches.push(`row ${r.id} item ${i}: description`)
    const gotSerials = (got.serials ?? []).filter(Boolean)
    if (
      want.serialNumbers.length !== gotSerials.length ||
      want.serialNumbers.some((s: string, j: number) => s !== gotSerials[j])
    ) {
      mismatches.push(`row ${r.id} item ${i}: serials`)
    }
  })
}
const expectedItems = parcels.reduce((a: number, p: any) => a + p.items.length, 0)
const expectedSerials = parcels.reduce(
  (a: number, p: any) => a + p.items.reduce((b: number, i: any) => b + i.serialNumbers.length, 0),
  0,
)
check('parcel items total', itemTotal === expectedItems, `${itemTotal} vs ${expectedItems}`)
check('parcel serial numbers total', serialTotal === expectedSerials, `${serialTotal} vs ${expectedSerials}`)
check('parcel items/serials content', mismatches.length === 0, mismatches.slice(0, 5).join(' | '))

const prefs = await rows('SELECT key, value FROM payload_preferences')
const rels = await rows('SELECT users_id FROM payload_preferences_rels')
check('preferences row', prefs.length === 1 && prefs[0].key === 'collection-users')
check('preferences linked to a user', rels.length === 1)

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)