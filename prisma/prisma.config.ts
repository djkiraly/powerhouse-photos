import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
config({ path: envPath });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(`DATABASE_URL not found. Tried loading from: ${envPath}`);
}

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: databaseUrl,
  },
  migrate: {
    async resolveAdapter() {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required');
      }
      const { PrismaNeon } = await import('@prisma/adapter-neon');
      return new PrismaNeon({ connectionString });
    },
  },
});
