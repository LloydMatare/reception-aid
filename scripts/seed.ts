/**
 * Seeds the Postgres database from the MongoDB documents captured in ./data.
 *
 * Run with:  npm run seed           (aborts if target collections are not empty)
 *            npm run seed:fresh     (truncates them first, restarting identity)
 *
 * Postgres-specific: Mongo ObjectIds are remapped to the integer primary keys
 * that the Postgres adapter assigns, and auth columns are written by their
 * snake_case column names.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { getPayload, type CollectionSlug, type Payload } from 'payload'
import config from '../src/payload.config'

type SeedDoc = Record<string, unknown> & {
  _id: string
  createdAt: string
  updatedAt: string
}

/** Auth state that lives in Mongo but is not an editable Payload field. */
type UserSeedDoc = SeedDoc & {
  salt: string
  hash: string
  loginAttempts?: number
  lockUntil?: string | null
  resetPasswordToken?: string | null
  resetPasswordExpiration?: string | null
}

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(HERE, 'seed', 'data')
const FRESH = process.argv.includes('--fresh')

/** Random password handed to payload.create; the auth `after` hook overwrites
 *  salt/hash with the originals copied from Mongo, so nobody can log in with it. */
const PLACEHOLDER_PASSWORD = crypto.randomBytes(32).toString('hex')

const read = (file: string): SeedDoc[] =>
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'))

/** payload.create honours the createdAt/updatedAt it is handed, but the auth
 *  columns below are not part of the editable field set, so they are patched
 *  afterwards. Neither the Local API nor db.updateOne can set updatedAt, so it
 *  is restored with a literal-guarded statement. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/

const restoreUpdatedAt = async (table: string, id: number, iso: string) => {
  if (!ISO_UTC.test(iso)) throw new Error(`refusing to interpolate timestamp ${iso}`)
  if (!Number.isInteger(id)) throw new Error(`refusing to interpolate id ${id}`)
  await payload.db.drizzle.execute(`UPDATE ${table} SET updated_at = '${iso}' WHERE id = ${id}`)
}

/** Mongo _id (hex) -> Postgres primary key, kept per collection. */
const idMap = new Map<string, Map<string, string | number>>()

const mapFor = (collection: string) => {
  let m = idMap.get(collection)
  if (!m) idMap.set(collection, (m = new Map()))
  return m
}

const remap = (collection: string, mongoId: string) => {
  const mapped = mapFor(collection).get(mongoId)
  if (mapped === undefined) {
    throw new Error(`No Postgres id mapped for ${collection} _id ${mongoId}`)
  }
  return mapped
}

type Step = {
  slug: CollectionSlug
  file: string
  /** Builds the payload for `payload.create` from the raw Mongo document. */
  prepare: (doc: any) => Record<string, unknown>
  /** Runs after a successful insert. */
  after?: (payload: Payload, doc: any, created: { id: number }) => Promise<void>
}

const steps: Step[] = [
  {
    slug: 'users',
    file: 'users.json',
    prepare: (doc) => ({
      email: doc.email,
      name: doc.name,
      role: doc.role,
      department: doc.department,
      phone: doc.phone,
      isActive: doc.isActive,
      password: PLACEHOLDER_PASSWORD,
    }),
    after: async (payload, doc: UserSeedDoc, created) => {
      await payload.update({
        collection: 'users',
        id: created.id,
        data: {
          loginAttempts: doc.loginAttempts ?? 0,
          lockUntil: doc.lockUntil ?? null,
          resetPasswordToken: doc.resetPasswordToken ?? null,
          resetPasswordExpiration: doc.resetPasswordExpiration ?? null,
        },
      })

      // db.updateOne writes salt/hash but always stamps updated_at = now().
      await payload.db.updateOne({
        collection: 'users',
        where: { id: { equals: created.id } },
        data: { salt: doc.salt, hash: doc.hash },
      })

      await restoreUpdatedAt('users', Number(created.id), doc.updatedAt)
    },
  },
  {
    slug: 'employees',
    file: 'employees.json',
    prepare: (doc) => ({
      name: doc.name,
      employeeId: doc.employeeId,
      department: doc.department,
      email: doc.email,
      phone: doc.phone,
      isActive: doc.isActive,
    }),
  },
  {
    slug: 'phone-calls',
    file: 'phone-calls.json',
    prepare: (doc) => ({
      employee: remap('employees', doc.employee as string),
      callerName: doc.callerName,
      callerNumber: doc.callerNumber,
      purpose: doc.purpose,
      startTime: doc.startTime,
      endTime: doc.endTime,
    }),
  },
  {
    slug: 'travel-logs',
    file: 'travel-logs.json',
    prepare: (doc) => ({
      employee: remap('employees', doc.employee as string),
      destination: doc.destination,
      purpose: doc.purpose,
      departureTime: doc.departureTime,
      expectedReturn: doc.expectedReturn,
      status: doc.status,
      travelType: doc.travelType,
      transportation: doc.transportation,
      accommodation: doc.accommodation,
      estimatedCost: doc.estimatedCost,
      notes: doc.notes,
    }),
  },
  {
    slug: 'parcel-logs',
    file: 'parcel-logs.json',
    prepare: (doc) => ({
      from: doc.from,
      senderType: doc.senderType,
      to: doc.to,
      receivedAt: doc.receivedAt,
      collectedAt: doc.collectedAt ?? null,
      status: doc.status,
      weight: doc.weight ?? '',
      dimensions: doc.dimensions ?? '',
      notes: doc.notes ?? '',
      items: ((doc.items as Array<{ description: string; serialNumbers: string[] }>) ?? []).map(
        (item) => ({
          description: item.description,
          serialNumbers: item.serialNumbers.map((serialNumber) => ({ serialNumber })),
        }),
      ),
    }),
  },
]

