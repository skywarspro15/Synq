import Html from "../libs/html.js";

export function createButton(text, onClick) {
  const button = new Html("button").classOn("daw-button").text(text);
  if (onClick) button.on("click", onClick);
  return button;
}

export function createCloseButton(onClick) {
  return createButton("✕", onClick).classOn("close");
}

export function createLabel(text) {
  return new Html("label").classOn("daw-label").text(text);
}

export function createSelect(options, onChange) {
  const select = new Html("select").classOn("daw-select");
  options.forEach((opt) => {
    new Html("option")
      .attr({ value: opt.value })
      .text(opt.text)
      .appendTo(select);
  });
  if (onChange) select.on("change", onChange);
  return select;
}

export function createCheckbox(label, isChecked, onChange) {
  const labelEl = new Html("label").classOn("daw-checkbox-label").text(label);
  const check = new Html("input").attr({ type: "checkbox" }).prependTo(labelEl);
  check.elm.checked = isChecked;
  if (onChange) check.on("change", onChange);
  return labelEl;
}

export function createSlider(options, onInput) {
  const slider = new Html("input").classOn("daw-input").attr({
    type: "range",
    min: options.min,
    max: options.max,
    step: options.step,
    value: options.value,
  });
  if (onInput) slider.on("input", onInput);
  return slider;
}
