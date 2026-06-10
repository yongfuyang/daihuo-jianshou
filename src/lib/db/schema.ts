import { mysqlTable, varchar, text, int, datetime, json, boolean } from "drizzle-orm/mysql-core";

// 项目表
export const projects = mysqlTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  productName: varchar("product_name", { length: 500 }),
  productCategory: varchar("product_category", { length: 100 }),
  productDescription: text("product_description"),
  productImages: json("product_images").$type<string[]>().default([]),
  productAnalysis: text("product_analysis"),
  productId: varchar("product_id", { length: 36 }),
  brandId: varchar("brand_id", { length: 36 }),
  templateId: varchar("template_id", { length: 36 }),
  videoMode: varchar("video_mode", { length: 50 }).default("product_closeup"),
  sourceType: varchar("source_type", { length: 50 }).default("manual"),
  sourceVideoUrl: text("source_video_url"),
  characterId: varchar("character_id", { length: 36 }),
  createdAt: datetime("created_at").$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()),
});

// 脚本表
export const scripts = mysqlTable("scripts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(1),
  styleType: varchar("style_type", { length: 100 }).notNull().default("custom"),
  title: varchar("title", { length: 500 }),
  totalDuration: int("total_duration"),
  shots: json("shots").$type<Shot[]>().default([]),
  selected: boolean("selected").default(false),
  createdAt: datetime("created_at").$defaultFn(() => new Date()),
});

// 素材表
export const assets = mysqlTable("assets", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotId: int("shot_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  filePath: text("file_path"),
  thumbnailPath: text("thumbnail_path"),
  provider: varchar("provider", { length: 100 }),
  model: varchar("model", { length: 100 }),
  prompt: text("prompt"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()),
});

// 视频片段表
export const videoClips = mysqlTable("video_clips", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotId: int("shot_id").notNull(),
  assetId: varchar("asset_id", { length: 36 }).references(() => assets.id),
  filePath: text("file_path"),
  duration: int("duration"),
  provider: varchar("provider", { length: 100 }),
  model: varchar("model", { length: 100 }),
  transitionType: varchar("transition_type", { length: 50 }).default("ai_start_end"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()),
});

// 合成输出表
export const compositions = mysqlTable("compositions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  outputPath: text("output_path"),
  resolution: varchar("resolution", { length: 10 }).default("1080p"),
  aspectRatio: varchar("aspect_ratio", { length: 10 }).default("9:16"),
  duration: int("duration"),
  bgmPath: text("bgm_path"),
  ttsEnabled: boolean("tts_enabled").default(false),
  subtitleStyle: json("subtitle_style").$type<SubtitleStyle>(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()),
});

// 商品库表
export const products = mysqlTable("products", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 500 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  images: json("images").$type<string[]>().default([]),
  price: varchar("price", { length: 100 }),
  targetAudience: text("target_audience"),
  analysis: text("analysis"),
  videoCount: int("video_count").default(0),
  createdAt: datetime("created_at").$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()),
});

// 品牌设置表
export const brandSettings = mysqlTable("brand_settings", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  logoPath: text("logo_path"),
  primaryColor: varchar("primary_color", { length: 20 }),
  secondaryColor: varchar("secondary_color", { length: 20 }),
  fontFamily: varchar("font_family", { length: 100 }),
  watermark: json("watermark").$type<WatermarkConfig>(),
  introTemplatePath: text("intro_template_path"),
  outroTemplatePath: text("outro_template_path"),
  isDefault: boolean("is_default").default(true),
  createdAt: datetime("created_at").$defaultFn(() => new Date()),
});

// 脚本模板表
export const scriptTemplates = mysqlTable("script_templates", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  videoMode: varchar("video_mode", { length: 50 }),
  styleType: varchar("style_type", { length: 50 }),
  shots: json("shots").$type<Shot[]>().default([]),
  sourceProjectId: varchar("source_project_id", { length: 36 }),
  useCount: int("use_count").default(0),
  createdAt: datetime("created_at").$defaultFn(() => new Date()),
});

// 人物/角色表
export const characters = mysqlTable("characters", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  appearance: text("appearance"),
  referenceImages: json("reference_images").$type<string[]>().default([]),
  voiceProfile: json("voice_profile").$type<CharacterVoiceProfile>(),
  isDefault: boolean("is_default").default(false),
  createdAt: datetime("created_at").$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()),
});

// 数据分析事件表
export const analyticsEvents = mysqlTable("analytics_events", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "set null" }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()),
});

// 设置表
export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: json("value"),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()),
});

// ===== 类型定义 =====

/** 视频模式：决定素材生成策略 */
export type VideoMode =
  | "product_closeup"
  | "graphic_montage"
  | "scene_demo"
  | "live_presenter";

export interface Shot {
  shotId: number;
  type: "hook" | "pain_point" | "product_reveal" | "demo" | "social_proof" | "cta";
  duration: number;
  description: string;
  camera: string;
  visualSource: "ai_generate" | "product_image" | "user_upload";
  transition: "ai_start_end" | "ai_reference" | "direct_concat" | "ffmpeg_fade";
  voiceover: string;
  prompt?: string;
  characterId?: string;
  motion?: "zoom_in_slow" | "pan_left" | "pan_right" | "ken_burns" | "static";
  textOverlay?: {
    text: string;
    style: "title" | "subtitle" | "highlight" | "price";
  };
}

/** 人物声音偏好 */
export interface CharacterVoiceProfile {
  style: string;
  speed?: number;
  emotion?: "neutral" | "happy" | "serious" | "energetic";
}

/** 水印配置 */
export interface WatermarkConfig {
  enabled: boolean;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  opacity: number;
  scale: number;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  position: "bottom" | "center" | "top";
}