type PrefSeedDoc = SeedDoc & {
  key: string
  value: Record<string, unknown>
  user: { relationTo: string; value: string }
}

const payload = await getPayload({ config })

/** SQL-safe identifier check for table names interpolated below. */
const IDENT = /^[a-z_]+$/

/** Slug -> Postgres table name (the adapter only rewrites hyphens). */
const tableFor = (slug: string) => slug.replaceAll('-', '_')

/**
 * Roots are the seeded collections' tables. Following every *inbound* foreign key
 * to a fixpoint yields every table whose rows would block or survive a wipe:
 * NO ACTION children must go with their parents, and CASCADE children would
 * otherwise be left orphaned. Truncating the whole closure in one statement is
 * the only FK-safe way to clear them, and RESTART IDENTITY resets the id
 * sequences so the reseed reproduces the ids below.
 */
const truncateClosure = async (roots: string[]): Promise<string[]> => {
  for (const table of roots) {
    if (!IDENT.test(table) || !(payload.db.tables as Record<string, unknown>)[table]) {
      throw new Error(`refusing to wipe unknown table ${table}`)
    }
  }
  const list = roots.map((table) => `'${table}'`).join(', ')
  const result = await payload.db.drizzle.execute(`
    WITH RECURSIVE fk(child, parent) AS (
      SELECT conrelid::regclass::text, confrelid::regclass::text
      FROM pg_constraint
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace
    ), closure(t) AS (
      SELECT unnest(ARRAY[${list}]::text[])
      UNION
      SELECT fk.child FROM fk JOIN closure ON fk.parent = closure.t
    )
    SELECT DISTINCT t FROM closure ORDER BY t`)
  return (result.rows as Array<{ t: string }>).map((row) => row.t)
}

/** Guard against re-seeding, which would trip the unique employeeId constraint. */
const roots = [...steps.map((step) => tableFor(step.slug)), tableFor('payload-preferences')]

if (FRESH) {
  const tables = await truncateClosure(roots)
  const union = tables
    .map((t) => `SELECT '${t}'::text AS relname, count(*)::bigint AS n FROM "${t}"`)
    .join(' UNION ALL ')
  const result = await payload.db.drizzle.execute(`SELECT * FROM (${union}) c WHERE n > 0 ORDER BY relname`)
  const populated = result.rows as Array<{ n: number; relname: string }>

  console.log(`--fresh: truncating ${tables.length} table(s), wiping:`)
  if (populated.length === 0) console.log('  (all empty)')
  for (const row of populated) console.log(`  ${row.relname} (${row.n} rows)`)
  await payload.db.drizzle.execute(
    `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY`,
  )
} else {
  const occupied: string[] = []
  for (const { slug } of steps) {
    const { totalDocs } = await payload.count({ collection: slug })
    if (totalDocs > 0) occupied.push(`${slug} (${totalDocs})`)
  }
  if (occupied.length > 0) {
    console.error(
      `\nRefusing to seed: these collections already contain rows:\n  ${occupied.join('\n  ')}\n\n` +
        `Re-run with --fresh to delete them first.\n`,
    )
    process.exit(1)
  }
}

const seen = new Set<string>()
const totals: Record<string, { inserted: number; duplicates: number }> = {}

for (const step of steps) {
  const docs = read(step.file)
  totals[step.slug] = { inserted: 0, duplicates: 0 }

  for (const doc of docs) {
    const dedupeKey = `${step.slug}:${doc._id}`
    if (seen.has(dedupeKey)) {
      totals[step.slug].duplicates += 1
      console.log(`  skipped duplicate ${step.slug} _id ${doc._id}`)
      continue
    }
    seen.add(dedupeKey)

    const created = await payload.create({
      collection: step.slug,
      data: { ...step.prepare(doc), createdAt: doc.createdAt, updatedAt: doc.updatedAt },
    })

    mapFor(step.slug).set(doc._id, created.id)
    totals[step.slug].inserted += 1

    await step.after?.(payload, doc, created)
  }

  console.log(
    `${step.slug}: inserted ${totals[step.slug].inserted}, ` +
      `skipped ${totals[step.slug].duplicates} duplicate(s)`,
  )
}

/** Admin UI view preferences. Cosmetic, so never fatal. */
try {
  const prefs = read('payload-preferences.json') as PrefSeedDoc[]
  const users = await payload.find({ collection: 'users', limit: 100 })

  for (const pref of prefs) {
    const mappedId = idMap.get('users')?.get(pref.user.value as string)
    const owner = users.docs.find((u) => u.id === mappedId)
    if (!owner) throw new Error(`no user mapped for preference _id ${pref._id}`)

    // Mirrors payload's internal preferences `update` operation, which is not
    // exposed on the Local API in this version.
    await payload.db.upsert({
      collection: 'payload-preferences',
      where: {
        and: [
          { key: { equals: pref.key } },
          { 'user.value': { equals: owner.id } },
          { 'user.relationTo': { equals: 'users' } },
        ],
      },
      data: {
        key: pref.key,
        user: { relationTo: 'users', value: owner.id },
        value: pref.value,
      },
      req: { payload, t: () => 'Seeding preferences' } as any,
    })
  }
  console.log(`payload-preferences: inserted ${prefs.length}`)
} catch (err) {
  console.warn(`payload-preferences: skipped (${(err as Error).message})`)
}

console.log('\nSeed complete.')
process.exit(0)