"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import {LuArrowLeft, LuZap, LuCheck, LuCircleX, LuImage, LuArrowRight, LuLoader} from "react-icons/lu";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Shot } from "@/lib/db/schema";
import { useSettingsStore } from "@/lib/stores/settings-store";

// 素材项
interface AssetItem {
  shotId: number;
  type: Shot["type"];
  duration: number;
  description: string;
  prompt: string;
  visualSource: "ai_generate" | "product_image" | "user_upload";
  status: "pending" | "generating" | "done" | "failed";
  thumbnailUrl?: string;
}

// 项目数据类型（从 API 返回）
interface ProjectData {
  id: string;
  name: string;
  productName: string;
  productImages: string[];
}

// 脚本数据类型（从 API 返回）
interface ScriptData {
  id: string;
  projectId: string;
  styleType: string;
  title: string;
  totalDuration: number;
  shots: Shot[];
  selected: boolean;
}

// 镜头类型标签
const shotTypeLabels: Record<Shot["type"], { label: string; color: string }> = {
  hook: { label: "钩子", color: "bg-red-500/20 text-red-400" },
  pain_point: { label: "痛点", color: "bg-orange-500/20 text-orange-400" },
  product_reveal: { label: "产品", color: "bg-blue-500/20 text-blue-400" },
  demo: { label: "演示", color: "bg-green-500/20 text-green-400" },
  social_proof: { label: "背书", color: "bg-purple-500/20 text-purple-400" },
  cta: { label: "转化", color: "bg-amber-500/20 text-amber-400" },
};

