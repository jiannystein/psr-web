export function attachInputTriggers(callback) {
    const onMouseDown = (e) => {
        if (e.button === 0) {
            callback({
                triggerType: "left",
                cursor: { x: e.clientX, y: e.clientY }
            });
        }
        else if (e.button === 2) {
            callback({
                triggerType: "right",
                cursor: { x: e.clientX, y: e.clientY }
            });
        }
    };
    const onDoubleClick = (e) => {
        callback({
            triggerType: "double",
            cursor: { x: e.clientX, y: e.clientY }
        });
    };
    const onKeyDown = (e) => {
        if (e.key === "Enter") {
            callback({ triggerType: "keyboard-enter" });
        }
        else if (e.key === "Tab") {
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
