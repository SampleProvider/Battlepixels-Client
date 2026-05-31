import { io } from "socket.io-client";

function onResize() {
    // document.body.style.setProperty("--border-size", Number(getComputedStyle(document.getElementById("playButton")).getPropertyValue("border-left-width").replaceAll("px", "")) / 8 + "px");
};
window.addEventListener("resize", () => {
    onResize();
});
onResize();

// const serverIp = new URLSearchParams(window.location.search).get("ip") ?? "https://battlepixelsserver.onrender.com/";
const serverIp = new URLSearchParams(window.location.search).get("ip") ?? "https://gulizi.dyndns.org:10003/";

const socket = io(serverIp, {
    autoConnect: false,
});
const emitFn = socket.emit;
// @ts-ignore
// socket.emit = (...args) => setTimeout(() => {
//     emitFn.apply(socket, args);
// }, 1000);

async function checkConnection() {
    try {
        await fetch(serverIp);
    }
    catch (err) {
        if (navigator.onLine && err instanceof TypeError && err.message == "Failed to fetch") {
            document.getElementById("canvas").style.display = "none";
            document.getElementById("webgpuCanvas").style.display = "none";
            document.getElementById("menuScreen").style.display = "none";
            document.getElementById("connectionError").style.display = "revert-layer";
            (document.getElementById("connectionErrorLink") as HTMLLinkElement).href = serverIp;
            document.getElementById("connectionErrorLink").innerText = serverIp;
        }
    }
};
checkConnection();

export { serverIp, socket };