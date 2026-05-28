/**
 * 图标加载工具
 *
 * 1. getIconUrl(name, size)  — 获取图标 URL（优先本地 / 回退 CDN）
 * 2. preloadIcons(names)     — 预加载图标
 * 3. 常用图标常量            — 页面级图标名映射
 * 4. CDN 加载 lucide-react   — 动态加载 lucide 图标 SVG
 */

// ---------------------------------------------------------------------------
// 常量 & 配置
// ---------------------------------------------------------------------------

/** 本地图标存放路径前缀 */
const LOCAL_ICON_PREFIX = '/icons';

/** CDN 回退地址（lucide 图标） */
const LUCIDE_CDN_BASE = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

/** 默认图标尺寸 */
const DEFAULT_SIZE = 24;

/** 已知的 lucide 图标名称缓存（用于判断是否可从 CDN 加载） */
const knownLucideIcons = new Set<string>();

/** 预加载过的 URL 缓存，避免重复插入 <link> */
const preloadedUrls = new Set<string>();

// ---------------------------------------------------------------------------
// 常用图标常量
// ---------------------------------------------------------------------------

export const ICONS = {
  /** 首页 */
  home: 'home',
  /** 模板库 */
  templates: 'layout-template',
  /** 素材库 */
  materials: 'image',
  /** 数字人 */
  digitalHuman: 'user',
  /** 设置 */
  settings: 'settings',
  /** 项目管理 */
  project: 'folder',
  /** 历史记录 */
  history: 'history',
  /** 数据分析 */
  analytics: 'bar-chart-3',
  /** 搜索 */
  search: 'search',
  /** 通知 */
  bell: 'bell',
  /** 加载 */
  loader: 'loader',
  /** 用户 */
  user: 'user',
  /** 导出 */
  export: 'download',
  /** 导入 */
  import: 'upload',
  /** 编辑 */
  edit: 'pencil',
  /** 删除 */
  trash: 'trash-2',
  /** 更多操作 */
  moreHorizontal: 'more-horizontal',
  /** 关闭 */
  close: 'x',
  /** 检查/完成 */
  check: 'check',
  /** 箭头-左 */
  arrowLeft: 'arrow-left',
  /** 箭头-右 */
  arrowRight: 'arrow-right',
  /** 加号 */
  plus: 'plus',
  /** 星标 */
  star: 'star',
  /** 收藏 */
  heart: 'heart',
  /** 分享 */
  share: 'share-2',
  /** 复制 */
  copy: 'copy',
  /** 撤销 */
  undo: 'undo-2',
  /** 重做 */
  redo: 'redo-2',
  /** 预览 */
  eye: 'eye',
  /** 下拉 */
  chevronDown: 'chevron-down',
  /** 上拉 */
  chevronUp: 'chevron-up',
  /** 左 */
  chevronLeft: 'chevron-left',
  /** 右 */
  chevronRight: 'chevron-right',
} as const;

export type IconName = (typeof ICONS)[keyof typeof ICONS] | string;

// ---------------------------------------------------------------------------
// 核心工具函数
// ---------------------------------------------------------------------------

/**
 * 获取图标的 URL。
 *
 * 1. 先检查本地 `/icons/<name>.svg` 是否存在（通过 Image 预探测）
 * 2. 本地不存在时回退到 lucide-static CDN
 *
 * @param name  图标名称（对应 lucide 图标名，如 "home"）
 * @param size  图标尺寸，默认 24
 * @returns     图标的完整 URL
 */
export function getIconUrl(name: IconName, size: number = DEFAULT_SIZE): string {
  // 直接返回 CDN URL（本地存在性探测是异步的，这里先给 CDN URL 作为保底）
  const localUrl = `${LOCAL_ICON_PREFIX}/${name}.svg`;
  const cdnUrl = `${LUCIDE_CDN_BASE}/${name}.svg`;

  // 在浏览器环境下可以做缓存命中判断
  if (typeof window !== 'undefined') {
    const cached = localIconCache.get(name);
    if (cached === true) return localUrl;
    if (cached === false) return cdnUrl;
    // 首次请求：异步探测并缓存，本次返回 CDN
    probeLocalIcon(name);
  }

  return cdnUrl;
}

