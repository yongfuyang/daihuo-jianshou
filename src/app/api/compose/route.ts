import { NextRequest, NextResponse } from "next/server";
import { composeVideo, type ComposeConfig } from "@/lib/video-composer/composer";
import { getDb } from "@/lib/db";
import { projects, compositions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const config = (await req.json()) as ComposeConfig;

    if (!config.projectId || !config.clips || config.clips.length === 0) {
      return NextResponse.json(
        { error: "缺少必要参数：projectId 和 clips" },
        { status: 400 }
      );
    }

    // 更新项目状态为 composing
    const db = getDb();
    await db
      .update(projects)
      .set({ status: "composing", updatedAt: new Date() })
      .where(eq(projects.id, config.projectId));

    // 执行视频合成
    const outputPath = await composeVideo(config);

    if (!outputPath) {
      await db
        .update(projects)
        .set({ status: "video", updatedAt: new Date() })
        .where(eq(projects.id, config.projectId));

      return NextResponse.json(
        { error: "视频合成失败：未生成输出文件" },
        { status: 500 }
      );
    }

    // 计算总时长（毫秒）
    const totalDurationMs = config.clips.reduce(
      (sum, clip) => sum + clip.duration * 1000,
      0
    );

    // 保存到 compositions 表
    await db.insert(compositions).values({
      projectId: config.projectId,
      outputPath,
      resolution: config.output.resolution,
      aspectRatio: config.output.aspectRatio,
      duration: totalDurationMs,
      bgmPath: config.output.bgmPath,
      subtitleStyle: config.subtitle
        ? {
            fontFamily: config.subtitle.fontFamily || "sans-serif",
            fontSize: config.subtitle.fontSize || 36,
            color: config.subtitle.color || "white",
            strokeColor: config.subtitle.strokeColor || "black",
            strokeWidth: config.subtitle.strokeWidth || 2,
            position: config.subtitle.position || "bottom",
          }
        : undefined,
      status: "done",
    });

    // 更新项目状态为 done
    await db
      .update(projects)
      .set({
        status: "done",
        updatedAt: new Date(),
      })
      .where(eq(projects.id, config.projectId));

    return NextResponse.json({ outputPath });
  } catch (error) {
    console.error("视频合成失败:", error);

    // 恢复项目状态
    try {
      const body = await req.clone().json();
      const db = getDb();
      await db
        .update(projects)
        .set({ status: "video", updatedAt: new Date() })
        .where(eq(projects.id, body.projectId));
    } catch {
      // ignore
    }

    const message =
      error instanceof Error ? error.message : "视频合成过程中发生未知错误";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
