"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusToast } from "@/components/ui/status-toast";

export function DevRouteCopyButton() {
  const pathname = usePathname();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (process.env.NODE_ENV !== "development") return null;

  function copyWithLegacyApi() {
    const input = document.createElement("textarea");
    input.value = pathname;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();

    const copied = document.execCommand("copy");
    input.remove();
    setToastMessage(copied ? "Copied" : "Unable to copy route");
  }

  function copyRoute() {
    if (!navigator.clipboard?.writeText) {
      copyWithLegacyApi();
      return;
    }

    void navigator.clipboard
      .writeText(pathname)
      .then(() => setToastMessage("Copied"), copyWithLegacyApi);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Copy current route"
        title="Copy current route"
        onClick={copyRoute}
        className="fixed top-3 right-24 z-40 size-12 rounded-full border shadow-lg sm:right-28"
      >
        <Copy aria-hidden="true" className="size-5" />
      </Button>
      {toastMessage && (
        <StatusToast
          key={toastMessage}
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </>
  );
}
