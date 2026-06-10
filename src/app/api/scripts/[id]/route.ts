import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// 更新单个脚本
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  const result = await db
    .update(scripts)
    .set({
      ...body,
      ...(body.shots && { shots: body.shots }),
    })
    .where(eq(scripts.id, id))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "脚本不存在" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

// 删除单个脚本
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const result = await db.delete(scripts).where(eq(scripts.id, id)).returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "脚本不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
