"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import {
  NavigationTabButton,
  NavigationTabs,
} from "@/components/shared/navigation-tabs";

export interface ManageCollectionTab<T extends string = string> {
  key: T;
  label: string;
  icon: LucideIcon;
}

export interface ManageCollectionDrawerProps<T extends string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  tabs: ManageCollectionTab<T>[];
  activeTab: T;
  onTabChange: (key: T) => void;
  footer: React.ReactNode;
  maxWidthClass?: string;
  mobileMinHeightClass?: string;
  children: React.ReactNode;
}

/**
 * Shared "Manage <collection>" drawer: a ResponsiveEditor shell with a
 * segmented tab bar (add / import / export style flows) and feature-provided
 * tab content. Mobile renders a bottom drawer, desktop a centered dialog.
 */
export function ManageCollectionDrawer<T extends string>({
  open,
  onOpenChange,
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  footer,
  maxWidthClass,
  mobileMinHeightClass,
  children,
}: ManageCollectionDrawerProps<T>) {
  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
      maxWidthClass={maxWidthClass}
      mobileMinHeightClass={mobileMinHeightClass}
    >
      <div className="space-y-6 pt-1 pb-4">
        <NavigationTabs aria-label={`${title} options`} className="w-full">
          {tabs.map((tab) => (
            <NavigationTabButton
              key={tab.key}
              active={activeTab === tab.key}
              onClick={() => onTabChange(tab.key)}
              icon={tab.icon}
            >
              {tab.label}
            </NavigationTabButton>
          ))}
        </NavigationTabs>
        {children}
      </div>
    </ResponsiveEditor>
  );
}
