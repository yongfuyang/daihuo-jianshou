/**
 * 视频后处理工具集
 * 基于 ffmpeg 命令行封装的视频后处理能力，包括水印、片头片尾、字幕叠加、裁剪和合并。
 *
 * 所有函数接收输入路径与配置参数，返回输出文件路径。
 * 内部统一通过 child_process.execFile 调用系统 ffmpeg。
 */

import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// 公共类型
// ---------------------------------------------------------------------------

export interface WatermarkOptions {
  /** 水印文字内容 */
  text: string;
  /** 输出文件路径 */
  outputPath: string;
  /** 字体大小，默认 24 */
  fontSize?: number;
  /** 字体颜色，默认 white */
  fontColor?: string;
  /** 水印位置，使用 ffmpeg drawtext 的 x / y 表达式。默认右下角 */
  x?: string;
  y?: string;
  /** 字体文件路径（可选，使用系统默认字体时留空） */
  fontFile?: string;
  /** 透明度 0~1，默认 0.7 */
  opacity?: number;
}

export interface IntroOutroOptions {
  /** 片头视频路径 */
  introPath?: string;
  /** 片尾视频路径 */
  outroPath?: string;
  /** 输出文件路径 */
  outputPath: string;
  /** 过渡类型：直接拼接或添加交叉淡入淡出，默认 cut */
  transition?: "cut" | "crossfade";
  /** crossfade 时的过渡时长（秒），默认 1 */
  crossfadeDuration?: number;
}

export interface SubtitleOptions {
  /** SRT 字幕文件路径 */
  srtPath: string;
  /** 输出文件路径 */
  outputPath: string;
  /** 字幕样式（ASS style 字符串），可选 */
  style?: string;
  /** 字幕字体大小，默认 24 */
  fontSize?: number;
  /** 字幕字体颜色，默认 &H00FFFFFF（白色） */
  fontColor?: string;
}

export interface CropOptions {
  /** 目标宽度（像素） */
  width: number;
  /** 目标高度（像素） */
  height: number;
  /** 输出文件路径 */
  outputPath: string;
  /** 裁剪起始 X 偏移，默认居中 */
  x?: number;
  /** 裁剪起始 Y 偏移，默认居中 */
  y?: number;
}

export interface MergeOptions {
  /** 要合并的视频路径列表（按顺序） */
  videoPaths: string[];
  /** 输出文件路径 */
  outputPath: string;
  /** 合并方式：concat（同编码直接拼接）或 transcode（重新编码拼接），默认 concat */
  mode?: "concat" | "transcode";
}

// ---------------------------------------------------------------------------
// 内部工具函数
// ---------------------------------------------------------------------------

/**
 * 检查 ffmpeg 是否可用
 */
async function ensureFfmpeg(): Promise<void> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
  } catch {
    throw new Error(
      "ffmpeg 未安装或不在 PATH 中，请先安装 ffmpeg 后再使用视频后处理工具。"
    );
  }
}

/**
 * 获取视频的宽度和高度
 */
async function getVideoSize(
  filePath: string
): Promise<{ width: number; height: number }> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0:s=x",
    filePath,
  ]);
  const [w, h] = stdout.trim().split("x").map(Number);
  if (!w || !h) throw new Error(`无法获取视频尺寸: ${filePath}`);
  return { width: w, height: h };
}

/**
 * 转义 ffmpeg drawtext 中的特殊字符
 */
function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "'\\\\\\''")
    .replace(/:/g, "\\\\:")
    .replace(/%/g, "%%");
}

// ---------------------------------------------------------------------------
// 1. addWatermark —— 视频加水印文字
// ---------------------------------------------------------------------------

/**
 * 在视频上叠加水印文字。
 *
 * @param inputPath  输入视频路径
 * @param options    水印配置
 * @returns          输出文件路径
 *
 * @example
 * ```ts
 * await addWatermark("input.mp4", {
 *   text: "© 2024 DaiHuo",
 *   outputPath: "output.mp4",
 *   fontSize: 32,
 *   fontColor: "white",
 *   x: "W-tw-20",
 *   y: "H-th-20",
 *   opacity: 0.8,
 * });
 * ```
 */
