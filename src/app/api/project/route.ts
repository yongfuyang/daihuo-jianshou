export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// 获取项目列表
export async function GET() {
  try {
    const db = getDb();
    const result = await db.select().from(projects).orderBy(desc(projects.createdAt));
    return NextResponse.json(result);
  } catch (error) {
    console.error("获取项目列表失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取项目列表失败" },
      { status: 500 }
    );
  }
}

// 创建新项目
export async function POST(req: NextRequest) {
  try {
    console.log("📦 POST /api/project called");
    const body = await req.json();
    console.log("📝 Request body:", JSON.stringify(body).substring(0, 500));
    const db = getDb();
    console.log("✅ Database connected");

    const newProject = await db
      .insert(projects)
      .values({
        name: body.name || "未命名项目",
        productName: body.productName,
        productCategory: body.productCategory,
        productDescription: body.productDescription,
        productImages: body.productImages || [],
      })
      .returning();

    console.log("✅ Project created:", JSON.stringify(newProject));
    return NextResponse.json(newProject[0], { status: 201 });
  } catch (error) {
    console.error("❌ 创建项目失败:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : "N/A");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建项目失败" },
      { status: 500 }
    );
  }
}
