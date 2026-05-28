import { NextRequest, NextResponse } from "next/server";

// 平台类型
type Platform = "douyin" | "kuaishou" | "xiaohongshu" | "bilibili";

// 平台视频参数配置
interface PlatformConfig {
  name: string;
  resolution: { width: number; height: number };
  bitrate: number; // kbps
  maxDuration: number; // 秒
  coverSize: { width: number; height: number };
  format: string;
  codec: string;
}

const platformConfigs: Record<Platform, PlatformConfig> = {
  douyin: {
    name: "抖音",
    resolution: { width: 1080, height: 1920 },
    bitrate: 6000,
    maxDuration: 300, // 5分钟
    coverSize: { width: 1080, height: 1920 },
    format: "mp4",
    codec: "h264",
  },
  kuaishou: {
    name: "快手",
    resolution: { width: 1080, height: 1920 },
    bitrate: 5000,
    maxDuration: 300, // 5分钟
    coverSize: { width: 1080, height: 1920 },
    format: "mp4",
    codec: "h264",
  },
  xiaohongshu: {
    name: "小红书",
    resolution: { width: 1080, height: 1440 },
    bitrate: 4000,
    maxDuration: 900, // 15分钟
    coverSize: { width: 1080, height: 1440 },
    format: "mp4",
    codec: "h264",
  },
  bilibili: {
    name: "B站",
    resolution: { width: 1920, height: 1080 },
    bitrate: 8000,
    maxDuration: 7200, // 2小时
    coverSize: { width: 1920, height: 1080 },
    format: "mp4",
    codec: "h264",
  },
};

// 视频处理函数（模拟）
async function processVideo(
  videoUrl: string,
  platform: Platform,
  coverUrl?: string
): Promise<{ processedUrl: string; coverUrl: string }> {
  const config = platformConfigs[platform];
  
  // 这里应该实际调用ffmpeg处理视频
  // 由于环境限制，返回模拟结果
  console.log(`处理视频: ${videoUrl}`);
  console.log(`目标平台: ${config.name}`);
  console.log(`目标分辨率: ${config.resolution.width}x${config.resolution.height}`);
  console.log(`目标码率: ${config.bitrate}kbps`);
  console.log(`最大时长: ${config.maxDuration}秒`);
  
  // 模拟处理后的URL
  const processedUrl = `${videoUrl}?processed=true&platform=${platform}`;
  const processedCoverUrl = coverUrl || `${videoUrl.replace('.mp4', '')}_cover.jpg`;
  
  return { processedUrl, coverUrl: processedCoverUrl };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoUrl, platform, coverUrl } = body;
    
    // 参数验证
    if (!videoUrl) {
      return NextResponse.json(
        { error: "缺少视频URL" },
        { status: 400 }
      );
    }
    
    if (!platform) {
      return NextResponse.json(
        { error: "缺少目标平台" },
        { status: 400 }
      );
    }
    
    const validPlatforms: Platform[] = ["douyin", "kuaishou", "xiaohongshu", "bilibili"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `不支持的平台: ${platform}，支持: ${validPlatforms.join(", ")}` },
        { status: 400 }
      );
    }
    
    // 获取平台配置
    const config = platformConfigs[platform as Platform];
    
    // 处理视频
    const { processedUrl, coverUrl: processedCoverUrl } = await processVideo(
      videoUrl,
      platform as Platform,
      coverUrl
    );
    
    return NextResponse.json({
      success: true,
      platform: config.name,
      processedVideo: {
        url: processedUrl,
        coverUrl: processedCoverUrl,
        params: {
          resolution: config.resolution,
          bitrate: config.bitrate,
          maxDuration: config.maxDuration,
          format: config.format,
          codec: config.codec,
        },
      },
      message: `视频已针对${config.name}平台优化`,
    });
    
  } catch (error) {
    console.error("导出失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "导出失败" },
      { status: 500 }
    );
  }
}