import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// 全局单例：防止 Next.js 热重载时重复创建连接池
const globalForDb = globalThis as unknown as { _mysqlPool?: mysql.Pool };

// MySQL 连接池配置，从环境变量读取，fallback 到本地开发默认值
if (!globalForDb._mysqlPool) {
  globalForDb._mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "123456",
    database: process.env.DB_NAME || "daihuo_jianshou",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // 性能优化
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 5000,
    // 连接空闲回收，避免走 TCP 重连
    idleTimeout: 30000,
  });
}
const pool = globalForDb._mysqlPool;

// 创建 Drizzle ORM 实例，绑定 schema
export const db = drizzle(pool, { schema, mode: "default" });

// 兼容函数式调用
export function getDb() {
  return db;
}
