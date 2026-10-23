"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "cn";

function Tabs({
  className,
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-10 items-center justify-start rounded-xl bg-slate-200/70 p-1 text-slate-600 gap-1",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 text-slate-600 hover:text-slate-900 data-[selected]:bg-white data-[selected]:text-[#17372e] data-[selected]:font-semibold data-[selected]:shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-600",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
