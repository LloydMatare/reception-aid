import { getPayload } from 'payload'
import config from './src/payload.config'

const run = async () => {
  const payload = await getPayload({ config })
  
  try {
    const result = await payload.login({
      collection: 'users',
      data: {
        email: 'gracer@compulink.co.zw',
        password: 'compulink123',
      },
    })
    console.log('ok')
    process.exit(0)
  } catch (err: any) {
    console.error(err.message)
    process.exit(1)
  }
}

run()
