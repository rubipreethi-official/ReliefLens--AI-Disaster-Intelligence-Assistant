import { getCollection } from '../db.js'

async function run() {
  console.log('Connecting to database and seeding test email...');
  const col = await getCollection('alert_recipients');
  const result = await col.updateOne(
    { email: 'rpofficialcontact@gmail.com' },
    { 
      $set: {
        email: 'rpofficialcontact@gmail.com',
        name: 'RP Official Contact',
        role: 'Local Authority — Madurai / Chennai',
        regions: ['Tamil Nadu', 'Madurai', 'Thirumangalam', 'Chennai'],
        districts: ['Madurai', 'Chennai'],
        taluks: ['Thirumangalam'],
        isGlobal: false,
        active: true,
        addedAt: new Date().toISOString(),
        note: 'Primary contact for Madurai and Chennai district incidents. Receives Super Critical alerts automatically.',
      }
    },
    { upsert: true }
  );
  console.log('Seeded test email successfully:', result);
  process.exit(0);
}

run().catch((err) => {
  console.error('Error seeding test email:', err);
  process.exit(1);
});
