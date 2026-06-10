import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { compositions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// 获取项目的合成记录（最新一条）
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "缺少 projectId" }, { status: 400 });
  }

  const db = getDb();
  const result = await db
    .select()
    .from(compositions)
    .where(eq(compositions.projectId, projectId))
    .orderBy(desc(compositions.createdAt))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ composition: null });
  }

  return NextResponse.json({ composition: result[0] });
}
