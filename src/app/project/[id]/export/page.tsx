"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  LuCheck,
  LuCircleCheck,
  LuDownload,
  LuLink2,
  LuFileText,
  LuPlus,
  LuHouse,
  LuCircleAlert,
  LuHash,
  LuFilm,
} from "react-icons/lu";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// 项目类型
interface Project {
  id: string;
  name: string;
  status: string;
  productName?: string;
}

// 脚本类型
interface Script {
  id: string;
  projectId: string;
  styleType: string;
  title?: string;
  shots: {
    shotId: number;
    voiceover: string;
  }[];
}

// 合成输出类型
interface Composition {
  id: string;
  projectId: string;
  outputPath: string;
  resolution: string;
  aspectRatio: string;
  duration: number;
  bgmPath?: string;
  subtitleStyle?: {
    position: string;
    fontSize: number;
    color: string;
  };
  status: string;
  createdAt: string;
}

// 风格标签
const styleLabels: Record<string, string> = {
  pain_point: "痛点种草",
  scene: "场景代入",
  comparison: "对比评测",
  story: "故事叙事",
  custom: "自定义",
};

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();

  // 数据状态
  const [project, setProject] = useState<Project | null>(null);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Toast 状态
  const [toast, setToast] = useState<string | null>(null);

  // 显示提示
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // 加载数据
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [projectRes, compositionRes, scriptsRes] = await Promise.all([
          fetch(`/api/project/${id}`),
          fetch(`/api/compositions?projectId=${id}`),
          fetch(`/api/scripts?projectId=${id}`),
        ]);

        if (!projectRes.ok) {
          throw new Error("项目不存在");
        }

        const projectData = await projectRes.json();
        setProject(projectData);

        const compositionData = await compositionRes.json();
        setComposition(compositionData.composition || null);

        const scriptsData = await scriptsRes.json();
        if (Array.isArray(scriptsData) && scriptsData.length > 0) {
          const script =
            scriptsData.find(
              (s: Script & { selected: boolean }) => s.selected
            ) || scriptsData[0];
          setSelectedScript(script);
        }

        setLoading(false);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "加载数据失败"
        );
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  // 将绝对文件路径转为 API 可访问的 URL
  const getFileUrl = (filePath: string | null | undefined) => {
    if (!filePath) return null;
    // 文件路径类似 /path/to/project/data/output/{projectId}/final_xxx.mp4
    // 需要提取 data/ 之后的相对路径
    const dataIdx = filePath.indexOf("/data/");
    if (dataIdx === -1) return null;
    const relativePath = filePath.substring(dataIdx + "/data/".length);
    return `/api/files/${relativePath}`;
  };

  // 下载视频
  const handleDownload = async () => {
    const videoUrl = getFileUrl(composition?.outputPath);
    if (!videoUrl) {
      showToast("视频文件路径无效");
      return;
    }

    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error("下载失败");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.name || "video"}_${composition?.resolution || "1080p"}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("视频已开始下载");
    } catch {
      showToast("下载失败，请重试");
    }
  };

  // 复制分享文案
  const handleCopyShareText = () => {
    if (!selectedScript) {
      showToast("无脚本信息");
      return;
    }

    const voiceovers = selectedScript.shots
      .map((s) => s.voiceover)
      .filter(Boolean)
      .join(" ");
    navigator.clipboard.writeText(voiceovers).then(() => {
      showToast("文案已复制到剪贴板");
    });
  };

  // 导出脚本文本
  const handleExportScript = () => {
    if (!selectedScript) {
      showToast("无脚本信息");
      return;
    }

    const lines = selectedScript.shots.map(
      (s) => `[镜头${s.shotId}] ${s.voiceover}`
    );
    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "script"}_脚本.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("脚本文案已导出");
  };

  // 视频时长格式化
  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`;
  };

  // 加载中
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
          <p className="text-sm text-muted-foreground">加载中...</p>
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
          <Link href={`/project/${id}/video`}>
            <Button variant="outline" size="sm">
              返回视频合成
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const videoUrl = getFileUrl(composition?.outputPath);
  const hasVideo = !!videoUrl && composition?.status === "done";

  return (
    <div className="min-h-screen grid-bg">
      {/* Toast 提示 */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm shadow-xl">
            <LuCheck className="w-4 h-4" />
            {toast}
          </div>
        </div>
      )}

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
                    i === 3
                      ? "bg-primary text-primary-foreground"
                      : i < 3
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      i === 3
                        ? "bg-white/20"
                        : i < 3
                        ? "bg-primary/20"
                        : "bg-muted"
                    }`}
                  >
                    {i < 3 ? "✓" : i + 1}
                  </span>
                  {step}
                </div>
                {i < 3 && <div className="mx-1 h-px w-4 bg-border" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* 完成提示 */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
            <LuCircleCheck className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            视频
            <span className="brand-gradient-text">
              {hasVideo ? "生成完成" : "导出"}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasVideo
              ? "你的带货视频已准备就绪，可以下载或分享"
              : "请先完成视频合成"}
          </p>
        </div>

        {/* 视频预览 */}
        <Card className="glass-card neon-glow mb-6 overflow-hidden">
          <CardContent className="p-0">
            <div className="mx-auto max-w-xs">
              {/* 预览区域 */}
              <div className="relative aspect-[9/16] bg-gradient-to-b from-muted/40 via-muted/20 to-muted/40 flex items-center justify-center">
                {hasVideo ? (
                  /* HTML5 视频播放器 */
                  <video
                    src={videoUrl!}
                    controls
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                    playsInline
                    preload="metadata"
                  >
                    您的浏览器不支持视频播放
                  </video>
                ) : (
                  /* 无视频占位 */
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <LuFilm className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground/50">
                        尚未合成视频
                      </p>
                    </div>
                  </div>
                )}

                {/* 时长标签 */}
                {hasVideo && composition?.duration && (
                  <div className="absolute bottom-12 right-3 px-2 py-0.5 rounded bg-black/60 text-white text-xs z-10">
                    {formatDuration(composition.duration)}
                  </div>
                )}
              </div>
            </div>

            {/* 视频信息条 */}
            <div className="px-5 py-3 border-t border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{composition?.resolution || "1080p"}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span>{composition?.aspectRatio || "9:16"}</span>
                {composition?.duration && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span>{formatDuration(composition.duration)}</span>
                  </>
                )}
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span>MP4</span>
              </div>
              {composition?.createdAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(composition.createdAt).toLocaleDateString("zh-CN")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-8">
          <Button
            onClick={handleDownload}
            disabled={!hasVideo}
            className="brand-gradient text-white h-11 px-8 text-sm font-semibold"
          >
            <LuDownload className="w-[18px] h-[18px] mr-2" />
            下载视频
          </Button>
          <Button
            variant="outline"
            onClick={handleCopyShareText}
            disabled={!selectedScript}
            className="h-11 px-6 text-sm"
          >
            <LuLink2 className="w-4 h-4 mr-2" />
            复制分享文案
          </Button>
          <Button
            variant="outline"
            onClick={handleExportScript}
            disabled={!selectedScript}
            className="h-11 px-6 text-sm"
          >
            <LuFileText className="w-4 h-4 mr-2" />
            导出脚本
          </Button>
        </div>

        {/* SEO / 发布信息 */}
        {selectedScript && (
          <Card className="glass-card mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <LuHash className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">发布信息</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                视频标题、描述和标签，可直接用于各平台发布
              </p>

              <div className="space-y-4">
                {/* 标题 */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">视频标题</p>
                  <p className="text-sm font-medium">
                    {project?.productName
                      ? `${project.productName} | ${selectedScript.title || "带货视频"}`
                      : selectedScript.title || project?.name || "带货视频"}
                  </p>
                </div>

                {/* 描述 / 口播文案 */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">口播文案</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedScript.shots
                      .map((s) => s.voiceover)
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                </div>

                {/* 标签 */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">推荐标签</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "好物推荐",
                      "种草",
                      project?.productName || "产品",
                      "测评",
                      styleLabels[selectedScript.styleType] || "带货",
                      "短视频",
                    ].map((tag, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-primary/10"
                        onClick={() => {
                          navigator.clipboard.writeText(`#${tag}`);
                          showToast(`已复制 #${tag}`);
                        }}
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 视频详情 */}
        <Card className="glass-card mb-6">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">视频详情</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    项目名称
                  </p>
                  <p className="text-sm">{project?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    脚本风格
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {selectedScript
                      ? styleLabels[selectedScript.styleType] || selectedScript.styleType
                      : "-"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    分辨率
                  </p>
                  <p className="text-sm">{composition?.resolution || "1080p"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    画面比例
                  </p>
                  <p className="text-sm">{composition?.aspectRatio || "9:16"}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    分镜数量
                  </p>
                  <p className="text-sm">
                    {selectedScript?.shots?.length || 0} 个镜头
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    总时长
                  </p>
                  <p className="text-sm">
                    {composition?.duration
                      ? formatDuration(composition.duration)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    背景音乐
                  </p>
                  <p className="text-sm">
                    {composition?.bgmPath ? "已添加" : "未添加"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">字幕</p>
                  <p className="text-sm">
                    {composition?.subtitleStyle ? "已开启" : "未开启"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 底部导航 */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/project/new">
            <Button className="brand-gradient text-white">
              <LuPlus className="w-4 h-4 mr-1.5" />
              再做一个
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">
              <LuHouse className="w-4 h-4 mr-1.5" />
              返回项目列表
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
