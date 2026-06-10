"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { LuArrowLeft, LuPlay, LuChevronDown, LuArrowRight, LuCircleAlert, LuImage, LuVideo } from "react-icons/lu";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Shot } from "@/lib/db/schema";

// 项目类型（来自 API）
interface Project {
  id: string;
  name: string;
  status: string;
  productName?: string;
}

// 脚本类型（来自 API）
interface Script {
  id: string;
  projectId: string;
  styleType: string;
  title?: string;
  totalDuration?: number;
  shots: Shot[];
  selected: boolean;
}

// 素材类型（来自 API）
interface Asset {
  id: string;
  projectId: string;
  shotId: number;
  type: string;
  filePath?: string;
  thumbnailPath?: string;
  status: string;
}

// 视频片段条目
interface VideoClipItem {
  shotId: number;
  type: Shot["type"];
  duration: number;
  voiceover: string;
  transition: Shot["transition"];
  asset?: Asset;
}

// 合成设置
interface ComposeSettings {
  subtitlePosition: "bottom" | "center" | "top";
  aspectRatio: "9:16" | "16:9" | "1:1";
  resolution: "720p" | "1080p";
}

// 转场标签
const transitionLabels: Record<string, string> = {
  ai_start_end: "AI 智能过渡",
  ai_reference: "AI 参考过渡",
  direct_concat: "直接拼接",
  ffmpeg_fade: "渐变过渡",
};

