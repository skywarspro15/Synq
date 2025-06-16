import Html from "../libs/html.js";

const MIN_WINDOW_WIDTH = 300;
const MIN_WINDOW_HEIGHT = 150;

export default class BaseWindow {
  constructor(title, parentElement, options = {}) {
    this.parentElement = parentElement;
    this.title = title;
    this.options = {
      top: "50px",
      left: "50px",
      width: "80%",
      height: "400px",
      ...options,
    };

    this.window = null;
    this.header = null;
    this.contentArea = null;
    this.resizeHandle = null;

    this.render();
    this.makeDraggable();
    this.makeResizable();
  }

  render() {
    this.window = new Html("div")
      .style({
        position: "absolute",
        top: this.options.top,
        left: this.options.left,
        width: this.options.width,
        height: this.options.height,
        "min-width": `${MIN_WINDOW_WIDTH}px`,
        "min-height": `${MIN_WINDOW_HEIGHT}px`,
        "background-color": "#2c2c2c",
        border: "1px solid #555",
        "border-radius": "8px",
        "box-shadow": "0 5px 15px rgba(0,0,0,0.5)",
        "z-index": "1000",
        color: "#eee",
        "font-family": "sans-serif",
        display: "flex",
        "flex-direction": "column",
      })
      .appendTo(this.parentElement);

    this.header = new Html("div")
      .style({
        padding: "8px 10px",
        "background-color": "#3a3a3a",
        cursor: "move",
        "border-top-left-radius": "8px",
        "border-top-right-radius": "8px",
        "user-select": "none",
        display: "flex",
        "justify-content": "space-between",
        "align-items": "center",
        "flex-shrink": "0",
      })
      .appendTo(this.window);

    new Html("span").text(this.title).appendTo(this.header);

    // Add Close Button
    const controls = new Html("div").appendTo(this.header);
    new Html("button")
      .text("✕")
      .style({
        background: "none",
        border: "none",
        color: "#ccc",
        "font-size": "16px",
        cursor: "pointer",
        padding: "0 5px",
      })
      .on("click", () => this.close())
      .appendTo(controls);

    this.contentArea = new Html("div")
      .style({
        "flex-grow": "1",
        position: "relative",
        overflow: "auto",
      })
      .appendTo(this.window);

    this.resizeHandle = new Html("div")
      .style({
        position: "absolute",
        bottom: "0px",
        right: "0px",
        width: "15px",
        height: "15px",
        cursor: "se-resize",
        "z-index": "1001",
      })
      .appendTo(this.window);
  }

  close() {
    this.window.cleanup();
  }

  makeDraggable() {
    let isDragging = false;
    let offsetX, offsetY;
    const onMouseDown = (e) => {
      if (e.target.tagName === "BUTTON") return;
      isDragging = true;
      offsetX = e.clientX - this.window.elm.offsetLeft;
      offsetY = e.clientY - this.window.elm.offsetTop;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };
    const onMouseMove = (e) => {
      if (isDragging) {
        this.window.style({
          left: `${e.clientX - offsetX}px`,
          top: `${e.clientY - offsetY}px`,
        });
      }
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
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
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
