import { io } from "socket.io-client";

function onResize() {
    document.body.style.setProperty("--border-size", Number(getComputedStyle(document.getElementById("playButton")).getPropertyValue("border-left-width").replaceAll("px", "")) / 8 + "px");
};
window.addEventListener("resize", () => {
    onResize();
});
onResize();

// const serverIp = "http://spuh:3000/";
const serverIp = new URLSearchParams(window.location.search).get("ip") ?? "https://battlepixelsserver.onrender.com/";

const socket = io(serverIp, {
    autoConnect: false,
});
const emitFn = socket.emit;
// @ts-ignore
// socket.emit = (...args) => setTimeout(() => {
//     emitFn.apply(socket, args);
// }, 1000) 

export { serverIp, socket };