// 镜头类型标签
const shotTypeLabels: Record<Shot["type"], { label: string; color: string }> = {
  hook: { label: "钩子", color: "bg-red-500/20 text-red-400" },
  pain_point: { label: "痛点", color: "bg-orange-500/20 text-orange-400" },
  product_reveal: { label: "产品", color: "bg-blue-500/20 text-blue-400" },
  demo: { label: "演示", color: "bg-green-500/20 text-green-400" },
  social_proof: { label: "背书", color: "bg-purple-500/20 text-purple-400" },
  cta: { label: "转化", color: "bg-amber-500/20 text-amber-400" },
};

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // 数据加载状态
  const [project, setProject] = useState<Project | null>(null);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clips, setClips] = useState<VideoClipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 合成设置
  const [config, setConfig] = useState<ComposeSettings>({
    subtitlePosition: "bottom",
    aspectRatio: "9:16",
    resolution: "1080p",
  });

  // 合成状态
  const [isComposing, setIsComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeDone, setComposeDone] = useState(false);

  // 加载项目数据
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // 并行加载项目和脚本
        const [projectRes, scriptsRes] = await Promise.all([
          fetch(`/api/project/${id}`),
          fetch(`/api/scripts?projectId=${id}`),
        ]);

        if (!projectRes.ok) {
          throw new Error("项目不存在");
        }

        const projectData = await projectRes.json();
        setProject(projectData);

        const scriptsData = await scriptsRes.json();
        if (!Array.isArray(scriptsData) || scriptsData.length === 0) {
          setLoadError("请先创建脚本");
          setLoading(false);
          return;
        }

        // 选取选中的脚本，如果没有选中的则取第一个
        const script =
          scriptsData.find((s: Script) => s.selected) || scriptsData[0];
        setSelectedScript(script);

        // 加载素材
        const assetsRes = await fetch(`/api/project/${id}`);
        // 素材通过单独接口获取（如存在）
        // 此处尝试加载，若失败则置空
        let assetsData: Asset[] = [];
        try {
          const assetsRes = await fetch(
            `/api/project/${id}/assets`
          );
          if (assetsRes.ok) {
            assetsData = await assetsRes.json();
          }
        } catch {
          // 素材接口可能不存在，使用空数组
        }
        setAssets(assetsData);

        // 将脚本的 shots 转换为 clip 条目
        if (script.shots && script.shots.length > 0) {
          const clipItems: VideoClipItem[] = script.shots.map((shot: Shot) => {
            const shotAsset = assetsData.find(
              (a: Asset) => a.shotId === shot.shotId && a.status === "done"
            );
            return {
              shotId: shot.shotId,
              type: shot.type,
              duration: shot.duration,
              voiceover: shot.voiceover,
              transition: shot.transition || "ai_start_end",
              asset: shotAsset,
            };
          });
          setClips(clipItems);
        }

        setLoading(false);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "加载项目数据失败"
        );
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);

  // 更新片段转场
  const updateTransition = (shotId: number, transition: string) => {
    setClips((prev) =>
      prev.map((c) =>
        c.shotId === shotId
          ? { ...c, transition: transition as Shot["transition"] }
          : c
      )
    );
  };

  // 开始合成
  const startCompose = useCallback(async () => {
    if (!selectedScript || clips.length === 0) return;

    setIsComposing(true);
    setComposeError(null);
    setComposeDone(false);

    try {
      // 构建 clips 输入：只有拥有素材文件的片段才参与合成
      const clipsWithAssets = clips.filter(
        (c) => c.asset?.filePath
      );

      if (clipsWithAssets.length === 0) {
        throw new Error("没有可用的素材文件，请先生成素材");
      }

      // 构建 ComposeConfig
      const composeConfig = {
        projectId: id,
        clips: clipsWithAssets.map((clip) => ({
          type: (clip.asset?.filePath?.endsWith(".mp4") ? "video" : "image") as
            | "video"
            | "image",
          filePath: clip.asset!.filePath!,
          duration: clip.duration,
          transition: clip.transition,
          motion: undefined,
          hasAudio: false,
        })),
        output: {
          resolution: config.resolution,
          aspectRatio: config.aspectRatio,
        },
        subtitle: selectedScript.shots
          ? {
              texts: selectedScript.shots
                .filter((s) => s.voiceover)
                .map((s, i, arr) => {
                  const startTime = arr
                    .slice(0, i)
                    .reduce((acc, prev) => acc + prev.duration, 0);
                  return {
                    text: s.voiceover,
                    startTime,
                    endTime: startTime + s.duration,
                  };
                }),
              position: config.subtitlePosition,
            }
          : undefined,
      };

      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(composeConfig),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "合成失败");
      }

      const data = await res.json();
      setComposeDone(true);
    } catch (err) {
      setComposeError(
        err instanceof Error ? err.message : "视频合成过程中发生错误"
      );
    } finally {
      setIsComposing(false);
    }
  }, [id, clips, selectedScript, config]);

  // 加载中状态
  if (loading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-primary mx-auto mb-4"
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
          <p className="text-sm text-muted-foreground">加载项目中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (loadError) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center">
          <LuCircleAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
          <Link href={`/project/${id}/script`}>
            <Button variant="outline" size="sm">
              前往创建脚本
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 统计素材情况
  const clipsWithAsset = clips.filter((c) => c.asset?.filePath);
  const clipsWithoutAsset = clips.filter((c) => !c.asset?.filePath);

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
              {project?.name || "项目"}
            </span>
          </div>

          {/* 步骤进度 */}
          <div className="flex items-center gap-1">
            {["脚本", "素材", "视频", "导出"].map((step, i) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${
                    i === 2
                      ? "bg-primary text-primary-foreground"
                      : i < 2
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      i === 2
                        ? "bg-white/20"
                        : i < 2
                        ? "bg-primary/20"
                        : "bg-muted"
                    }`}
                  >
                    {i < 2 ? "✓" : i + 1}
                  </span>
                  {step}
                </div>
                {i < 3 && <div className="mx-1 h-px w-4 bg-border" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：视频时间线 */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">视频时间线</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {clips.length} 个片段 · 总时长 {totalDuration}s
                  {clipsWithoutAsset.length > 0 && (
                    <span className="text-amber-500 ml-2">
                      ({clipsWithoutAsset.length} 个片段缺少素材)
                    </span>
                  )}
                </p>
              </div>
              <Link href={`/project/${id}/assets`}>
                <Button variant="outline" size="sm" className="text-xs">
                  <LuArrowLeft className="w-3.5 h-3.5 mr-1" />
                  返回素材
                </Button>
              </Link>
            </div>

            {clips.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    当前脚本没有分镜数据，请返回脚本页面编辑
                  </p>
                  <Link href={`/project/${id}/script`}>
                    <Button variant="outline" size="sm" className="mt-4">
                      编辑脚本
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1">
                {clips.map((clip, index) => {
                  const typeInfo = shotTypeLabels[clip.type];
                  const hasAsset = !!clip.asset?.filePath;
                  return (
                    <div key={clip.shotId}>
                      {/* 片段卡片 */}
                      <Card className="glass-card">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* 缩略图 */}
                            <div
                              className={`w-20 h-14 rounded-md shrink-0 flex items-center justify-center border ${
                                hasAsset
                                  ? "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20"
                                  : "bg-muted/30 border-dashed border-border/50"
                              }`}
                            >
                              {hasAsset ? (
                                clip.asset!.filePath?.endsWith(".mp4") ? (
                                  <LuVideo className="w-4 h-4 text-primary/60" />
                                ) : (
                                  <LuImage className="w-4 h-4 text-primary/60" />
                                )
                              ) : (
                                <LuCircleAlert className="w-4 h-4 text-amber-500/60" />
                              )}
                            </div>

                            {/* 信息 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  className={`${typeInfo.color} border-0 text-[10px]`}
                                >
                                  {typeInfo.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {clip.duration}s
                                </span>
                                {hasAsset ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-emerald-500 border-emerald-500/30"
                                  >
                                    已有素材
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-amber-500 border-amber-500/30"
                                  >
                                    缺少素材
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {clip.voiceover}
                              </p>
                            </div>

                            {/* 序号 */}
                            <span className="text-sm font-bold text-muted-foreground/30 shrink-0">
                              {String(clip.shotId).padStart(2, "0")}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 转场选择器（最后一个片段后面不显示） */}
                      {index < clips.length - 1 && (
                        <div className="flex items-center justify-center py-1.5">
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/20 border border-border/30">
                            <LuChevronDown className="w-3 h-3 text-muted-foreground" />
                            <select
                              value={clip.transition}
                              onChange={(e) =>
                                updateTransition(clip.shotId, e.target.value)
                              }
                              className="text-[11px] text-muted-foreground bg-transparent border-none outline-none cursor-pointer"
                            >
                              <option value="ai_start_end">
                                {transitionLabels.ai_start_end}
                              </option>
                              <option value="ai_reference">
                                {transitionLabels.ai_reference}
                              </option>
                              <option value="direct_concat">
                                {transitionLabels.direct_concat}
                              </option>
                              <option value="ffmpeg_fade">
                                {transitionLabels.ffmpeg_fade}
                              </option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右侧：合成配置 */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-base font-semibold">合成设置</h2>

            {/* 字幕设置 */}
            <Card className="glass-card">
              <CardContent className="p-4 space-y-3">
                <Label className="text-sm font-medium">字幕</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["bottom", "center", "top"] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() =>
                        setConfig((c) => ({ ...c, subtitlePosition: pos }))
                      }
                      className={`h-9 rounded-md text-xs border transition-all ${
                        config.subtitlePosition === pos
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {pos === "bottom"
                        ? "底部"
                        : pos === "center"
                        ? "居中"
                        : "顶部"}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 画面设置 */}
            <Card className="glass-card">
              <CardContent className="p-4 space-y-4">
                <Label className="text-sm font-medium">画面设置</Label>
                {/* 比例 */}
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">画面比例</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["9:16", "16:9", "1:1"] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() =>
                          setConfig((c) => ({ ...c, aspectRatio: ratio }))
                        }
                        className={`h-9 rounded-md text-xs border transition-all ${
                          config.aspectRatio === ratio
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {ratio === "9:16"
                          ? "竖屏"
                          : ratio === "16:9"
                          ? "横屏"
                          : "方形"}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 分辨率 */}
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">分辨率</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["720p", "1080p"] as const).map((res) => (
                      <button
                        key={res}
                        onClick={() =>
                          setConfig((c) => ({ ...c, resolution: res }))
                        }
                        className={`h-9 rounded-md text-xs border transition-all ${
                          config.resolution === res
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 素材统计 */}
            <Card className="glass-card">
              <CardContent className="p-4 space-y-2">
                <Label className="text-sm font-medium">素材状态</Label>
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">已就绪素材</span>
                    <span className="text-emerald-500 font-medium">
                      {clipsWithAsset.length} / {clips.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">缺少素材</span>
                    <span
                      className={`font-medium ${
                        clipsWithoutAsset.length > 0
                          ? "text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {clipsWithoutAsset.length}
                    </span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${
                          clips.length > 0
                            ? (clipsWithAsset.length / clips.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 合成按钮 */}
            <div className="space-y-3">
              {/* 错误提示 */}
              {composeError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                  {composeError}
                </div>
              )}

              {/* 合成进行中提示 */}
              {isComposing && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <svg
                      className="animate-spin h-4 w-4"
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
                    正在合成视频，请耐心等待...
                  </div>
                </div>
              )}

              {/* 合成完成提示 */}
              {composeDone && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600">
                  视频合成完成！可以前往导出页面查看。
                </div>
              )}

              <Button
                onClick={startCompose}
                disabled={
                  isComposing || clipsWithAsset.length === 0 || clips.length === 0
                }
                className="w-full brand-gradient text-white"
              >
                {isComposing ? (
                  <>
                    <svg
                      className="animate-spin mr-2 h-4 w-4"
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
                    合成中...
                  </>
                ) : composeDone ? (
                  "重新合成"
                ) : (
                  <>
                    <LuPlay className="w-4 h-4 mr-1" />
                    开始合成
                  </>
                )}
              </Button>

              {clipsWithAsset.length === 0 && clips.length > 0 && (
                <p className="text-xs text-amber-500 text-center">
                  请先生成素材后再进行合成
                </p>
              )}

              {composeDone && (
                <Link href={`/project/${id}/export`}>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    下一步：导出视频
                    <LuArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
