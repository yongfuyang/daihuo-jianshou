"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {LuWand, LuClock, LuImage, LuArrowRight, LuBookmarkPlus, LuLoader, LuSave, LuPencil, LuCheck, LuX, LuTrash2, LuPlus} from "react-icons/lu";
import { generateId } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { Shot } from "@/lib/db/schema";
import { useTemplateStore } from "@/lib/stores/template-store";

// 脚本数据类型（从 API 返回的结构）
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

const styleLabels: Record<string, string> = {
  pain_point: "痛点种草",
  scene: "场景安利",
  comparison: "对比测评",
  story: "剧情故事",
  product_showcase: "商品展示",
};

export default function ScriptPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedScript, setSelectedScript] = useState(0);
  const [scripts, setScripts] = useState<ScriptData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingShot, setEditingShot] = useState<number | null>(null);
  const [editDescriptions, setEditDescriptions] = useState<Record<number, string>>({});
  const [editVoiceovers, setEditVoiceovers] = useState<Record<number, string>>({});
  const [editScriptText, setEditScriptText] = useState("");
  const [savedTip, setSavedTip] = useState(false);
  const [editingScriptTitle, setEditingScriptTitle] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");

  // 从 API 加载脚本数据
  useEffect(() => {
    if (!id) return;
    const fetchScripts = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/scripts?projectId=${id}`);
        if (!res.ok) throw new Error(`加载脚本失败 (${res.status})`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setScripts(data);
        }
      } catch (e) {
        console.error("加载脚本失败:", e);
        setLoadError(e instanceof Error ? e.message : "加载脚本失败");
      } finally {
        setIsLoading(false);
      }
    };
    fetchScripts();
  }, [id]);

  // 同步文案编辑textarea与当前脚本
  useEffect(() => {
    if (currentScript) {
      setEditScriptText(currentScript.shots.map(s => s.voiceover).join("\n"));
    }
  }, [selectedScript, scripts]);

  const currentScript = scripts[Math.min(selectedScript, scripts.length - 1)];

  // ===== 编辑相关函数 =====
  const startEditingShot = (shotId: number) => {
    setEditingShot(shotId);
    setEditDescriptions(prev => ({ ...prev, [shotId]: currentScript.shots.find(s => s.shotId === shotId)?.description || "" }));
    setEditVoiceovers(prev => ({ ...prev, [shotId]: currentScript.shots.find(s => s.shotId === shotId)?.voiceover || "" }));
  };

  const cancelEditingShot = () => {
    setEditingShot(null);
    setEditDescriptions({});
    setEditVoiceovers({});
  };

  const saveShotEdit = (shotId: number) => {
    const desc = editDescriptions[shotId];
    const voice = editVoiceovers[shotId];
    if (!desc && !voice) {
      cancelEditingShot();
      return;
    }
    const updatedScripts = scripts.map(script => ({
      ...script,
      shots: script.shots.map(shot =>
        shot.shotId === shotId
          ? { ...shot, description: desc ?? shot.description, voiceover: voice ?? shot.voiceover }
          : shot
      )
    }));
    setScripts(updatedScripts);
    cancelEditingShot();
    showSavedTip();
    // Persist to API in background
    if (currentScript) {
      fetch(`/api/scripts/${currentScript.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shots: updatedScripts.find(s => s.id === currentScript.id)?.shots,
        }),
      }).catch(e => console.error("保存分镜失败:", e));
    }
  };

  const showSavedTip = () => {
    setSavedTip(true);
    setTimeout(() => setSavedTip(false), 2000);
  };

  const saveAllScriptText = () => {
    if (!currentScript) return;
    const lines = editScriptText.split("\n").filter(l => l.trim());
    setScripts(prev => prev.map((script, idx) => {
      if (idx !== selectedScript) return script;
      return {
        ...script,
        shots: script.shots.map((shot, i) => ({
          ...shot,
          voiceover: lines[i] || shot.voiceover
        }))
      };
    }));
    showSavedTip();
  };

  const saveEditedScript = async () => {
    try {
      // 逐个保存已修改的脚本到 API
      for (const script of scripts) {
        await fetch(`/api/scripts/${script.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shots: script.shots,
            title: script.title,
            totalDuration: script.totalDuration,
          }),
        });
      }
      showSavedTip();
    } catch (e) {
      console.error("保存脚本失败:", e);
      alert("保存失败，请重试");
    }
  };

  // ===== 模板相关状态 =====
  const { addTemplate } = useTemplateStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const handleSaveAsTemplate = useCallback(() => {
    setTemplateName("");
    setShowSaveDialog(true);
  }, []);

  const handleRegenerate = useCallback(async () => {
    if (!currentScript) return;
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          style: currentScript.styleType,
        }),
      });
      if (!response.ok) throw new Error("生成失败");
      const data = await response.json();
      // Save generated scripts to DB via API
      if (data.scripts && Array.isArray(data.scripts)) {
        const saveRes = await fetch("/api/scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: id,
            scriptList: data.scripts.map((s: any) => ({
              styleType: s.styleType,
              title: s.title,
              totalDuration: s.totalDuration,
              shots: s.shots,
            })),
          }),
        });
        if (saveRes.ok) {
          const saved = await saveRes.json();
          setScripts(saved);
        } else {
          setScripts(data.scripts);
        }
      }
    } catch (e) {
      console.error("生成脚本失败:", e);
      alert("生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  }, [id, currentScript]);

  /** 确认保存模板 */
  const doSaveTemplate = () => {
    if (!templateName.trim() || !currentScript) return;
    addTemplate({
      id: generateId(),
      name: templateName.trim(),
      styleType: currentScript.styleType,
      shots: currentScript.shots as Shot[],
      totalDuration: currentScript.totalDuration,
      useCount: 0,
      createdAt: new Date(),
    });
    setShowSaveDialog(false);
    setSavedTip(true);
    setTimeout(() => setSavedTip(false), 3000);
  };

  // ===== 新增脚本 =====
  const handleAddScript = async () => {
    try {
      // 用 PATCH 的 body 中传 action=add 来区分，或者直接用 POST 但只发一条
      // 这里用 PATCH /api/scripts?projectId=X 的方式不太好，直接插入
      const newId = generateId();
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          scriptList: [
            ...scripts.map(s => ({
              styleType: s.styleType,
              title: s.title,
              totalDuration: s.totalDuration,
              shots: s.shots,
            })),
            { styleType: "custom", title: "新脚本", totalDuration: 0, shots: [] },
          ],
        }),
      });
      if (!res.ok) throw new Error("新增脚本失败");
      const saved = await res.json();
      setScripts(saved);
      setSelectedScript(saved.length - 1);
    } catch (e) {
      console.error("新增脚本失败:", e);
      alert("新增脚本失败，请重试");
    }
  };

  // ===== 删除脚本 =====
  const handleDeleteScript = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const script = scripts[index];
    if (!confirm(`确定删除脚本「${script.title}」？此操作不可撤销。`)) return;
    try {
      const res = await fetch(`/api/scripts/${script.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      const newScripts = scripts.filter((_, i) => i !== index);
      setScripts(newScripts);
      // 调整选中索引
      if (selectedScript >= newScripts.length) {
        setSelectedScript(Math.max(0, newScripts.length - 1));
      } else if (selectedScript > index) {
        setSelectedScript(selectedScript - 1);
      } else if (selectedScript === index) {
        setSelectedScript(Math.min(index, newScripts.length - 1));
      }
    } catch (e) {
      console.error("删除脚本失败:", e);
      alert("删除脚本失败，请重试");
    }
  };

  // ===== 脚本改名 =====
  const startEditingTitle = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingScriptTitle(index);
    setEditTitleValue(scripts[index].title);
  };

  const confirmTitleEdit = async () => {
    if (editingScriptTitle === null) return;
    const newTitle = editTitleValue.trim() || scripts[editingScriptTitle].title;
    const script = scripts[editingScriptTitle];
    setScripts(prev => prev.map((s, i) => i === editingScriptTitle ? { ...s, title: newTitle } : s));
    setEditingScriptTitle(null);
    // 保存到 API
    try {
      await fetch(`/api/scripts/${script.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (e) {
      console.error("保存标题失败:", e);
    }
  };

  // ===== 删除分镜 =====
  const handleDeleteShot = async (shotId: number) => {
    if (!currentScript) return;
    const shot = currentScript.shots.find(s => s.shotId === shotId);
    if (!confirm(`确定删除分镜${shot ? `「${shot.description?.slice(0, 20) || '#' + shotId}」` : ''}？`)) return;
    const updatedShots = currentScript.shots.filter(s => s.shotId !== shotId);
    const updatedScripts = scripts.map((s, i) =>
      i === selectedScript ? { ...s, shots: updatedShots, totalDuration: updatedShots.reduce((sum, sh) => sum + sh.duration, 0) } : s
    );
    setScripts(updatedScripts);
    if (editingShot === shotId) cancelEditingShot();
    try {
      await fetch(`/api/scripts/${currentScript.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shots: updatedShots, totalDuration: updatedShots.reduce((sum, sh) => sum + sh.duration, 0) }),
      });
    } catch (e) {
      console.error("删除分镜失败:", e);
    }
  };

  // ===== 新增分镜 =====
  const handleAddShot = () => {
    if (!currentScript) return;
    const maxShotId = currentScript.shots.reduce((max, s) => Math.max(max, s.shotId), 0);
    const newShotId = maxShotId + 1;
    const newShot: Shot = {
      shotId: newShotId,
      type: "hook",
      duration: 3,
      description: "",
      camera: "中景",
      visualSource: "ai_generate",
      transition: "ai_start_end",
      voiceover: "",
    };
    const updatedShots = [...currentScript.shots, newShot];
    const updatedScripts = scripts.map((s, i) =>
      i === selectedScript ? { ...s, shots: updatedShots, totalDuration: updatedShots.reduce((sum, sh) => sum + sh.duration, 0) } : s
    );
    setScripts(updatedScripts);
    // 自动进入编辑模式
    startEditingShot(newShotId);
    // 保存到 API
    fetch(`/api/scripts/${currentScript.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shots: updatedShots, totalDuration: updatedShots.reduce((sum, sh) => sum + sh.duration, 0) }),
    }).catch(e => console.error("保存新分镜失败:", e));
  };

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
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LuLoader className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">加载脚本数据...</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-destructive mb-2">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </div>
        ) : scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground mb-2">暂无脚本数据</p>
            <Button variant="outline" size="sm" onClick={() => {
              if (currentScript) handleRegenerate();
            }}>
              生成脚本
            </Button>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：脚本方案选择 */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">脚本方案 <span className="text-xs text-green-400">v2</span></h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={saveEditedScript}>
                  <LuSave className="w-3.5 h-3.5 mr-1" />
                  保存编辑
                </Button>
                {savedTip && (
                  <span className="text-xs text-green-400 animate-in fade-in">已保存为模板</span>
                )}
                <Button variant="outline" size="sm" className="text-xs" onClick={handleSaveAsTemplate} disabled={isGenerating}>
                  <LuBookmarkPlus className="w-3.5 h-3.5 mr-1" />
                  存为模板
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={handleRegenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <LuLoader className="w-3.5 h-3.5 mr-1 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <LuWand className="w-3.5 h-3.5 mr-1" />
                      重新生成
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {scripts.map((script, index) => (
                <Card
                  key={script.id}
                  className={`cursor-pointer transition-all ${selectedScript === index ? "ring-2 ring-primary neon-glow" : "glass-card card-hover"}`}
                  onClick={() => { if (editingScriptTitle !== index) setSelectedScript(index); }}
                >
                  <CardContent className="px-2 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1" onDoubleClick={(e) => startEditingTitle(index, e)}>
                        {editingScriptTitle === index ? (
                          <Input
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            onBlur={confirmTitleEdit}
                            onKeyDown={(e) => { if (e.key === "Enter") confirmTitleEdit(); if (e.key === "Escape") setEditingScriptTitle(null); }}
                            className="text-sm h-6"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        ) : (
                          <>
                            <h3 className="font-medium text-sm truncate">{script.title}</h3>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {styleLabels[script.styleType]}
                            </Badge>
                          </>
                        )}
                      </div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "4px" }}>
                        <button className="icon-btn text-muted-foreground hover:text-primary" onClick={(e) => startEditingTitle(index, e)} title="重命名">
                          <LuPencil style={{ width: 12, height: 12 }} />
                        </button>
                        <button className="icon-btn text-muted-foreground hover:text-red-500" onClick={(e) => handleDeleteScript(index, e)} title="删除脚本">
                          <LuTrash2 style={{ width: 12, height: 12 }} />
                        </button>
                        <button className="icon-btn text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); handleAddScript(); }} title="新增脚本">
                          <LuPlus style={{ width: 12, height: 12 }} />
                        </button>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{script.shots.length} 个镜头</span>
                      <span>{script.totalDuration}s</span>
                    </div>
                    {/* 镜头类型预览条 */}
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
                <div className="flex items-center gap-2">
                  <Link href={`/project/${id}/storyboard`}>
                    <Button variant="outline" size="sm">
                      分镜编辑器
                      <LuArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                  <Link href={`/project/${id}/assets`}>
                    <Button className="brand-gradient text-white text-sm">
                      下一步：生成素材
                      <LuArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>

              <TabsContent value="timeline" className="mt-0">
                <div className="space-y-3">
                  {currentScript?.shots.map((shot, index) => {
                    const typeInfo = shotTypeLabels[shot.type] || { label: "其他", color: "bg-gray-500/20 text-gray-400" };
                    return (
                      <Card key={shot.shotId} className="glass-card overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex">
                            {/* 左侧序号和类型 */}
                            <div className="flex flex-col items-center justify-center w-16 py-4 border-r border-border/50 shrink-0">
                              <span className="text-lg font-bold text-muted-foreground/50">{String(index + 1).padStart(2, "0")}</span>
                              <Badge className={`${typeInfo.color} border-0 text-[10px] mt-1`}>{typeInfo.label}</Badge>
                              <span className="text-[10px] text-muted-foreground mt-1">{shot.duration}s</span>
                            </div>
                            {/* 右侧内容 */}
                            <div className="flex-1 p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  {editingShot === shot.shotId ? (
                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">画面描述</label>
                                        <Textarea
                                          value={editDescriptions[shot.shotId] || ""}
                                          onChange={(e) => setEditDescriptions(prev => ({ ...prev, [shot.shotId]: e.target.value }))}
                                          className="text-sm min-h-[60px]"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">配音文案</label>
                                        <Textarea
                                          value={editVoiceovers[shot.shotId] || ""}
                                          onChange={(e) => setEditVoiceovers(prev => ({ ...prev, [shot.shotId]: e.target.value }))}
                                          className="text-sm min-h-[60px]"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={() => saveShotEdit(shot.shotId)} className="text-xs bg-emerald-600 hover:bg-emerald-700">
                                          <LuCheck className="w-3 h-3 mr-1" />
                                          保存
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={cancelEditingShot} className="text-xs">
                                          <LuX className="w-3 h-3 mr-1" />
                                          取消
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <p className="text-sm leading-relaxed">{shot.description}</p>
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
                                  )}
                                </div>
                                {/* 操作按钮和画面预览区 */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                                    <button className="icon-btn text-muted-foreground hover:text-primary" onClick={() => startEditingShot(shot.shotId)} title="编辑此分镜">
                                      <LuPencil style={{ width: 14, height: 14 }} />
                                    </button>
                                    <button className="icon-btn text-muted-foreground hover:text-red-500" onClick={() => handleDeleteShot(shot.shotId)} title="删除此分镜">
                                      <LuTrash2 style={{ width: 14, height: 14 }} />
                                    </button>
                                    <button className="icon-btn text-muted-foreground hover:text-primary" onClick={handleAddShot} title="在末尾添加分镜">
                                      <LuPlus style={{ width: 14, height: 14 }} />
                                    </button>
                                  </span>
                                  <div className="w-14 h-10 bg-muted/30 rounded-md shrink-0 flex items-center justify-center border border-border/30">
                                    {shot.visualSource === "product_image" ? (
                                      <span className="text-[8px] text-muted-foreground">商品图</span>
                                    ) : (
                                      <LuImage className="w-3 h-3 text-muted-foreground/40" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* 配音文案 */}
                              {shot.voiceover && editingShot !== shot.shotId && (
                                <div className="mt-3 p-2.5 bg-muted/30 rounded-md">
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    🎙 {shot.voiceover}
                                  </p>
                                </div>
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
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm">完整配音文案</h3>
                      <Button size="sm" onClick={saveAllScriptText} className="text-xs bg-emerald-600 hover:bg-emerald-700">
                        <LuSave className="w-3 h-3 mr-1" />
                        保存文案
                      </Button>
                    </div>
                    <Textarea
                      value={editScriptText}
                      onChange={(e) => setEditScriptText(e.target.value)}
                      className="min-h-[300px] bg-background/50 text-sm leading-relaxed"
                    />
                    <p className="text-xs text-muted-foreground">
                      总字数：{editScriptText.split("\n").filter(l => l.trim()).length} 行 ·
                      预计时长：{currentScript?.totalDuration}s ·
                      语速：约 {Math.round((currentScript?.shots.reduce((sum, s) => sum + (s.voiceover?.length || 0), 0) || 0) / (currentScript?.totalDuration || 1) * 10) / 10} 字/秒
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
