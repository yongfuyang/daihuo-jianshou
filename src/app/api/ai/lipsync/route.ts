/**
 * 唇形同步 API 路由
 * POST /api/ai/lipsync - 提交唇形同步任务
 * GET  /api/ai/lipsync - 查询任务状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { SiliconFlowLipSync } from '@/lib/providers/lipsync';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { avatarUrl, audioUrl, text, resolution, addSubtitles, apiKey } = body;

    if (!avatarUrl) {
      return NextResponse.json({ error: '请提供形象图片' }, { status: 400 });
    }
    if (!audioUrl) {
      return NextResponse.json({ error: '请提供 TTS 音频' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: '请先配置 API Key' }, { status: 400 });
    }

    const ls = new SiliconFlowLipSync({ apiKey });

    const result = await ls.submitTask({
      avatarUrl,
      audioUrl,
      text,
      resolution: resolution || '720p',
      addSubtitles: addSubtitles ?? true,
    });

    return NextResponse.json({
      success: true,
      taskId: result.taskId,
      estimatedTime: result.estimatedTime,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '唇形同步失败';
    console.error('[唇形同步API] 错误:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');
    const apiKey = url.searchParams.get('apiKey') || '';

    if (!taskId) {
      return NextResponse.json({ error: '缺少 taskId' }, { status: 400 });
    }

    const ls = new SiliconFlowLipSync({ apiKey });
    const status = await ls.getTaskStatus(taskId);
    return NextResponse.json(status);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
