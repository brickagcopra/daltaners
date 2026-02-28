export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema?: string;
  ssl?: boolean;
  poolSize?: number;
}

export function getDatabaseConfig(schema?: string): DatabaseConfig {
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'daltaners',
    password: process.env.POSTGRES_PASSWORD || 'daltaners_dev_password',
    database: process.env.POSTGRES_DB || 'daltaners',
    schema: schema,
    ssl: process.env.POSTGRES_SSL === 'true',
    poolSize: parseInt(process.env.POSTGRES_POOL_SIZE || '10', 10),
  };
}
