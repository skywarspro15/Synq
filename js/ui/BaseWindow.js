import Html from "../libs/html.js";
import { createCloseButton } from "./components.js";

const MIN_WINDOW_WIDTH = 300;
const MIN_WINDOW_HEIGHT = 150;

export default class BaseWindow {
  // Static properties to manage z-index across all windows
  static highestZ = 1000;
  static windows = [];

  constructor(title, parentElement, options = {}) {
    this.parentElement = parentElement;
    this.title = title;
    this.options = {
      top: "50px",
      left: "50px",
      width: "80%",
      height: "400px",
      controls: [],
      toolbar: null,
      ...options,
    };

    this.window = null;
    this.header = null;
    this.contentArea = null;
    this.resizeHandle = null;

    this.render();
    this.makeDraggable();
    this.makeResizable();

    BaseWindow.windows.push(this);
    this.bringToFront();
  }

  bringToFront() {
    BaseWindow.highestZ++;
    this.window.style({ "z-index": BaseWindow.highestZ });
  }

  close() {
    if (this.onClose) this.onClose();
    this.window.cleanup();
    // Remove from the static list to prevent memory leaks
    BaseWindow.windows = BaseWindow.windows.filter((w) => w !== this);
  }

  render() {
    this.window = new Html("div")
      .classOn("daw-window")
      .style({
        top: this.options.top,
        left: this.options.left,
        width: this.options.width,
        height: this.options.height,
      })
      .on("mousedown", () => this.bringToFront(), true) // Use capture to ensure it fires first
      .appendTo(this.parentElement);

    this.header = new Html("div")
      .classOn("daw-window__header")
      .appendTo(this.window);
    new Html("span")
      .classOn("daw-window__header-title")
      .text(this.title)
      .appendTo(this.header);

    const headerControls = new Html("div")
      .classOn("daw-window__header-controls")
      .appendTo(this.header);
    this.options.controls.forEach((control) =>
      control.appendTo(headerControls)
    );
    createCloseButton(() => this.close()).appendTo(headerControls);

    if (this.options.toolbar) {
      this.options.toolbar.classOn("daw-window__toolbar").appendTo(this.window);
    }

    this.contentArea = new Html("div")
      .classOn("daw-window__content")
      .appendTo(this.window);
    this.resizeHandle = new Html("div")
      .classOn("daw-window__resize-handle")
      .appendTo(this.window);
  }

  makeDraggable() {
    let isDragging = false,
      offsetX,
      offsetY;
    const onMouseDown = (e) => {
      if (
        e.target.tagName === "BUTTON" ||
        e.target.tagName === "SELECT" ||
        e.target.tagName === "INPUT"
      )
        return;
      isDragging = true;
      offsetX = e.clientX - this.window.elm.offsetLeft;
      offsetY = e.clientY - this.window.elm.offsetTop;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };
    const onMouseMove = (e) => {
      if (isDragging)
        this.window.style({
          left: `${e.clientX - offsetX}px`,
          top: `${e.clientY - offsetY}px`,
        });
    };
    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    this.header.on("mousedown", onMouseDown);
  }

  makeResizable() {
    const handle = this.resizeHandle.elm;
    const windowElm = this.window.elm;
    let isResizing = false,
      startX,
      startY,
      startWidth,
      startHeight;
    const onMouseDown = (e) => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = windowElm.offsetWidth;
      startHeight = windowElm.offsetHeight;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };
    const onMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = startWidth + (e.clientX - startX);
      const newHeight = startHeight + (e.clientY - startY);
      if (newWidth >= MIN_WINDOW_WIDTH)
        this.window.style({ width: `${newWidth}px` });
      if (newHeight >= MIN_WINDOW_HEIGHT)
        this.window.style({ height: `${newHeight}px` });
    };
    const onMouseUp = () => {
      isResizing = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    handle.addEventListener("mousedown", onMouseDown);
  }
}
