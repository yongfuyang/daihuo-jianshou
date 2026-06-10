"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { LuWand, LuClock, LuImage, LuArrowRight, LuBookmarkPlus, LuTrash2, LuPencil, LuCheck, LuX } from "react-icons/lu";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { Shot } from "@/lib/db/schema";
import { useTemplateStore } from "@/lib/stores/template-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { generateId } from "@/lib/utils";

// 镜头类型标签
const shotTypeLabels: Record<Shot["type"], { label: string; color: string }> = {
  hook: { label: "钩子", color: "bg-red-500/20 text-red-400" },
  pain_point: { label: "痛点", color: "bg-orange-500/20 text-orange-400" },
  product_reveal: { label: "产品", color: "bg-blue-500/20 text-blue-400" },
  demo: { label: "演示", color: "bg-green-500/20 text-green-400" },
  social_proof: { label: "背书", color: "bg-purple-500/20 text-purple-400" },
  cta: { label: "转化", color: "bg-amber-500/20 text-amber-400" },
};

const styleLabels: Record<string, string> = {
  pain_point: "痛点种草",
  scene: "场景安利",
  comparison: "对比测评",
  story: "剧情故事",
  auto: "智能推荐",
  custom: "自定义",
};

interface ScriptData {
  id: string;
  projectId: string;
  styleType: string;
  title: string | null;
  totalDuration: number | null;
  shots: Shot[];
  selected: boolean;
}

