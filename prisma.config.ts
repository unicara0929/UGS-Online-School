import * as path from "path";
import * as dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// 絶対パスで.env.localを読み込み、既存の環境変数を上書き
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

// .envを先に読み込み、次に.env.localで上書き
dotenv.config({ path: envPath });
dotenv.config({ path: envLocalPath, override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },
});
