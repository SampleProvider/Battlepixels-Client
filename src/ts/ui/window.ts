import { TabbedDraggableWindow } from "./draggable-window.js";

let draggableWindow = new TabbedDraggableWindow(document.getElementById("window") as HTMLDivElement);

export { draggableWindow };