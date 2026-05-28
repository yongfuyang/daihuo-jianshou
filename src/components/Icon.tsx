"use client";

import {
  forwardRef,
  useState,
  useCallback,
  useMemo,
  type ElementType,
} from "react";
import { icons, AlertCircle, type LucideProps } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Size variants via CVA                                             */
/* ------------------------------------------------------------------ */

const iconVariants = cva("inline-flex shrink-0", {
  variants: {
    size: {
      sm: "size-4",
      md: "size-5",
      lg: "size-6",
      xl: "size-8",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

/* ------------------------------------------------------------------ */
/*  Skeleton placeholder for loading state                            */
/* ------------------------------------------------------------------ */

const skeletonVariants = cva(
  "animate-pulse rounded bg-muted/60 inline-block shrink-0",
  {
    variants: {
      size: {
        sm: "size-4",
        md: "size-5",
        lg: "size-6",
        xl: "size-8",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type ImageLoadStatus = "idle" | "loading" | "loaded" | "error";

export interface IconProps
  extends Omit<LucideProps, "ref" | "size">,
    VariantProps<typeof iconVariants> {
  /** Lucide 图标名（如 "Home"、"ChevronRight"），或任意已导出的 lucide 图标名 */
  name?: string;
  /** 网络图片 URL，当 name 无法匹配时自动使用；也可直接传入作为图片模式 */
  src?: string;
  /** 图片加载失败时的自定义 fallback 内容 */
  fallback?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  {
    name,
    src,
    size = "md",
    color,
    className,
    fallback,
    ...restProps
  },
  ref
) {
  /* ---------- Resolve lucide icon ---------- */

  const LucideIconComponent: ElementType | null = useMemo(() => {
    if (!name) return null;
    // icons is a Record<string, ElementType> mapping PascalCase name → component
    const icon = icons[name as keyof typeof icons];
    if (icon) return icon as ElementType;
    // Fallback: try exact import (in case user passes a component ref name)
    return null;
  }, [name]);

  /* ---------- Determine rendering mode ---------- */
  // Priority: name (lucide) > src (image) > fallback default

  const isLucideMode = LucideIconComponent !== null;
  const isImageMode = !isLucideMode && !!src;

  /* ---------- Image loading state ---------- */

  const [imageStatus, setImageStatus] = useState<ImageLoadStatus>(
    isImageMode ? "loading" : "idle"
  );

  const handleImageLoad = useCallback(() => {
    setImageStatus("loaded");
  }, []);

  const handleImageError = useCallback(() => {
    setImageStatus("error");
  }, []);

  /* ---------- Shared class ---------- */

  const mergedClassName = cn(iconVariants({ size, className }));

  /* ---------- Render: Lucide icon ---------- */

  if (isLucideMode) {
    const IconComp = LucideIconComponent;
    return (
      <IconComp
        ref={ref}
        className={mergedClassName}
        color={color}
        {...(restProps as LucideProps)}
      />
    );
  }

  /* ---------- Render: Image mode ---------- */

  if (isImageMode) {
    // Skeleton while loading
    if (imageStatus === "loading" || imageStatus === "idle") {
      return (
        <span
          className={cn(skeletonVariants({ size }), className)}
          aria-label="图标加载中"
        />
      );
    }

    // Error → show fallback or default icon
    if (imageStatus === "error") {
      if (fallback) {
        return <>{fallback}</>;
      }
      return (
        <AlertCircle
          ref={ref}
          className={cn(mergedClassName, "text-muted-foreground/50")}
          aria-label="图标加载失败"
          {...(restProps as LucideProps)}
        />
      );
    }

    // Loaded → show image
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={cn(mergedClassName, "object-contain")}
        style={color ? ({ color } as React.CSSProperties) : undefined}
        onLoad={handleImageLoad}
        onError={handleImageError}
        draggable={false}
      />
    );
  }

  /* ---------- Render: No name & no src → default fallback ---------- */

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <AlertCircle
      ref={ref}
      className={cn(mergedClassName, "text-muted-foreground/50")}
      aria-label="未提供图标"
      {...(restProps as LucideProps)}
    />
  );
});

Icon.displayName = "Icon";

export { Icon, iconVariants };