export default function ScriptPage() {
  const { id } = useParams<{ id: string }>();
  const { llm } = useSettingsStore();

  // 项目和脚本数据
  const [project, setProject] = useState<{ name: string; productName: string | null; productImages: string[] } | null>(null);
  const [scripts, setScripts] = useState<ScriptData[]>([]);
  const [selectedScript, setSelectedScript] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 镜头编辑状态
  const [editingShotId, setEditingShotId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Shot>>({});
  const [isSavingShot, setIsSavingShot] = useState(false);

  // 脚本删除状态
  const [isDeletingScript, setIsDeletingScript] = useState<string | null>(null);

  // 脚本名称编辑状态
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const currentScript = scripts[selectedScript];

  // 模板相关状态
  const { addTemplate } = useTemplateStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedTip, setSavedTip] = useState(false);

  // 加载项目和脚本数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projectRes, scriptsRes] = await Promise.all([
        fetch(`/api/project/${id}`),
        fetch(`/api/scripts?projectId=${id}`),
      ]);

      if (!projectRes.ok) throw new Error("项目不存在");
      const projectData = await projectRes.json();
      setProject(projectData);

      if (scriptsRes.ok) {
        const scriptList = await scriptsRes.json();
        if (Array.isArray(scriptList) && scriptList.length > 0) {
          setScripts(scriptList);
          // 选中标记为 selected 的脚本，或默认第一个
          const selectedIdx = scriptList.findIndex((s: ScriptData) => s.selected);
          setSelectedScript(selectedIdx >= 0 ? selectedIdx : 0);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 重新生成脚本
  const handleRegenerate = async () => {
    if (!project || isRegenerating) return;
    if (!llm.apiKey || !llm.baseUrl || !llm.model) {
      setError("请先在设置中配置 LLM");
      return;
    }
    setIsRegenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/llm/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          productName: project.productName,
          productImages: project.productImages || [],
          llmConfig: {
            baseUrl: llm.baseUrl,
            apiKey: llm.apiKey,
            model: llm.model,
            visionModel: llm.visionModel,
          },
        }),
      });
      if (!res.ok) throw new Error("脚本生成失败");
      const data = await res.json();

      if (data.scripts?.length > 0) {
        // 保存到数据库
        await fetch("/api/scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: id, scriptList: data.scripts }),
        });
        // 重新加载
        await loadData();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "重新生成失败");
    } finally {
      setIsRegenerating(false);
    }
  };

  /** 点击"存为模板"按钮 */
  const handleSaveAsTemplate = () => {
    setTemplateName("");
    setShowSaveDialog(true);
  };

  /** 确认保存模板 */
  const doSaveTemplate = () => {
    if (!templateName.trim() || !currentScript) return;
    addTemplate({
      id: generateId(),
      name: templateName.trim(),
      styleType: currentScript.styleType,
      shots: currentScript.shots as Shot[],
      totalDuration: currentScript.totalDuration ?? 0,
      useCount: 0,
      createdAt: new Date(),
    });
    setShowSaveDialog(false);
    setSavedTip(true);
    setTimeout(() => setSavedTip(false), 3000);
  };

  /** 保存脚本名称 */
  const handleSaveTitle = async (scriptId: string) => {
    if (!editTitle.trim()) {
      setEditingTitleId(null);
      return;
    }
    try {
      await fetch(`/api/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setScripts((prev) =>
        prev.map((s) => (s.id === scriptId ? { ...s, title: editTitle.trim() } : s))
      );
    } catch {
      // 静默失败，恢复原标题
    }
    setEditingTitleId(null);
  };

  /** 删除镜头 */
  const handleDeleteShot = async (shotId: number) => {
    if (!currentScript) return;
    const updatedShots = currentScript.shots.filter((s) => s.shotId !== shotId);
    const newTotalDuration = updatedShots.reduce((sum, s) => sum + s.duration, 0);

    try {
      await fetch(`/api/scripts/${currentScript.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shots: updatedShots, totalDuration: newTotalDuration }),
      });
      setScripts((prev) =>
        prev.map((s) =>
          s.id === currentScript.id ? { ...s, shots: updatedShots, totalDuration: newTotalDuration } : s
        )
      );
      // 如果正在编辑被删除的镜头，取消编辑
      if (editingShotId === shotId) {
        setEditingShotId(null);
        setEditForm({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除镜头失败");
    }
  };

  /** 开始编辑镜头 */
  const handleStartEdit = (shot: Shot) => {
    setEditingShotId(shot.shotId);
    setEditForm({
      description: shot.description,
      voiceover: shot.voiceover,
      camera: shot.camera,
      duration: shot.duration,
      prompt: shot.prompt ?? "",
    });
  };

  /** 取消编辑镜头 */
  const handleCancelEdit = () => {
    setEditingShotId(null);
    setEditForm({});
  };

  /** 保存镜头编辑 */
  const handleSaveShot = async () => {
    if (!currentScript || editingShotId === null) return;
    setIsSavingShot(true);
    setError(null);
    try {
      // 构建更新后的 shots 数组
      const updatedShots = currentScript.shots.map((shot) =>
        shot.shotId === editingShotId
          ? {
              ...shot,
              description: editForm.description ?? shot.description,
              voiceover: editForm.voiceover ?? shot.voiceover,
              camera: editForm.camera ?? shot.camera,
              duration: editForm.duration ?? shot.duration,
              prompt: editForm.prompt ?? shot.prompt,
            }
          : shot
      );

      // 计算新的总时长
      const newTotalDuration = updatedShots.reduce((sum, s) => sum + s.duration, 0);

      const res = await fetch(`/api/scripts/${currentScript.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shots: updatedShots,
          totalDuration: newTotalDuration,
        }),
      });

      if (!res.ok) throw new Error("保存失败");

      // 更新本地状态
      setScripts((prev) =>
        prev.map((s) =>
          s.id === currentScript.id
            ? { ...s, shots: updatedShots, totalDuration: newTotalDuration }
            : s
        )
      );
      setEditingShotId(null);
      setEditForm({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存镜头失败");
    } finally {
      setIsSavingShot(false);
    }
  };

  /** 删除脚本 */
  const handleDeleteScript = async (scriptId: string, scriptTitle: string | null, index: number) => {
    const displayName = scriptTitle || `脚本方案 ${index + 1}`;
    if (!confirm(`确定要删除"${displayName}"吗？此操作不可撤销。`)) return;

    setIsDeletingScript(scriptId);
    setError(null);
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("删除失败");

      // 更新本地状态
      const newScripts = scripts.filter((s) => s.id !== scriptId);
      setScripts(newScripts);

      // 调整选中索引
      if (newScripts.length === 0) {
        setSelectedScript(0);
      } else if (selectedScript >= newScripts.length) {
        setSelectedScript(newScripts.length - 1);
      } else if (selectedScript > scripts.findIndex((s) => s.id === scriptId)) {
        setSelectedScript((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除脚本失败");
    } finally {
      setIsDeletingScript(null);
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-muted-foreground">正在加载脚本...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error && !project) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Link href="/">
            <Button variant="outline" size="sm">返回首页</Button>
          </Link>
        </div>
      </div>
    );
  }

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
              <span className="text-lg font-bold tracking-tight">带货剪手</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">{project?.name || "加载中..."}</span>
          </div>

          {/* 步骤进度 */}
          <div className="flex items-center gap-1">
            {["脚本", "素材", "视频", "导出"].map((step, i) => (
              <div key={step} className="flex items-center">
                <div className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${i === 0 ? "bg-white/20" : "bg-muted"}`}>
                    {i + 1}
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
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* 无脚本提示 */}
        {scripts.length === 0 && !isLoading && (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">还没有生成脚本</p>
            <Button
              onClick={handleRegenerate}
              disabled={isRegenerating || !llm.apiKey}
              className="brand-gradient text-white"
            >
              {isRegenerating ? "生成中..." : "生成脚本"}
            </Button>
          </div>
        )}

        {scripts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：脚本方案选择 */}
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">脚本方案</h2>
                <div className="flex items-center gap-2">
                  {savedTip && (
                    <span className="text-xs text-green-400 animate-in fade-in">已保存为模板</span>
                  )}
                  <Button variant="outline" size="sm" className="text-xs" onClick={handleSaveAsTemplate}>
                    <LuBookmarkPlus className="w-3.5 h-3.5 mr-1" />
                    存为模板
                  </Button>
                  <Button variant="outline" size="sm" disabled={isRegenerating} className="text-xs" onClick={handleRegenerate}>
                    <LuWand className="w-3.5 h-3.5 mr-1" />
                    {isRegenerating ? "生成中..." : "重新生成"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {scripts.map((script, index) => (
                  <Card
                    key={script.id}
                    className={`cursor-pointer transition-all ${selectedScript === index ? "ring-2 ring-primary neon-glow" : "glass-card card-hover"}`}
                    onClick={() => setSelectedScript(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        {editingTitleId === script.id ? (
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => handleSaveTitle(script.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveTitle(script.id);
                                if (e.key === "Escape") setEditingTitleId(null);
                              }}
                              className="h-6 text-sm font-medium p-1 min-w-0"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          <h3 className="font-medium text-sm truncate">{script.title || `脚本方案 ${index + 1}`}</h3>
                        )}
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Badge variant="secondary" className="text-xs">
                            {styleLabels[script.styleType] || script.styleType}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTitleId(script.id);
                              setEditTitle(script.title || `脚本方案 ${index + 1}`);
                            }}
                            title="编辑名称"
                          >
                            <LuPencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                            disabled={isDeletingScript === script.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScript(script.id, script.title, index);
                            }}
                            title="删除脚本"
                          >
                            <LuTrash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{script.shots?.length || 0} 个镜头</span>
                        <span>{script.totalDuration || 0}s</span>
                      </div>
                      {/* 镜头类型预览条 */}
                      {script.shots?.length > 0 && (
                        <div className="mt-3 flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                          {script.shots.map((shot) => {
                            const colors: Record<string, string> = {
                              hook: "bg-red-500", pain_point: "bg-orange-500",
                              product_reveal: "bg-blue-500", demo: "bg-green-500",
                              social_proof: "bg-purple-500", cta: "bg-amber-500",
                            };
                            return (
                              <div
                                key={shot.shotId}
                                className={`${colors[shot.type]} opacity-70`}
                                style={{ flex: shot.duration }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 右侧：分镜详情编辑 */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="timeline" className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="timeline">分镜时间线</TabsTrigger>
                    <TabsTrigger value="text">文案编辑</TabsTrigger>
                  </TabsList>
                  <Link href={`/project/${id}/assets`}>
                    <Button className="brand-gradient text-white text-sm">
                      下一步：生成素材
                      <LuArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>

                <TabsContent value="timeline" className="mt-0">
                  <div className="space-y-3">
                    {currentScript?.shots?.map((shot, index) => {
                      const typeInfo = shotTypeLabels[shot.type];
                      const isEditing = editingShotId === shot.shotId;

                      return (
                        <Card key={shot.shotId} className={`glass-card overflow-hidden ${isEditing ? "ring-1 ring-primary/50" : ""}`}>
                          <CardContent className="p-0">
                            <div className="flex">
                              {/* 左侧序号和类型 */}
                              <div className="flex flex-col items-center justify-center w-16 py-4 border-r border-border/50 shrink-0">
                                <span className="text-lg font-bold text-muted-foreground/50">{String(index + 1).padStart(2, "0")}</span>
                                <Badge className={`${typeInfo.color} border-0 text-[10px] mt-1`}>{typeInfo.label}</Badge>
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={editForm.duration ?? shot.duration}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, duration: Number(e.target.value) }))}
                                    className="w-12 h-6 text-[10px] text-center mt-1 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span className="text-[10px] text-muted-foreground mt-1">{shot.duration}s</span>
                                )}
                              </div>
                              {/* 右侧内容 */}
                              <div className="flex-1 p-4">
                                {isEditing ? (
                                  /* 编辑模式 */
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">描述</label>
                                      <Textarea
                                        value={editForm.description ?? ""}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                                        className="mt-1 min-h-[60px] bg-background/50 text-sm"
                                        placeholder="镜头描述"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">配音文案</label>
                                      <Textarea
                                        value={editForm.voiceover ?? ""}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, voiceover: e.target.value }))}
                                        className="mt-1 min-h-[60px] bg-background/50 text-sm"
                                        placeholder="配音文案"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">镜头</label>
                                        <Input
                                          value={editForm.camera ?? ""}
                                          onChange={(e) => setEditForm((prev) => ({ ...prev, camera: e.target.value }))}
                                          className="mt-1 bg-background/50 text-sm"
                                          placeholder="如：中景、特写"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">AI 提示词</label>
                                        <Input
                                          value={editForm.prompt ?? ""}
                                          onChange={(e) => setEditForm((prev) => ({ ...prev, prompt: e.target.value }))}
                                          className="mt-1 bg-background/50 text-sm"
                                          placeholder="AI 生成画面的提示词"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={handleCancelEdit}
                                        disabled={isSavingShot}
                                      >
                                        <LuX className="w-3.5 h-3.5 mr-1" />
                                        取消
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="text-xs brand-gradient text-white"
                                        onClick={handleSaveShot}
                                        disabled={isSavingShot}
                                      >
                                        {isSavingShot ? (
                                          <svg className="animate-spin h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                          </svg>
                                        ) : (
                                          <LuCheck className="w-3.5 h-3.5 mr-1" />
                                        )}
                                        {isSavingShot ? "保存中..." : "保存"}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  /* 展示模式 */
                                  <>
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <p className="text-sm leading-relaxed mb-2">{shot.description}</p>
                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <LuClock className="w-3 h-3" />
                                            {shot.camera}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            {shot.visualSource === "product_image" ? "📷 商品原图" : shot.visualSource === "ai_generate" ? "✨ AI 生成" : "📁 用户上传"}
                                          </span>
                                        </div>
                                      </div>
                                      {/* 画面预览区 */}
                                      <div className="flex items-start gap-2 shrink-0">
                                        <div className="w-20 h-14 bg-muted/30 rounded-md flex items-center justify-center border border-border/30">
                                          {shot.visualSource === "product_image" ? (
                                            <span className="text-[10px] text-muted-foreground">商品图</span>
                                          ) : (
                                            <LuImage className="w-4 h-4 text-muted-foreground/40" />
                                          )}
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0"
                                          onClick={() => handleStartEdit(shot)}
                                          title="编辑镜头"
                                        >
                                          <LuPencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                          onClick={() => {
                                            if (confirm(`确定删除镜头 ${index + 1}「${shot.description.slice(0, 20)}...」吗？`)) {
                                              handleDeleteShot(shot.shotId);
                                            }
                                          }}
                                          title="删除镜头"
                                        >
                                          <LuTrash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                    {/* 配音文案 */}
                                    {shot.voiceover && (
                                      <div className="mt-3 p-2.5 bg-muted/30 rounded-md">
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                          🎙 {shot.voiceover}
                                        </p>
                                      </div>
                                    )}
                                    {/* AI 提示词（只读展示） */}
                                    {shot.prompt && (
                                      <div className="mt-2 p-2 bg-muted/20 rounded-md">
                                        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                                          💡 提示词：{shot.prompt}
                                        </p>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="text" className="mt-0">
                  <Card className="glass-card">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="font-medium text-sm mb-2">完整配音文案</h3>
                      <Textarea
                        className="min-h-[300px] bg-background/50 text-sm leading-relaxed"
                        defaultValue={currentScript?.shots?.map((s) => s.voiceover).filter(Boolean).join("\n\n")}
                      />
                      <p className="text-xs text-muted-foreground">
                        总字数：{currentScript?.shots?.reduce((sum, s) => sum + (s.voiceover?.length || 0), 0) || 0} 字 ·
                        预计时长：{currentScript?.totalDuration || 0}s ·
                        语速：约 {Math.round((currentScript?.shots?.reduce((sum, s) => sum + (s.voiceover?.length || 0), 0) || 0) / (currentScript?.totalDuration || 1) * 10) / 10} 字/秒
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>

      {/* 保存模板弹窗 */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="glass-card w-full max-w-md mx-4">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-base font-semibold">保存为模板</h3>
              <p className="text-xs text-muted-foreground">保存当前脚本结构为模板，下次可直接套用到其他商品</p>
              <Input
                placeholder="模板名称，如：痛点种草-美妆通用"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>取消</Button>
                <Button size="sm" className="brand-gradient text-white" onClick={doSaveTemplate} disabled={!templateName.trim()}>保存</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
