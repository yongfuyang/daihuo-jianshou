"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  LuArrowLeft,
  LuZap,
  LuCheck,
  LuCircleX,
  LuImage,
  LuArrowRight,
  LuX,
} from "react-icons/lu";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/lib/stores/settings-store";
import type { ProviderSetting } from "@/lib/stores/settings-store";
import type { Shot } from "@/lib/db/schema";

// ===== 类型定义 =====

interface ProjectData {
  id: string;
  name: string;
  productImages: string[];
  status: string;
  [key: string]: unknown;
}

interface ScriptData {
  id: string;
  shots: Shot[];
  selected: boolean;
  [key: string]: unknown;
}

interface AssetItem {
  shotId: number;
  type: Shot["type"];
  duration: number;
  description: string;
  prompt: string;
  visualSource: "ai_generate" | "product_image" | "user_upload";
  status: "pending" | "generating" | "done" | "failed";
  thumbnailUrl?: string;
  imageUrls?: string[];
}

// 每个供应商对应的默认生图模型
const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  "fal-ai": "fal-ai/flux/schnell",
  siliconflow: "stabilityai/stable-diffusion-3-5-large",
  volcengine: "kling-v1",
  alibaba: "wanx-v1",
  "atlas-cloud": "flux-schnell",
};

// 镜头类型标签
const shotTypeLabels: Record<
  Shot["type"],
  { label: string; color: string }
> = {
  hook: { label: "钩子", color: "bg-red-500/20 text-red-400" },
  pain_point: { label: "痛点", color: "bg-orange-500/20 text-orange-400" },
  product_reveal: {
    label: "产品",
    color: "bg-blue-500/20 text-blue-400",
  },
  demo: { label: "演示", color: "bg-green-500/20 text-green-400" },
  social_proof: {
    label: "背书",
    color: "bg-purple-500/20 text-purple-400",
  },
  cta: { label: "转化", color: "bg-amber-500/20 text-amber-400" },
};