export async function addWatermark(
  inputPath: string,
  options: WatermarkOptions
): Promise<string> {
  await ensureFfmpeg();

  const {
    text,
    outputPath,
    fontSize = 24,
    fontColor = "white",
    x = "W-tw-20",
    y = "H-th-20",
    fontFile,
    opacity = 0.7,
  } = options;

  const escapedText = escapeDrawText(text);
  const fontPart = fontFile ? `fontfile='${fontFile}':` : "";

  const drawtextFilter =
    `drawtext=${fontPart}` +
    `text='${escapedText}':` +
    `fontsize=${fontSize}:` +
    `fontcolor=${fontColor}@${opacity}:` +
    `x=${x}:` +
    `y=${y}`;

  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vf",
    drawtextFilter,
    "-codec:a",
    "copy",
    outputPath,
  ]);

  return outputPath;
}

// ---------------------------------------------------------------------------
// 2. addIntroOutro —— 加片头片尾视频
// ---------------------------------------------------------------------------

/**
 * 为主视频添加片头和/或片尾。
 *
 * 当 transition 为 "crossfade" 时，会在片头→主视频、主视频→片尾之间
 * 添加指定时长的交叉淡入淡出过渡；为 "cut" 时直接拼接。
 *
 * @param inputPath  主视频路径
 * @param options    片头片尾配置
 * @returns          输出文件路径
 *
 * @example
 * ```ts
 * await addIntroOutro("main.mp4", {
 *   introPath: "intro.mp4",
 *   outroPath: "outro.mp4",
 *   outputPath: "final.mp4",
 *   transition: "crossfade",
 *   crossfadeDuration: 1,
 * });
 * ```
 */
export async function addIntroOutro(
  inputPath: string,
  options: IntroOutroOptions
): Promise<string> {
  await ensureFfmpeg();

  const {
    introPath,
    outroPath,
    outputPath,
    transition = "cut",
    crossfadeDuration = 1,
  } = options;

  if (!introPath && !outroPath) {
    throw new Error("至少需要提供 introPath 或 outroPath 之一");
  }

  const segments: string[] = [];
  const tmpFiles: string[] = [];

  const tmpDir = path.join(
    path.dirname(outputPath),
    `.tmp-${Date.now()}`
  );
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    // --- 辅助：统一转为相同编码的中间文件以确保 concat 兼容 ---
    async function normalize(file: string, index: number): Promise<string> {
      const out = path.join(tmpDir, `seg_${index}.ts`);
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        file,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-f",
        "mpegts",
        out,
      ]);
      tmpFiles.push(out);
      return out;
    }

    if (transition === "cut") {
      // ---- 直接拼接模式 ----
      let idx = 0;
      if (introPath) segments.push(await normalize(introPath, idx++));
      segments.push(await normalize(inputPath, idx++));
      if (outroPath) segments.push(await normalize(outroPath, idx++));

      const concatList = segments.map((f) => `file '${f}'`).join("\n");
      const listFile = path.join(tmpDir, "concat.txt");
      await fs.writeFile(listFile, concatList, "utf-8");

      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listFile,
        "-c",
        "copy",
        outputPath,
      ]);
    } else {
      // ---- crossfade 模式 ----
      // 需要逐步 xfade 叠加，最多涉及 3 段（intro + main + outro）
      const files: string[] = [];
      if (introPath) files.push(introPath);
      files.push(inputPath);
      if (outroPath) files.push(outroPath);

      // 获取各段时长
      const durations: number[] = [];
      for (const f of files) {
        const { stdout } = await execFileAsync("ffprobe", [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "csv=p=0",
          f,
        ]);
        durations.push(parseFloat(stdout.trim()));
      }

      if (files.length === 2) {
        // 两段：一次 xfade
        const offset = durations[0] - crossfadeDuration;
        await execFileAsync("ffmpeg", [
          "-y",
          "-i",
          files[0],
          "-i",
          files[1],
          "-filter_complex",
          `[0:v][1:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset.toFixed(3)},format=yuv420p[v];` +
            `[0:a][1:a]acrossfade=d=${crossfadeDuration}[a]`,
          "-map",
          "[v]",
          "-map",
          "[a]",
          outputPath,
        ]);
      } else {
        // 三段：先合并 intro+main，再合并结果+outro
        const tmpMerge = path.join(tmpDir, "merge_step.mp4");
        const offset1 = durations[0] - crossfadeDuration;
        await execFileAsync("ffmpeg", [
          "-y",
          "-i",
          files[0],
          "-i",
          files[1],
          "-filter_complex",
          `[0:v][1:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset1.toFixed(3)},format=yuv420p[v];` +
            `[0:a][1:a]acrossfade=d=${crossfadeDuration}[a]`,
          "-map",
          "[v]",
          "-map",
          "[a]",
          tmpMerge,
        ]);
        tmpFiles.push(tmpMerge);

        // 合并后获取中间文件时长
        const { stdout: durOut } = await execFileAsync("ffprobe", [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "csv=p=0",
          tmpMerge,
        ]);
        const mergeDur = parseFloat(durOut.trim());

        const offset2 = mergeDur - crossfadeDuration;
        await execFileAsync("ffmpeg", [
          "-y",
          "-i",
          tmpMerge,
          "-i",
          files[2],
          "-filter_complex",
          `[0:v][1:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset2.toFixed(3)},format=yuv420p[v];` +
            `[0:a][1:a]acrossfade=d=${crossfadeDuration}[a]`,
          "-map",
          "[v]",
          "-map",
          "[a]",
          outputPath,
        ]);
      }
    }
  } finally {
    // 清理临时目录
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  return outputPath;
}

