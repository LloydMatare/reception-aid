// collections/Users.ts
import { CollectionConfig } from 'payload'
import { generateResetEmail } from '../lib/password-reset'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    forgotPassword: {
      expiration: 60 * 60 * 1000,
      generateEmailHTML: (args) => generateResetEmail(args?.token),
      generateEmailSubject: () => 'Reset your Reception Aid password',
    },
    tokenExpiration: 7200, // 2 hours
    cookies: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Reception', value: 'reception' },
        { label: 'Security', value: 'security' },
        { label: 'Employee', value: 'employee' },
      ],
      defaultValue: 'employee',
      required: true,
    },
    {
      name: 'department',
      type: 'text',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
