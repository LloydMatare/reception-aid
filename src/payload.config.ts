import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Visitors } from './collections/Visitors'
import { TravelLogs } from './collections/TravelLogs'
import { ParcelLogs } from './collections/ParcelLogs'
import { PhoneCalls } from './collections/PhoneCalls'
import { Vehicles } from './collections/Vehicles'
import { Employees } from './collections/Employees'
import { Clients } from './collections/Client'
import { Appointments } from './collections/Appointment'
import { getPasswordResetConfig } from './lib/password-reset'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const resetEmail = getPasswordResetConfig()

export default buildConfig({
  email: resetEmail
    ? resendAdapter({
        apiKey: resetEmail.apiKey,
        defaultFromAddress: resetEmail.defaultFromAddress,
        defaultFromName: resetEmail.defaultFromName,
      })
    : () => ({
        name: 'unconfigured',
        defaultFromAddress: 'noreply@example.com',
        defaultFromName: 'Reception Aid',
        sendEmail: async () => {
          throw new Error('Resend email is not configured')
        },
      }),
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Appointments,
    Users,
    Media,
    Visitors,
    TravelLogs,
    ParcelLogs,
    PhoneCalls,
    Vehicles,
    Employees,
    Clients,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      // Accepts either name so existing deployments using DATABASE_URL keep working.
      connectionString: process.env.DATABASE_URI || process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