// ---------------------------------------------------------------------------
// 3. addSubtitles —— 叠加 SRT 字幕到视频
// ---------------------------------------------------------------------------

/**
 * 将 SRT 字幕文件烧录（硬字幕）到视频中。
 *
 * @param inputPath  输入视频路径
 * @param options    字幕配置
 * @returns          输出文件路径
 *
 * @example
 * ```ts
 * await addSubtitles("input.mp4", {
 *   srtPath: "subtitle.srt",
 *   outputPath: "output.mp4",
 *   fontSize: 28,
 *   fontColor: "&H0000FFFF", // ASS 格式黄色
 * });
 * ```
 */
export async function addSubtitles(
  inputPath: string,
  options: SubtitleOptions
): Promise<string> {
  await ensureFfmpeg();

  const {
    srtPath,
    outputPath,
    style,
    fontSize = 24,
    fontColor = "&H00FFFFFF",
  } = options;

  // 验证字幕文件存在
  await fs.access(srtPath).catch(() => {
    throw new Error(`SRT 字幕文件不存在: ${srtPath}`);
  });

  const srtAbsPath = path.resolve(srtPath);

  // 使用 subtitles 滤镜，可选 force_style
  const defaultStyle = `FontSize=${fontSize},PrimaryColour=${fontColor},Outline=2,Shadow=1`;
  const forceStyle = style ?? defaultStyle;

  // 转义路径中的特殊字符（Windows 兼容）
  const escapedPath = srtAbsPath
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:");

  const subtitlesFilter = `subtitles='${escapedPath}':force_style='${forceStyle}'`;

  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vf",
    subtitlesFilter,
    "-c:a",
    "copy",
    outputPath,
  ]);

  return outputPath;
}

// ---------------------------------------------------------------------------
// 4. cropToSize —— 裁剪到指定尺寸比例
// ---------------------------------------------------------------------------

/**
 * 将视频裁剪到指定宽高尺寸。
 *
 * 当不指定 x / y 时，默认居中裁剪。
 * 若源视频尺寸小于目标尺寸，会先用 scale 放大到满足裁剪区域再裁剪。
 *
 * @param inputPath  输入视频路径
 * @param options    裁剪配置
 * @returns          输出文件路径
 *
 * @example
 * ```ts
 * // 裁剪为 9:16 竖屏（1080×1920）
 * await cropToSize("input.mp4", {
 *   width: 1080,
 *   height: 1920,
 *   outputPath: "vertical.mp4",
 * });
 * ```
 */
