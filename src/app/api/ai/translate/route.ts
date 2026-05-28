/**
 * 视频翻译 API 路由
 *
 * POST /api/ai/translate
 *
 * 功能流程：
 *   1. 接收视频 URL + 源字幕文本 + 目标语言代码
 *   2. 调用 LLM 将字幕文本翻译为目标语言（支持上下文感知的高质量翻译）
 *   3. 调用 TTS 合成目标语言配音音频
 *   4. 生成目标语言的 SRT 字幕文件
 *   5. 返回翻译结果（译文、字幕 SRT、配音 URL 等）
 *
 * 支持语言：zh（中文）、en（英文）、ja（日语）、ko（韩语）、th（泰语）、vi（越南语）
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  generateSubtitles,
  type SubtitleStyle,
} from "@/lib/utils/subtitles";

// ==================== 类型定义 ====================

/** 支持的目标语言代码 */
type TargetLanguage = "zh" | "en" | "ja" | "ko" | "th" | "vi";

/** LLM 配置（兼容 OpenAI 格式） */
interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** TTS 配置 */
interface TTSConfig {
  /** TTS 服务 API 地址（默认 SiliconFlow） */
  baseUrl: string;
  /** API Key */
  apiKey: string;
  /** TTS 模型名称 */
  model: string;
  /** 音色 ID */
  voiceId: string;
}

/** 字幕段（单条字幕） */
interface SubtitleEntry {
  /** 字幕文本 */
  text: string;
  /** 起始时间（秒） */
  startTime: number;
  /** 结束时间（秒） */
  endTime: number;
}

// ==================== 语言配置 ====================

/** 语言信息映射 */
const LANGUAGE_MAP: Record<
  TargetLanguage,
  { name: string; nativeName: string; ttsLocale: string; charsPerSec: number }
> = {
  zh: {
    name: "Chinese",
    nativeName: "中文",
    ttsLocale: "zh-CN",
    charsPerSec: 4,
  },
  en: {
    name: "English",
    nativeName: "English",
    ttsLocale: "en-US",
    charsPerSec: 3.5,
  },
  ja: {
    name: "Japanese",
    nativeName: "日本語",
    ttsLocale: "ja-JP",
    charsPerSec: 3.5,
  },
  ko: {
    name: "Korean",
    nativeName: "한국어",
    ttsLocale: "ko-KR",
    charsPerSec: 3.5,
  },
  th: {
    name: "Thai",
    nativeName: "ภาษาไทย",
    ttsLocale: "th-TH",
    charsPerSec: 3,
  },
  vi: {
    name: "Vietnamese",
    nativeName: "Tiếng Việt",
    ttsLocale: "vi-VN",
    charsPerSec: 3,
  },
};

const VALID_LANGUAGES = Object.keys(LANGUAGE_MAP) as TargetLanguage[];

// ==================== 翻译 Prompt ====================

const TRANSLATION_SYSTEM_PROMPT = `你是一位专业的视频字幕翻译专家，精通中、英、日、韩、泰、越六种语言。

【核心能力】
1. 语境感知：理解电商/短视频/直播的语境，翻译要贴合目标市场的表达习惯
2. 口语化表达：译文要自然流畅，适合配音朗读，避免生硬的直译
3. 文化适配：将源语言的文化元素、梗、语气词转换为目标语言的等效表达
4. 语气保留：保留原文的情绪色彩（兴奋、紧迫感、亲切感等）
5. 长度控制：译文长度尽量与原文接近，避免配音时长偏差过大

【翻译原则】
- 电商场景专用术语要准确：如"种草"→"种草/おすすめ/추천"等
- 语气词要本地化：如"真的绝了！"→"Absolutely amazing!" / "マジで最高！"
- 品牌名、专有名词保持原样，不翻译
- 数字、价格保持原格式
- 翻译要适配短视频语速，句子简短有力

【输出要求】
严格按照 JSON 格式输出，不要输出任何额外的解释文字。`;

/**
 * 构建翻译 User Prompt
 */
function buildTranslationPrompt(
  subtitles: SubtitleEntry[],
  sourceLang: string,
  targetLang: TargetLanguage,
): string {
  const langInfo = LANGUAGE_MAP[targetLang];

  const subtitleBlock = subtitles
    .map(
      (s, i) =>
        `[${i + 1}] (${s.startTime.toFixed(1)}s - ${s.endTime.toFixed(1)}s) ${s.text}`,
    )
    .join("\n");

  return `请将以下视频字幕从 ${sourceLang} 翻译为 ${langInfo.name}（${langInfo.nativeName}）。

【原文】
${subtitleBlock}

【输出格式】
请严格按照以下 JSON 格式输出，不要包含任何 markdown 代码块标记或额外文字：

{
  "translatedSubtitles": [
    {
      "index": 1,
      "originalText": "原文文本",
      "translatedText": "翻译后的文本",
      "startTime": 0.0,
      "endTime": 3.0
    }
  ],
  "fullTranslatedText": "所有翻译文本拼接成的完整文本（用句号或空格分隔）",
  "summary": "翻译概要说明（50字以内）"
}

注意事项：
1. translatedText 要自然流畅，适合配音朗读
2. 保持原文的时间轴不变（startTime / endTime）
3. fullTranslatedText 是将所有段落翻译自然串联的完整文本，用于 TTS 合成
4. 逐段翻译，不要跳过或合并任何段落
5. 翻译长度尽量与原文接近`;
}

