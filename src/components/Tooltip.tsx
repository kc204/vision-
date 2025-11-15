"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
} from "react";

import type {
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
} from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({
  content,
  children,
  className,
  side = "top",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      hide();
    }
  };

  const trigger = Children.only(children);

  if (!isValidElement(trigger)) {
    throw new Error("Tooltip expects a single React element child");
  }

  const { onFocus, onBlur, onMouseEnter, onMouseLeave, onKeyDown } =
    trigger.props as Record<string, unknown>;

  const enhancedChild = cloneElement(trigger, {
    "aria-describedby": visible ? tooltipId : undefined,
    onFocus: (event: FocusEvent<Element>) => {
      show();
      if (typeof onFocus === "function") {
        onFocus(event);
      }
    },
    onBlur: (event: FocusEvent<Element>) => {
      hide();
      if (typeof onBlur === "function") {
        onBlur(event);
      }
    },
    onMouseEnter: (event: MouseEvent<Element>) => {
      show();
      if (typeof onMouseEnter === "function") {
        onMouseEnter(event);
      }
    },
    onMouseLeave: (event: MouseEvent<Element>) => {
      hide();
      if (typeof onMouseLeave === "function") {
        onMouseLeave(event);
      }
    },
    onKeyDown: (event: KeyboardEvent<Element>) => {
      handleKeyDown(event);
      if (typeof onKeyDown === "function") {
        onKeyDown(event);
      }
    },
  });

  const positionClass = (() => {
    switch (side) {
      case "bottom":
        return "left-1/2 top-full mt-2 -translate-x-1/2";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 -mr-2";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2";
      case "top":
      default:
        return "left-1/2 -top-2 -translate-y-full -translate-x-1/2";
    }
  })();

  return (
    <span className={`relative inline-flex ${className ?? ""}`}>
      {enhancedChild}
      <span
        role="tooltip"
        id={tooltipId}
        className={`pointer-events-none absolute z-50 w-max max-w-xs rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-lg transition-opacity duration-150 ${positionClass} ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={visible ? undefined : true}
      >
        {content}
      </span>
    </span>
  );
}
