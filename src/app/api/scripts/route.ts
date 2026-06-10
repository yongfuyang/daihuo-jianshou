import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scripts, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// 获取项目的所有脚本
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "缺少 projectId" }, { status: 400 });
  }

  const db = getDb();
  const result = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, projectId));

  return NextResponse.json(result);
}

// 批量保存脚本（生成后一次性保存多套）
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, scriptList } = body as {
    projectId: string;
    scriptList: {
      styleType: string;
      title?: string;
      totalDuration?: number;
      shots?: Record<string, unknown>[];
    }[];
  };

  if (!projectId || !Array.isArray(scriptList)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const db = getDb();

  // 先删除该项目旧脚本
  await db.delete(scripts).where(eq(scripts.projectId, projectId));

  // 合法的 styleType 枚举值
  const VALID_STYLES = ["pain_point", "scene", "comparison", "story", "custom"];

  // 批量插入新脚本
  const saved = [];
  for (let i = 0; i < scriptList.length; i++) {
    const s = scriptList[i];
    const id = crypto.randomUUID();
    const rawStyle = String(s.styleType || "custom").toLowerCase();
    const styleType = VALID_STYLES.includes(rawStyle) ? rawStyle : "custom";
    await db
      .insert(scripts)
      .values({
        id,
        projectId,
        version: 1,
        styleType: styleType as "pain_point" | "scene" | "comparison" | "story" | "custom",
        title: s.title || `脚本方案 ${i + 1}`,
        totalDuration: s.totalDuration ?? 0,
        shots: s.shots ?? [],
        selected: i === 0,
      });
    // MySQL 不支持 RETURNING，查回记录
    const [row] = await db.select().from(scripts).where(eq(scripts.id, id));
    saved.push(row);
  }

  // 更新项目状态为 scripting
  await db
    .update(projects)
    .set({ status: "scripting", updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  return NextResponse.json(saved, { status: 201 });
}