/**
 * 同步获取本地图标路径（不经过探测，直接返回本地路径）。
 * 适用于你确信图标已存在于本地的场景。
 */
export function getLocalIconPath(name: IconName): string {
  return `${LOCAL_ICON_PREFIX}/${name}.svg`;
}

/**
 * 同步获取 CDN 图标路径。
 */
export function getCdnIconUrl(name: IconName): string {
  return `${LUCIDE_CDN_BASE}/${name}.svg`;
}

// ---------------------------------------------------------------------------
// 预加载
// ---------------------------------------------------------------------------

/**
 * 预加载一组图标。
 *
 * - 在浏览器环境：通过 <link rel="preload"> 标签预加载 SVG
 * - 在 SSR 环境：仅返回预加载的 URL 列表供框架消费
 *
 * @param names 要预加载的图标名称数组
 * @returns     预加载的 URL 列表
 */
export function preloadIcons(names: IconName[]): string[] {
  const urls: string[] = [];

  for (const name of names) {
    const url = getIconUrl(name);

    if (preloadedUrls.has(url)) continue;
    preloadedUrls.add(url);
    urls.push(url);

    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      link.type = 'image/svg+xml';
      document.head.appendChild(link);
    }
  }

  return urls;
}

/**
 * 批量预加载所有常用页面图标。
 */
export function preloadCommonIcons(): string[] {
  return preloadIcons(Object.values(ICONS));
}

// ---------------------------------------------------------------------------
// CDN 动态加载 lucide-react 图标组件（React 场景）
// ---------------------------------------------------------------------------

/** 缓存已加载的 SVG 文本 */
const svgTextCache = new Map<string, string>();

/**
 * 从 CDN 动态加载 lucide 图标的 SVG 文本。
 *
 * @param name 图标名称
 * @param size 图标尺寸
 * @returns    SVG 字符串
 */
export async function fetchIconSvg(
  name: IconName,
  size: number = DEFAULT_SIZE,
): Promise<string> {
  const cacheKey = `${name}:${size}`;
  if (svgTextCache.has(cacheKey)) {
    return svgTextCache.get(cacheKey)!;
  }

  const url = getIconUrl(name, size);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`[icon-loader] Failed to fetch icon "${name}": ${res.status}`);
  }

  let svg = await res.text();

  // 统一替换尺寸，使 SVG 可缩放
  svg = svg
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`);

  svgTextCache.set(cacheKey, svg);
  return svg;
}

/**
 * 预加载并缓存多张图标的 SVG 文本（不阻塞，后台执行）。
 */
export async function prefetchIconSvgs(
  names: IconName[],
  size: number = DEFAULT_SIZE,
): Promise<void> {
  await Promise.allSettled(names.map((n) => fetchIconSvg(n, size)));
}

// ---------------------------------------------------------------------------
// 内部：本地图标存在性探测
// ---------------------------------------------------------------------------

const localIconCache = new Map<string, boolean>();

function probeLocalIcon(name: string): void {
  if (typeof window === 'undefined') return;

  const img = new Image();
  const localUrl = `${LOCAL_ICON_PREFIX}/${name}.svg`;

  img.onload = () => {
    localIconCache.set(name, true);
    knownLucideIcons.add(name);
  };
  img.onerror = () => {
    localIconCache.set(name, false);
  };
  img.src = localUrl;
}

// ---------------------------------------------------------------------------
// 便捷 re-export
// ---------------------------------------------------------------------------

export default {
  ICONS,
  getIconUrl,
  getLocalIconPath,
  getCdnIconUrl,
  preloadIcons,
  preloadCommonIcons,
  fetchIconSvg,
  prefetchIconSvgs,
};
