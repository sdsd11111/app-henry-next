import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

let pool: mysql.Pool;

const dbConfig: mysql.PoolOptions = {
  host: process.env.DB_HOST || 'mysql.us.stackcp.com',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 45127,
  user: process.env.DB_USER || 'coach-154c',
  password: process.env.DB_PASS || 'mOZW^$v1%Qdd',
  database: process.env.DB_NAME || 'Portal-313931afac',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

if (process.env.NODE_ENV === 'production') {
  pool = mysql.createPool(dbConfig);
} else {
  if (!global._mysqlPool) {
    global._mysqlPool = mysql.createPool(dbConfig);
  }
  pool = global._mysqlPool;
}

export default pool;

export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const [rows] = await pool.query(sql, params);
  return rows as T;
}

export async function execute<T = any>(sql: string, params: any[] = []): Promise<T> {
  const [result] = await pool.execute(sql, params);
  return result as T;
}
