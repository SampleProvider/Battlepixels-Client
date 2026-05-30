import { socket } from "../../index.js";
import { clientPlayer } from "../entity/client-player.js";
import { images } from "../game/loader.js";

interface DialogueLine {
    portrait?: string,
    portraitImage?: string,
    portraitName?: string,
    text: string,
    responses: {
        id: string,
        text: string,
    }[];
}

let currentDialogue: { [ key: string ]: DialogueLine } = null;
let currentDialogueId: string = null;

function setDialogue(dialogue: { [ key: string ]: DialogueLine }, startId: string) {
    currentDialogue = dialogue;
    currentDialogueId = startId;
    document.getElementById("dialogueScreen").style.display = "revert-layer";
    document.getElementById("dialogueScreen").style.pointerEvents = "auto";
    setDialogueLine(currentDialogue[currentDialogueId]);
};

async function setDialogueLine(line: DialogueLine) {
    let dialogue = document.createElement("div");
    dialogue.classList.add("dialogue");
    dialogue.style.opacity = "0";
    dialogue.style.transform = "translateX(-50%) translateY(12.5vh)";
    // dialogue.classList.add("hidden");
    document.getElementById("dialogueScreen").appendChild(dialogue);

    let dialoguePortrait = document.createElement("div");
    dialoguePortrait.classList.add("dialoguePortrait");
    dialogue.appendChild(dialoguePortrait);

    let dialoguePortraitCanvas = document.createElement("canvas");
    dialoguePortraitCanvas.classList.add("dialoguePortraitCanvas");
    dialoguePortrait.appendChild(dialoguePortraitCanvas);

    let dialoguePortraitNameOutline = document.createElement("div");
    dialoguePortraitNameOutline.classList.add("dialoguePortraitNameOutline");
    dialoguePortrait.appendChild(dialoguePortraitNameOutline);
    let dialoguePortraitName = document.createElement("div");
    dialoguePortraitName.classList.add("dialoguePortraitName");
    dialoguePortrait.appendChild(dialoguePortraitName);

    let ctx = dialoguePortraitCanvas.getContext("2d");
    dialoguePortraitCanvas.width = 9;
    dialoguePortraitCanvas.height = 9;
    if (line.portrait == "self") {
        if (typeof clientPlayer.colorLookup == "string") {
            ctx.drawImage(images.get(clientPlayer.colorLookup), 0, 0, 9, 9, 0, 0, 9, 9);
        }
        else {
            let width = 20;
            for (let y = 0; y < 9; y++) {
                for (let x = 0; x < 9; x++) {
                    let index = (x + y * width) * 4;
                    ctx.fillStyle = "rgba(" + clientPlayer.colorLookup[index] + ", " + clientPlayer.colorLookup[index + 1] + ", " + clientPlayer.colorLookup[index + 2] + ", " + clientPlayer.colorLookup[index + 3] / 255 + ")";
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
        dialoguePortraitNameOutline.innerText = clientPlayer.name;
        dialoguePortraitName.innerText = clientPlayer.name;
    }
    else {
        ctx.drawImage(images.get(line.portraitImage), 0, 0, 9, 9, 0, 0, 9, 9);
        dialoguePortraitNameOutline.innerText = line.portraitName;
        dialoguePortraitName.innerText = line.portraitName;
    }

    let dialogueText = document.createElement("div");
    dialogueText.classList.add("dialogueText");
    dialogue.appendChild(dialogueText);

    let dialogueResponses = document.createElement("div");
    dialogueResponses.classList.add("dialogueResponses");
    dialogue.appendChild(dialogueResponses);

    // document.getElementById("dialogueText").innerText = "";
    // document.getElementById("dialogue").classList.remove("hidden");
    // let interval = setInterval(() => {
    //     document.getElementById("dialogueText").innerText += line.text.charAt(length);
    //     length += 1;
    //     if (length == line.text.length) {
    //         clearInterval(interval);
    //         document.getElementById("dialogueScreen").removeEventListener("mousedown", listener);
    //     }
    // }, 50);
    // let listener = () => {
    //     document.getElementById("dialogueText").innerText = line.text;
    //     clearInterval(interval);
    //     document.getElementById("dialogueScreen").removeEventListener("mousedown", listener);
    // };
    // document.getElementById("dialogueScreen").addEventListener("mousedown", listener);
    // document.getElementById("dialogueResponses").innerHTML = "";
    for (let i in line.responses) {
        let responseContainer = document.createElement("div");
        responseContainer.classList.add("dialogueResponseContainer");
        responseContainer.classList.add("hidden");
        dialogueResponses.appendChild(responseContainer);

        let response = document.createElement("div");
        response.classList.add("dialogueResponse");
        response.classList.add("button");
        response.innerText = line.responses[i].text;
        responseContainer.appendChild(response);

        response.onclick = () => {
            dialogue.style.transition = "500ms ease-in transform, opacity ease-in-out 500ms";
            dialogue.innerText;
            dialogue.style.opacity = "0";
            dialogue.style.transform = "translateX(-50%) translateY(-12.5vh)";
            dialogue.ontransitionend = (e) => {
                if (e.target == dialogue) {
                    dialogue.remove();
                    if (currentDialogueId == null) {
                        document.getElementById("dialogueScreen").style.display = "none";
                    }
                }
            };
            if (line.responses[i].id == null) {
                currentDialogueId = null;
                document.getElementById("dialogueScreen").style.pointerEvents = "none";
                // dialogue.classList.add("hidden");
                socket.emit("dialogue");
                return;
            }
            currentDialogueId = line.responses[i].id;
            setDialogueLine(currentDialogue[currentDialogueId]);
        };
    }
    // dialogue.classList.remove("hidden");
    dialogue.style.transition = "500ms ease-out transform, opacity ease-in-out 500ms";
    dialogue.innerText;
    dialogue.style.opacity = "1";
    dialogue.style.transform = "translateX(-50%)";
    let textLength = 0;
    await repeatWithDelay(() => {
        textLength += 1;
        while (textLength < line.text.length && line.text.charAt(textLength) == " ") {
            textLength += 1;
        }
        dialogueText.innerText = line.text.substring(0, textLength);
        return textLength == line.text.length;
    }, 50, 50);
    let responsesLength = 0;
    await repeatWithDelay(() => {
        dialogueResponses.children[responsesLength].classList.remove("hidden");
        responsesLength += 1;
        return responsesLength == line.responses.length;
    }, 250, 0);
};

function repeatWithDelay(action: Function, delay: number, endDelay: number) {
    return new Promise<void>(async (res) => {
        if (action()) {
            await new Promise((res) => {
                setTimeout(res, endDelay);
            });
            res();
            return;
        }
        let interval = setInterval(async () => {
            if (action()) {
                clearInterval(interval);
                document.getElementById("dialogueScreen").removeEventListener("mousedown", listener);
                await new Promise((res) => {
                    setTimeout(res, endDelay);
                });
                res();
            }
        }, delay);
        let listener = () => {
            while (!action()) {

            }
            clearInterval(interval);
            document.getElementById("dialogueScreen").removeEventListener("mousedown", listener);
            res();
        };
        document.getElementById("dialogueScreen").addEventListener("mousedown", listener);
    });
};

socket.on("dialogue", (data) => {
    setDialogue(data.dialogue, data.startId);
});;

// export { setDialogue };