export default function AssetsPage() {
  const { id } = useParams<{ id: string }>();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  const doneCount = assets.filter((a) => a.status === "done").length;
  const allDone = doneCount === assets.length;

  // 读取用户配置的 LLM 信息
  const llm = useSettingsStore((s) => s.llm);

  // 从项目数据中读取商品名和商品图
  const productName = project?.productName || "";
  const productImages = project?.productImages || [];
  const productImageBase64 = productImages.length > 0 ? productImages[0] : "";

  // 从 API 加载项目数据和脚本数据
  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        // 并行加载项目和脚本数据
        const [projectRes, scriptsRes] = await Promise.all([
          fetch(`/api/project/${id}`),
          fetch(`/api/scripts?projectId=${id}`),
        ]);

        if (!projectRes.ok) throw new Error(`加载项目失败 (${projectRes.status})`);
        const projectData = await projectRes.json();
        setProject(projectData);

        if (scriptsRes.ok) {
          const scriptsData: ScriptData[] = await scriptsRes.json();
          if (Array.isArray(scriptsData) && scriptsData.length > 0) {
            // 使用选中脚本的 shots，如果没有选中的则用第一个
            const selectedScript = scriptsData.find(s => s.selected) || scriptsData[0];
            const assetItems: AssetItem[] = selectedScript.shots.map((shot, index) => ({
              shotId: shot.shotId || index + 1,
              type: shot.type,
              duration: shot.duration || 3,
              description: shot.description || `分镜 ${index + 1}`,
              prompt: shot.prompt || shot.description || "",
              visualSource: shot.visualSource || "ai_generate",
              status: "pending" as const,
            }));
            setAssets(assetItems);
          }
        }
      } catch (e) {
        console.error("加载数据失败:", e);
        setLoadError(e instanceof Error ? e.message : "加载数据失败");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // 如果有商品图，作为所有分镜的默认缩略图
  useEffect(() => {
    if (productImageBase64 && assets.length > 0 && !assets[0]?.thumbnailUrl) {
      setAssets((prev) =>
        prev.map((a) => ({
          ...a,
          status: "done" as const,
          thumbnailUrl: productImageBase64,
        }))
      );
    }
  }, [productImageBase64, assets]);

  // 调用真实生图 API（尝试基于商品图生成创意场景），所有分镜都以上传的商品图为参考
  const generateOne = useCallback(async (shotId: number) => {
    const asset = assets.find((a) => a.shotId === shotId);
    if (!asset || !llm.apiKey) return;

    setAssets((prev) =>
      prev.map((a) => (a.shotId === shotId ? { ...a, status: "generating" as const } : a))
    );

    try {
      const baseUrl = (llm.baseUrl || "https://apihub.agnes-ai.com/v1").replace(/\/+$/, "");
      const imagePrompt = asset.prompt || asset.description;
      const fullPrompt = productName ? `${productName}，${imagePrompt}` : imagePrompt;

      const body: any = {
        model: "agnes-image-2.1-flash",
        prompt: fullPrompt,
        size: "1024x1024",
      };
      // 图生图：把商品图URL传给 extra_body.image（数组格式）
      // 注意：这是 base64 data URL，可以正常传给 OpenAI 兼容 API
      if (productImageBase64) {
        body.extra_body = {
          image: [productImageBase64],
          response_format: "url",
        };
      }
      const res = await fetch(`${baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llm.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API 返回 ${res.status}`);
      const data = await res.json();
      const url: string = data.data?.[0]?.url || "";

      setAssets((prev) =>
        prev.map((a) =>
          a.shotId === shotId
            ? { ...a, status: "done" as const, thumbnailUrl: url }
            : a
        )
      );
    } catch (e: any) {
      console.error("生图失败:", e);
      setAssets((prev) =>
        prev.map((a) =>
          a.shotId === shotId ? { ...a, status: "failed" as const } : a
        )
      );
    }
  }, [assets, llm]);

  // 一键全部生成
  const generateAll = useCallback(() => {
    const pending = assets.filter((a) => a.status === "pending" || a.status === "failed");
    // 没有待生成的素材时直接返回，避免 isBatchGenerating 状态无法恢复
    if (pending.length === 0) return;
    setIsBatchGenerating(true);
    pending.forEach((asset, index) => {
      setTimeout(() => {
        generateOne(asset.shotId);
        if (index === pending.length - 1) {
          setTimeout(() => setIsBatchGenerating(false), 3000);
        }
      }, index * 1200);
    });
  }, [assets, generateOne]);

  return (
    <div className="min-h-screen grid-bg">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg brand-gradient">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight">萌萌的</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">通用品牌 通用商品推广</span>
          </div>

          {/* 步骤进度 */}
          <div className="flex items-center gap-1">
            {["脚本", "素材", "视频", "导出"].map((step, i) => (
              <div key={step} className="flex items-center">
                <div className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${i === 1 ? "bg-primary text-primary-foreground" : i < 1 ? "text-primary" : "text-muted-foreground"}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${i === 1 ? "bg-white/20" : i < 1 ? "bg-primary/20" : "bg-muted"}`}>
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
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LuLoader className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">加载素材数据...</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-destructive mb-2">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </div>
        ) : (
        <>
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
              disabled={isBatchGenerating || allDone}
              className="brand-gradient text-white text-xs"
            >
              {isBatchGenerating ? (
                <>
                  <svg className="animate-spin mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  生成中...
                </>
              ) : allDone ? (
                "全部完成"
              ) : (
                <>
                  <LuZap className="w-3.5 h-3.5 mr-1" />
                  一键全部生成
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-6">
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full brand-gradient transition-all duration-700 rounded-full"
              style={{ width: `${(doneCount / assets.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 素材列表 */}
        <div className="space-y-4">
          {assets.map((asset) => {
            const typeInfo = shotTypeLabels[asset.type] || { label: "其他", color: "bg-gray-500/20 text-gray-400", bg: "bg-gray-500/20" };
            return (
              <Card key={asset.shotId} className="glass-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* 左侧序号 */}
                    <div className="flex flex-col items-center justify-center w-16 py-4 border-r border-border/50 shrink-0">
                      <span className="text-lg font-bold text-muted-foreground/50">
                        {String(asset.shotId).padStart(2, "0")}
                      </span>
                      <Badge className={`${typeInfo.color} border-0 text-[10px] mt-1`}>
                        {typeInfo.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground mt-1">{asset.duration}s</span>
                    </div>

                    {/* 中间内容 */}
                    <div className="flex-1 p-4">
                      <p className="text-sm leading-relaxed mb-2">{asset.description}</p>
                      {asset.prompt && (
                        <p className="text-xs text-muted-foreground bg-muted/20 rounded px-2 py-1.5 mb-2 line-clamp-2">
                          Prompt: {asset.prompt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {asset.visualSource === "product_image" ? "📷 商品原图" : asset.visualSource === "ai_generate" ? "✨ AI 生成" : "📁 用户上传"}
                        </span>
                      </div>
                    </div>

                    {/* 右侧预览+操作 */}
                    <div className="flex flex-col items-center justify-center gap-2 p-4 shrink-0">
                      {/* 缩略图区域 */}
                      <div className="w-24 h-16 bg-muted/30 rounded-md flex items-center justify-center border border-border/30 overflow-hidden">
                        {asset.status === "done" ? (
                          asset.thumbnailUrl ? (
                            <img src={asset.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <LuCheck className="w-5 h-5 text-primary" />
                            </div>
                          )
                        ) : asset.status === "generating" ? (
                          <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
                          disabled={asset.status === "generating"}
                          onClick={() => generateOne(asset.shotId)}
                        >
                          {asset.status === "generating" ? (
                            "生成中..."
                          ) : asset.status === "done" ? (
                            "重新生成"
                          ) : asset.status === "failed" ? (
                            "重试"
                          ) : (
                            "生成素材"
                          )}
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
        </>
        )}
      </main>
    </div>
  );
}