// ==================== TTS 工具函数 ====================

/**
 * 调用 TTS API 合成语音
 * 使用 SiliconFlow / OpenAI 兼容格式
 */
async function synthesizeSpeech(
  text: string,
  config: TTSConfig,
  language: TargetLanguage,
): Promise<{ audioUrl: string; duration: number }> {
  const langInfo = LANGUAGE_MAP[language];

  const response = await fetch(`${config.baseUrl}/v1/audio/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: text,
      voice: config.voiceId,
      response_format: "mp3",
      speed: 1.0,
      // 部分平台支持语言参数
      language: langInfo.ttsLocale,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `TTS 合成失败: ${response.status} ${response.statusText} - ${errorBody}`,
    );
  }

  // 将音频转为 base64 data URL 或上传后获取 URL
  const audioBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(audioBuffer).toString("base64");
  const audioUrl = `data:audio/mpeg;base64,${base64}`;

  // 估算音频时长（基于文本长度和语速）
  const readableChars = text.replace(
    /[，。！？、；：,.:;!?…—\-\s]/g,
    "",
  ).length;
  const estimatedDuration = Math.max(1, readableChars / langInfo.charsPerSec);

  return {
    audioUrl,
    duration: estimatedDuration,
  };
}

// ==================== 工具函数 ====================

/** 创建 OpenAI 兼容 LLM 客户端 */
function createLLMClient(config: LLMConfig): OpenAI {
  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });
}

/**
 * 从 LLM 返回的文本中提取 JSON
 */
function extractJSON(text: string): string {
  // 移除 markdown 代码块标记
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 找到第一个 { 或 [ 开头的 JSON
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  return text.trim();
}

// ==================== API Route ====================

/**
 * POST /api/ai/translate
 *
 * 视频字幕翻译 + TTS 配音合成 API
 *
 * 请求体：
 * - videoUrl: string            视频 URL（必填）
 * - sourceText: string          源字幕文本（必填，整段文本或 SRT 格式）
 * - subtitles?: SubtitleEntry[] 源字幕分段（可选，传入则保留时间轴）
 * - sourceLanguage?: string     源语言描述（可选，默认 "中文"）
 * - targetLanguage: string      目标语言代码（必填，zh/en/ja/ko/th/vi）
 * - llmConfig: LLMConfig        LLM 配置（必填）
 * - ttsConfig?: TTSConfig       TTS 配置（可选，不传则跳过 TTS 合成）
 * - ttsEnabled?: boolean        是否启用 TTS（默认 true，需同时提供 ttsConfig）
 * - subtitleStyle?: string      字幕样式（可选，default/bold/outline）
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "请求体不是合法 JSON" },
      { status: 400 },
    );
  }

  const {
    videoUrl,
    sourceText,
    subtitles,
    sourceLanguage,
    targetLanguage,
    llmConfig,
    ttsConfig,
    ttsEnabled,
    subtitleStyle,
  } = body as {
    videoUrl?: string;
    sourceText?: string;
    subtitles?: SubtitleEntry[];
    sourceLanguage?: string;
    targetLanguage?: string;
    llmConfig?: LLMConfig;
    ttsConfig?: TTSConfig;
    ttsEnabled?: boolean;
    subtitleStyle?: string;
  };

  // ===== 参数校验 =====

  if (!videoUrl || typeof videoUrl !== "string") {
    return NextResponse.json(
      { error: "请提供视频 URL（videoUrl）" },
      { status: 400 },
    );
  }

  if (!sourceText || typeof sourceText !== "string") {
    return NextResponse.json(
      { error: "请提供源字幕文本（sourceText）" },
      { status: 400 },
    );
  }

  if (
    !targetLanguage ||
    !VALID_LANGUAGES.includes(targetLanguage as TargetLanguage)
  ) {
    return NextResponse.json(
      {
        error: `请指定目标语言（targetLanguage），可选值：${VALID_LANGUAGES.map((l) => `${l}（${LANGUAGE_MAP[l].nativeName}）`).join("、")}`,
      },
      { status: 400 },
    );
  }

  if (!llmConfig?.baseUrl || !llmConfig?.apiKey || !llmConfig?.model) {
    return NextResponse.json(
      {
        error:
          "请配置 LLM 参数（llmConfig.baseUrl、llmConfig.apiKey、llmConfig.model）",
      },
      { status: 400 },
    );
  }

  const target = targetLanguage as TargetLanguage;
  const langInfo = LANGUAGE_MAP[target];
  const shouldUseTTS = ttsEnabled !== false && ttsConfig?.apiKey;

  // 准备字幕条目（如果有分段则用分段，否则将整段文本作为单条）
  const subtitleEntries: SubtitleEntry[] =
    subtitles && subtitles.length > 0
      ? subtitles
      : [{ text: sourceText.trim(), startTime: 0, endTime: 0 }];

  // ===== Step 1: LLM 翻译字幕 =====

  let translationResult: {
    translatedSubtitles: {
      index: number;
      originalText: string;
      translatedText: string;
      startTime: number;
      endTime: number;
    }[];
    fullTranslatedText: string;
    summary: string;
  };

  try {
    const client = createLLMClient(llmConfig);
    const srcLang = sourceLanguage || "中文";

    const userPrompt = buildTranslationPrompt(subtitleEntries, srcLang, target);

    const response = await client.chat.completions.create({
      model: llmConfig.model,
      messages: [
        { role: "system", content: TRANSLATION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM 未返回有效翻译内容");
    }

    const jsonStr = extractJSON(content);

    try {
      translationResult = JSON.parse(jsonStr);
    } catch {
      throw new Error(
        `LLM 返回的翻译结果不是合法 JSON: ${jsonStr.substring(0, 300)}`,
      );
    }

    // 校验翻译结果结构
    if (
      !Array.isArray(translationResult.translatedSubtitles) ||
      translationResult.translatedSubtitles.length === 0
    ) {
      throw new Error("LLM 翻译结果格式不正确：缺少 translatedSubtitles 数组");
    }
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "LLM 翻译失败";
    console.error("[视频翻译API] LLM 翻译错误:", msg);
    return NextResponse.json(
      { error: `翻译失败：${msg}` },
      { status: 500 },
    );
  }

  // ===== Step 2: 生成目标语言 SRT 字幕 =====

  const fullText = translationResult.fullTranslatedText;
  const translatedSubtitles = translationResult.translatedSubtitles;

  // 使用项目已有的字幕工具生成 SRT
  const srtResult = generateSubtitles({
    text: fullText,
    charsPerSec: langInfo.charsPerSec,
    maxCharsPerLine: target === "zh" ? 15 : 25, // 非中文语言每行可容纳更多字符
    style: (subtitleStyle as SubtitleStyle) || "default",
    startOffset: 0,
    gap: 0.2,
  });

  // 如果有原始时间轴，尝试将翻译后的字幕对齐到原始时间轴
  const alignedSubtitles = translatedSubtitles.map((ts, i) => {
    const original = subtitleEntries[i];
    return {
      index: ts.index,
      originalText: ts.originalText,
      translatedText: ts.translatedText,
      startTime: original?.startTime ?? ts.startTime,
      endTime: original?.endTime ?? ts.endTime,
    };
  });

  // ===== Step 3: TTS 配音合成（可选） =====

  let ttsResult: { audioUrl: string; duration: number } | null = null;

  if (shouldUseTTS && fullText && ttsConfig) {
    try {
      ttsResult = await synthesizeSpeech(fullText, ttsConfig, target);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "TTS 合成失败";
      console.error("[视频翻译API] TTS 合成错误:", msg);
      // TTS 失败不阻断整体流程，返回警告
      return NextResponse.json({
        success: true,
        warning: `翻译成功，但 TTS 配音合成失败：${msg}`,
        videoUrl,
        targetLanguage: target,
        targetLanguageName: langInfo.nativeName,
        translatedSubtitles: alignedSubtitles,
        fullTranslatedText: fullText,
        translationSummary: translationResult.summary,
        srt: srtResult.srt,
        srtSegments: srtResult.segments,
        srtTotalDuration: srtResult.totalDuration,
        ttsAudioUrl: null,
        ttsDuration: null,
      });
    }
  }

  // ===== Step 4: 返回结果 =====

  return NextResponse.json({
    success: true,
    videoUrl,
    targetLanguage: target,
    targetLanguageName: langInfo.nativeName,
    translatedSubtitles: alignedSubtitles,
    fullTranslatedText: fullText,
    translationSummary: translationResult.summary,
    srt: srtResult.srt,
    srtSegments: srtResult.segments,
    srtTotalDuration: srtResult.totalDuration,
    ttsAudioUrl: ttsResult?.audioUrl ?? null,
    ttsDuration: ttsResult?.duration ?? null,
  });
}

/**
 * GET /api/ai/translate
 *
 * 查询支持的翻译语言列表
 */
export async function GET() {
  const languages = VALID_LANGUAGES.map((code) => ({
    code,
    name: LANGUAGE_MAP[code].name,
    nativeName: LANGUAGE_MAP[code].nativeName,
    locale: LANGUAGE_MAP[code].ttsLocale,
  }));

  return NextResponse.json({
    supportedLanguages: languages,
    totalLanguages: languages.length,
  });
}
