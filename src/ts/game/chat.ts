import { socket } from "../../index.js";
import { keys } from "./controls.js";

let chatMessages = document.getElementById("chatMessages");
let chatInput = document.getElementById("chatInput") as HTMLInputElement;

chatInput.onfocus = () => {
    for (let [key, pressed] of keys) {
        if (pressed) {
            keys.set(key, false);
        }
    }
};
chatInput.onkeydown = (e) => {
    e.stopImmediatePropagation();
    if (e.key == "Enter" && chatInput.value.length > 0) {
        socket.emit("chat", chatInput.value);
        chatInput.value = "";
    }
};

socket.on("chat", (data: any) => {
    let div = document.createElement("div");
    div.classList.add("chatMessage");
    function getTimeStamp() {
        let date = new Date();
        let hour = date.getHours().toString();
        if (hour.length == 1) {
            hour = "0" + hour;
        }
        let minute = date.getMinutes().toString();
        if (minute.length == 1) {
            minute = "0" + minute;
        }
        return "[" + hour + ":" + minute + "] ";
    };
    div.innerText = getTimeStamp();
    let span = document.createElement("span");
    span.innerText = data.message;
    span.style.color = data.color;
    div.appendChild(span);
    let scroll = false;
    if (chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 5) {
        scroll = true;
    }
    chatMessages.appendChild(div);
    if (scroll) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});