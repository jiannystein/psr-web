import type { TriggerType } from "@models/models";

export interface InputEvent {
  triggerType: TriggerType;
  cursor?: { x: number; y: number };
}

export interface InputTriggerSubscription {
  dispose: () => void;
}

export function attachInputTriggers(callback: (event: InputEvent) => void): InputTriggerSubscription {
  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      callback({
        triggerType: "left",
        cursor: { x: e.clientX, y: e.clientY }
      });
    } else if (e.button === 2) {
      callback({
        triggerType: "right",
        cursor: { x: e.clientX, y: e.clientY }
      });
    }
  };

  const onDoubleClick = (e: MouseEvent) => {
    callback({
      triggerType: "double",
      cursor: { x: e.clientX, y: e.clientY }
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      callback({ triggerType: "keyboard-enter" });
    } else if (e.key === "Tab") {
      callback({ triggerType: "keyboard-tab" });
    }
  };

  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("dblclick", onDoubleClick);
  document.addEventListener("keydown", onKeyDown);

  return {
    dispose: () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("dblclick", onDoubleClick);
      document.removeEventListener("keydown", onKeyDown);
    }
  };
}