export default function AssetsPage() {
  const { id } = useParams<{ id: string }>();

  // 数据加载状态
  const [project, setProject] = useState<ProjectData | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noProvider, setNoProvider] = useState(false);

  // 生成状态
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // 图片预览
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 设置 store
  const settings = useSettingsStore();

  // 计算完成数
  const doneCount = assets.filter((a) => a.status === "done").length;
  const allDone = assets.length > 0 && doneCount === assets.length;

  // 获取第一个可用的 AI 供应商配置
  const getEnabledProvider = useCallback(() => {
    const { providers } = settings;
    for (const [name, config] of Object.entries(providers) as [string, ProviderSetting][]) {
      if (config.enabled && config.apiKey) {
        return {
          name,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl || "",
          model:
            settings.defaultImageModel ||
            PROVIDER_DEFAULT_MODELS[name] ||
            "fal-ai/flux/schnell",
        };
      }
    }
    return null;
  }, [settings]);

  // 加载项目和脚本数据
  useEffect(() => {
    async function loadData() {
      try {
        // 加载项目信息
        const projectRes = await fetch(`/api/project/${id}`);
        if (!projectRes.ok) {
          throw new Error("项目不存在");
        }
        const projectData: ProjectData = await projectRes.json();
        setProject(projectData);

        // 加载脚本列表
        const scriptsRes = await fetch(`/api/scripts?projectId=${id}`);
        if (!scriptsRes.ok) {
          throw new Error("加载脚本失败");
        }
        const scriptsData: ScriptData[] = await scriptsRes.json();

        // 找到选中的脚本，如果没有则取第一个
        const selectedScript =
          scriptsData.find((s) => s.selected) || scriptsData[0];

        if (!selectedScript || !selectedScript.shots?.length) {
          setLoadError("尚未生成脚本，请先完成脚本编写");
          setLoading(false);
          return;
        }

        // 将 shot 转换为 asset item
        const assetItems: AssetItem[] = selectedScript.shots.map((shot) => ({
          shotId: shot.shotId,
          type: shot.type,
          duration: shot.duration,
          description: shot.description,
          prompt: shot.prompt || "",
          visualSource: shot.visualSource,
          status:
            shot.visualSource === "product_image"
              ? "done"
              : ("pending" as const),
          // product_image 类型的素材用项目商品图作为缩略图
          thumbnailUrl:
            shot.visualSource === "product_image" &&
            projectData.productImages?.length
              ? projectData.productImages[0]
              : undefined,
        }));

        setAssets(assetItems);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "加载数据失败"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // 生成单个 AI 素材
  const generateOne = useCallback(
    async (shotId: number) => {
      const provider = getEnabledProvider();
      if (!provider) {
        setNoProvider(true);
        return;
      }

      const asset = assets.find((a) => a.shotId === shotId);
      if (!asset || !asset.prompt) return;

      setAssets((prev) =>
        prev.map((a) =>
          a.shotId === shotId ? { ...a, status: "generating" as const } : a
        )
      );

      try {
        const res = await fetch("/api/ai/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: provider.name,
            model: provider.model,
            prompt: asset.prompt,
            mode: "text-to-image",
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl || undefined,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as { error?: string }).error || `生图失败 (${res.status})`
          );
        }

        const result = (await res.json()) as {
          taskId: string;
          imageUrls: string[];
          modelId: string;
        };

        setAssets((prev) =>
          prev.map((a) =>
            a.shotId === shotId
              ? {
                  ...a,
                  status: "done" as const,
                  thumbnailUrl: result.imageUrls?.[0] || "",
                  imageUrls: result.imageUrls || [],
                }
              : a
          )
        );
      } catch (err) {
        console.error(`生成素材 shotId=${shotId} 失败:`, err);
        setAssets((prev) =>
          prev.map((a) =>
            a.shotId === shotId ? { ...a, status: "failed" as const } : a
          )
        );
      }
    },
    [assets, getEnabledProvider]
  );

  // 一键全部生成
  const generateAll = useCallback(async () => {
    const provider = getEnabledProvider();
    if (!provider) {
      setNoProvider(true);
      return;
    }

    const pending = assets.filter(
      (a) =>
        (a.status === "pending" || a.status === "failed") &&
        a.visualSource === "ai_generate"
    );
    if (pending.length === 0) return;

    setIsBatchGenerating(true);

    // 逐个生成，避免并发过多触发限流
    for (const asset of pending) {
      await generateOne(asset.shotId);
    }

    setIsBatchGenerating(false);
  }, [assets, generateOne, getEnabledProvider]);

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg
            className="animate-spin h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  // 错误
  if (loadError) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <LuCircleX className="w-10 h-10 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Link href={`/project/${id}/script`}>
            <Button variant="outline" size="sm" className="text-xs">
              <LuArrowLeft className="w-3.5 h-3.5 mr-1" />
              返回脚本页
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const projectName = project?.name || "未命名项目";
  const hasEnabledProvider = !!getEnabledProvider();

  return (
    <div className="min-h-screen grid-bg">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg brand-gradient">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight">
                带货剪手
              </span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">
              {projectName}
            </span>
          </div>

          {/* 步骤进度 - 步骤 2（素材）为 active */}
          <div className="flex items-center gap-1">
            {["脚本", "素材", "视频", "导出"].map((step, i) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${
                    i === 1
                      ? "bg-primary text-primary-foreground"
                      : i < 1
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      i === 1
                        ? "bg-white/20"
                        : i < 1
                        ? "bg-primary/20"
                        : "bg-muted"
                    }`}
                  >
                    {i < 1 ? "✓" : i + 1}
                  </span>
                  {step}
                </div>
                {i < 3 && <div className="mx-1 h-px w-4 bg-border" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* 操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">素材生成</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {doneCount}/{assets.length} 个素材已就绪
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/project/${id}/script`}>
              <Button variant="outline" size="sm" className="text-xs">
                <LuArrowLeft className="w-3.5 h-3.5 mr-1" />
                返回脚本
              </Button>
            </Link>
            <Button
              onClick={generateAll}
              disabled={
                isBatchGenerating || allDone || !hasEnabledProvider
              }
              className="brand-gradient text-white text-xs"
            >
              {isBatchGenerating ? (
                <>
                  <svg
                    className="animate-spin mr-1.5 h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  生成中...
                </>
              ) : allDone ? (
                "全部完成"
              ) : !hasEnabledProvider ? (
                "未配置 AI 服务"
              ) : (
                <>
                  <LuZap className="w-3.5 h-3.5 mr-1" />
                  一键全部生成
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 未配置 AI 服务提示 */}
        {noProvider && !hasEnabledProvider && (
          <Card className="glass-card mb-6 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <LuZap className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-500 mb-1">
                    未配置 AI 生图服务
                  </p>
                  <p className="text-muted-foreground">
                    请前往{" "}
                    <Link
                      href="/settings"
                      className="text-primary underline underline-offset-2"
                    >
                      设置页面
                    </Link>{" "}
                    启用至少一个 AI 供应商（如 fal.ai、硅基流动等）并填写 API
                    Key，才能生成 AI 素材。商品图片类型的素材可以直接使用。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 进度条 */}
        <div className="mb-6">
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full brand-gradient transition-all duration-700 rounded-full"
              style={{
                width: `${assets.length > 0 ? (doneCount / assets.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* 素材列表 */}
        <div className="space-y-4">
          {assets.map((asset) => {
            const typeInfo = shotTypeLabels[asset.type];
            return (
              <Card key={asset.shotId} className="glass-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* 左侧序号 */}
                    <div className="flex flex-col items-center justify-center w-16 py-4 border-r border-border/50 shrink-0">
                      <span className="text-lg font-bold text-muted-foreground/50">
                        {String(asset.shotId).padStart(2, "0")}
                      </span>
                      <Badge
                        className={`${typeInfo.color} border-0 text-[10px] mt-1`}
                      >
                        {typeInfo.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {asset.duration}s
                      </span>
                    </div>

                    {/* 中间内容 */}
                    <div className="flex-1 p-4">
                      <p className="text-sm leading-relaxed mb-2">
                        {asset.description}
                      </p>
                      {asset.prompt && (
                        <p className="text-xs text-muted-foreground bg-muted/20 rounded px-2 py-1.5 mb-2 line-clamp-2">
                          Prompt: {asset.prompt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {asset.visualSource === "product_image"
                            ? "📷 商品原图"
                            : asset.visualSource === "ai_generate"
                            ? "✨ AI 生成"
                            : "📁 用户上传"}
                        </span>
                      </div>
                    </div>

                    {/* 右侧预览+操作 */}
                    <div className="flex flex-col items-center justify-center gap-2 p-4 shrink-0">
                      {/* 缩略图区域 */}
                      <div
                        className="w-24 h-16 bg-muted/30 rounded-md flex items-center justify-center border border-border/30 overflow-hidden cursor-pointer"
                        onClick={() => {
                          if (asset.thumbnailUrl) {
                            setPreviewUrl(asset.thumbnailUrl);
                          }
                        }}
                      >
                        {asset.status === "done" && asset.thumbnailUrl ? (
                          <img
                            src={asset.thumbnailUrl}
                            alt={`shot ${asset.shotId}`}
                            className="w-full h-full object-cover"
                          />
                        ) : asset.status === "done" ? (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <LuCheck className="w-5 h-5 text-primary" />
                          </div>
                        ) : asset.status === "generating" ? (
                          <svg
                            className="animate-spin h-5 w-5 text-primary"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : asset.status === "failed" ? (
                          <LuCircleX className="w-5 h-5 text-destructive" />
                        ) : (
                          <LuImage className="w-4 h-4 text-muted-foreground/40" />
                        )}
                      </div>

                      {/* 操作按钮 */}
                      {asset.visualSource === "ai_generate" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs w-24"
                          disabled={
                            asset.status === "generating" ||
                            !hasEnabledProvider
                          }
                          onClick={() => generateOne(asset.shotId)}
                        >
                          {asset.status === "generating"
                            ? "生成中..."
                            : asset.status === "done"
                            ? "重新生成"
                            : asset.status === "failed"
                            ? "重试"
                            : "生成素材"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 底部操作 */}
        <div className="mt-8 flex justify-end">
          <Link href={allDone ? `/project/${id}/video` : "#"}>
            <Button
              className="brand-gradient text-white text-sm"
              disabled={!allDone}
            >
              下一步：合成视频
              <LuArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </main>

      {/* 全屏图片预览 */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setPreviewUrl(null)}
          >
            <LuX className="w-6 h-6 text-white" />
          </button>
          <img
            src={previewUrl}
            alt="预览"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
