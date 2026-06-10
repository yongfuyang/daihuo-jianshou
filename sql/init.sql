-- ============================================
-- daihuo_jianshou MySQL 初始化脚本
-- 生成时间: 2026-06-10
-- 适用于 MySQL 8.0+
-- ============================================

CREATE DATABASE IF NOT EXISTS `daihuo_jianshou`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `daihuo_jianshou`;

-- 项目表
CREATE TABLE IF NOT EXISTS `projects` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'draft',
  `product_name` varchar(500) DEFAULT NULL,
  `product_category` varchar(100) DEFAULT NULL,
  `product_description` text,
  `product_images` json DEFAULT ('[]'),
  `product_analysis` text,
  `product_id` varchar(36) DEFAULT NULL,
  `brand_id` varchar(36) DEFAULT NULL,
  `template_id` varchar(36) DEFAULT NULL,
  `video_mode` varchar(50) DEFAULT 'product_closeup',
  `source_type` varchar(50) DEFAULT 'manual',
  `source_video_url` text,
  `character_id` varchar(36) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 脚本表
CREATE TABLE IF NOT EXISTS `scripts` (
  `id` varchar(36) NOT NULL,
  `project_id` varchar(36) NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `style_type` varchar(100) NOT NULL DEFAULT 'custom',
  `title` varchar(500) DEFAULT NULL,
  `total_duration` int DEFAULT NULL,
  `shots` json DEFAULT ('[]'),
  `selected` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `scripts_project_id_fk` (`project_id`),
  CONSTRAINT `scripts_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 素材表
CREATE TABLE IF NOT EXISTS `assets` (
  `id` varchar(36) NOT NULL,
  `project_id` varchar(36) NOT NULL,
  `shot_id` int NOT NULL,
  `type` varchar(50) NOT NULL,
  `file_path` text,
  `thumbnail_path` text,
  `provider` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `prompt` text,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `assets_project_id_fk` (`project_id`),
  CONSTRAINT `assets_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 视频片段表
CREATE TABLE IF NOT EXISTS `video_clips` (
  `id` varchar(36) NOT NULL,
  `project_id` varchar(36) NOT NULL,
  `shot_id` int NOT NULL,
  `asset_id` varchar(36) DEFAULT NULL,
  `file_path` text,
  `duration` int DEFAULT NULL,
  `provider` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `transition_type` varchar(50) DEFAULT 'ai_start_end',
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `video_clips_project_id_fk` (`project_id`),
  KEY `video_clips_asset_id_fk` (`asset_id`),
  CONSTRAINT `video_clips_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `video_clips_asset_id_fk` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 合成输出表
CREATE TABLE IF NOT EXISTS `compositions` (
  `id` varchar(36) NOT NULL,
  `project_id` varchar(36) NOT NULL,
  `output_path` text,
  `resolution` varchar(10) DEFAULT '1080p',
  `aspect_ratio` varchar(10) DEFAULT '9:16',
  `duration` int DEFAULT NULL,
  `bgm_path` text,
  `tts_enabled` tinyint(1) DEFAULT '0',
  `subtitle_style` json DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `compositions_project_id_fk` (`project_id`),
  CONSTRAINT `compositions_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商品库表
CREATE TABLE IF NOT EXISTS `products` (
  `id` varchar(36) NOT NULL,
  `name` varchar(500) NOT NULL,
  `category` varchar(50) NOT NULL,
  `description` text,
  `images` json DEFAULT ('[]'),
  `price` varchar(100) DEFAULT NULL,
  `target_audience` text,
  `analysis` text,
  `video_count` int DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 品牌设置表
CREATE TABLE IF NOT EXISTS `brand_settings` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `logo_path` text,
  `primary_color` varchar(20) DEFAULT NULL,
  `secondary_color` varchar(20) DEFAULT NULL,
  `font_family` varchar(100) DEFAULT NULL,
  `watermark` json DEFAULT NULL,
  `intro_template_path` text,
  `outro_template_path` text,
  `is_default` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 脚本模板表
CREATE TABLE IF NOT EXISTS `script_templates` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `category` varchar(100) DEFAULT NULL,
  `video_mode` varchar(50) DEFAULT NULL,
  `style_type` varchar(50) DEFAULT NULL,
  `shots` json DEFAULT ('[]'),
  `source_project_id` varchar(36) DEFAULT NULL,
  `use_count` int DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 人物/角色表
CREATE TABLE IF NOT EXISTS `characters` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `appearance` text,
  `reference_images` json DEFAULT ('[]'),
  `voice_profile` json DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 数据分析事件表
CREATE TABLE IF NOT EXISTS `analytics_events` (
  `id` varchar(36) NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `project_id` varchar(36) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `analytics_events_project_id_fk` (`project_id`),
  CONSTRAINT `analytics_events_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 设置表
CREATE TABLE IF NOT EXISTS `settings` (
  `key` varchar(255) NOT NULL,
  `value` json DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
