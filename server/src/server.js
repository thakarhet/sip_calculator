import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

const { default: app } = await import('./app.js');
const { connectDatabase } = await import('./config/db.js');

const port = Number(process.env.PORT) || 5001;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters');
await connectDatabase();
app.listen(port, () => console.log(`API listening on port ${port}`));
