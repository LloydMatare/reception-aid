import { getPayload } from 'payload'
import config from './src/payload.config'

const run = async () => {
  const payload = await getPayload({ config })
  
  const users = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: 'gracer@compulink.co.zw',
      },
    },
  })
  
  if (users.docs.length === 0) {
    console.log('User not found')
    process.exit(1)
  }
  
  const user = users.docs[0]
  console.log(JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
  }, null, 2))
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