export async function cropToSize(
  inputPath: string,
  options: CropOptions
): Promise<string> {
  await ensureFfmpeg();

  const { width, height, outputPath, x, y } = options;

  const srcSize = await getVideoSize(inputPath);

  // 如果源尺寸不足，需要先放大
  const needScale = srcSize.width < width || srcSize.height < height;

  // 计算 crop 区域
  const cropX = x ?? Math.max(0, Math.floor((srcSize.width - width) / 2));
  const cropY = y ?? Math.max(0, Math.floor((srcSize.height - height) / 2));

  let videoFilter: string;

  if (needScale) {
    // 先缩放使短边至少等于目标尺寸，再居中裁剪
    // 计算缩放后的尺寸（保持宽高比，保证覆盖目标）
    const scaleX = width / srcSize.width;
    const scaleY = height / srcSize.height;
    const scale = Math.max(scaleX, scaleY);

    const scaledW = Math.ceil(srcSize.width * scale);
    const scaledH = Math.ceil(srcSize.height * scale);

    // 确保缩放后宽高为偶数（libx264 要求）
    const scaledWEven = scaledW % 2 === 0 ? scaledW : scaledW + 1;
    const scaledHEven = scaledH % 2 === 0 ? scaledH : scaledH + 1;

    const autoCropX = Math.floor((scaledWEven - width) / 2);
    const autoCropY = Math.floor((scaledHEven - height) / 2);

    const finalX = x ?? autoCropX;
    const finalY = y ?? autoCropY;

    videoFilter =
      `scale=${scaledWEven}:${scaledHEven},` +
      `crop=${width}:${height}:${finalX}:${finalY}`;
  } else {
    videoFilter = `crop=${width}:${height}:${cropX}:${cropY}`;
  }

  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vf",
    videoFilter,
    "-c:a",
    "copy",
    outputPath,
  ]);

  return outputPath;
}

// ---------------------------------------------------------------------------
// 5. mergeVideos —— 合并多个视频片段
// ---------------------------------------------------------------------------

/**
 * 按顺序合并多个视频片段。
 *
 * - mode = "concat"（默认）：要求所有输入编码参数一致，直接拼接，速度快。
 * - mode = "transcode"：先统一转码为相同规格再拼接，兼容不同来源的视频。
 *
 * @param options  合并配置
 * @returns        输出文件路径
 *
 * @example
 * ```ts
 * await mergeVideos({
 *   videoPaths: ["part1.mp4", "part2.mp4", "part3.mp4"],
 *   outputPath: "merged.mp4",
 *   mode: "transcode",
 * });
 * ```
 */
export async function mergeVideos(options: MergeOptions): Promise<string> {
  await ensureFfmpeg();

  const { videoPaths, outputPath, mode = "concat" } = options;

  if (videoPaths.length === 0) {
    throw new Error("至少需要一个视频文件");
  }
  if (videoPaths.length === 1) {
    // 单文件直接复制
    await fs.copyFile(videoPaths[0], outputPath);
    return outputPath;
  }

  const tmpDir = path.join(
    path.dirname(outputPath),
    `.tmp-merge-${Date.now()}`
  );
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    if (mode === "concat") {
      // --- concat demuxer 模式 ---
      const concatList = videoPaths
        .map((f) => `file '${path.resolve(f)}'`)
        .join("\n");
      const listFile = path.join(tmpDir, "concat.txt");
      await fs.writeFile(listFile, concatList, "utf-8");

      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listFile,
        "-c",
        "copy",
        outputPath,
      ]);
    } else {
      // --- transcode 模式：统一转为 mpegts 再 concat ---
      const tsFiles: string[] = [];

      for (let i = 0; i < videoPaths.length; i++) {
        const tsPath = path.join(tmpDir, `part_${i}.ts`);
        await execFileAsync("ffmpeg", [
          "-y",
          "-i",
          videoPaths[i],
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "18",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-f",
          "mpegts",
          tsPath,
        ]);
        tsFiles.push(tsPath);
      }

      const concatList = tsFiles.map((f) => `file '${f}'`).join("\n");
      const listFile = path.join(tmpDir, "concat.txt");
      await fs.writeFile(listFile, concatList, "utf-8");

      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listFile,
        "-c",
        "copy",
        outputPath,
      ]);
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  return outputPath;
}

// ---------------------------------------------------------------------------
// 聚合导出
// ---------------------------------------------------------------------------

const videoPostprocess = {
  addWatermark,
  addIntroOutro,
  addSubtitles,
  cropToSize,
  mergeVideos,
};

export default videoPostprocess;
