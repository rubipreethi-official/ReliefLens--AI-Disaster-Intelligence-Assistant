import { MongoClient } from 'mongodb'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: '.env.local' })
const uri = process.env.VITE_MONGODB_URI || ''
console.log('Connecting to:', uri.replace(/:([^@]+)@/, ':****@'))

const client = new MongoClient(uri)
try {
  await client.connect()
  console.log('Connected successfully!')
  const db = client.db('ReliefLens')
  const collections = await db.listCollections().toArray()
  console.log('Collections:', collections.map(c => c.name))
  await client.close()
} catch (err) {
  console.error('Connection failed:', err)
  process.exit(1)
}
