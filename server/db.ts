import { MongoClient, Db, Collection } from 'mongodb'
import { SERVER_CONFIG } from './config.js'

let client: MongoClient | null = null
let db: Db | null = null

export async function getDb(): Promise<Db> {
  if (db) return db
  if (!SERVER_CONFIG.mongoUri) {
    throw new Error('MongoDB URI not configured. Set MONGODB_URI or VITE_MONGODB_URI in .env.local')
  }
  
  const obscuredUri = SERVER_CONFIG.mongoUri.replace(/:([^@]+)@/, ':****@')
  console.log(`[DB] Connecting to MongoDB: ${obscuredUri}`)
  
  client = new MongoClient(SERVER_CONFIG.mongoUri)
  await client.connect()
  
  console.log(`[DB] Connected successfully to Cluster. Target DB: ${SERVER_CONFIG.dbName}`)
  db = client.db(SERVER_CONFIG.dbName)
  return db
}

export async function getCollection<T extends Record<string, unknown>>(name: string): Promise<Collection<T>> {
  const database = await getDb()
  return database.collection<T>(name)
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}
