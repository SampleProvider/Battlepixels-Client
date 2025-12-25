import { socket } from "../../index.js";
import { clientPlayer } from "../entity/client-player.js";
import { updatePlayerCustomizations } from "./customizations.js";
import { createNoise3D } from "simplex-noise";

const menuCanvas: HTMLCanvasElement = document.getElementById("menuCanvas") as HTMLCanvasElement;
const menuCtx = menuCanvas.getContext("2d") as CanvasRenderingContext2D;

function onResize() {
    menuCanvas.width = window.innerWidth * devicePixelRatio;
    menuCanvas.height = window.innerHeight * devicePixelRatio;
    menuCtx.imageSmoothingEnabled = false;
};
window.addEventListener("resize", () => {
    onResize();
});
onResize();

let menuContainer = document.getElementById("menuContainer");

let noise3D = createNoise3D();

function updateMenuFrame() {
    if (menuContainer.style.display == "none") {
        window.requestAnimationFrame(updateMenuFrame);
        return;
    }

    let time = performance.now();

    let size = 64;

    let offsetX = -time / 100;
    let offsetY = time / 100;

    for (let y = Math.floor(-offsetY / size); y < (menuCanvas.height - offsetY) / size; y++) {
        for (let x = Math.floor(-offsetX / size); x < (menuCanvas.width - offsetX) / size; x++) {
            let noise = noise3D(x, y, time / 1000);
            let color = 230 - noise * 25;
            menuCtx.fillStyle = "rgb(" + color + ", " + color + ", " + color + ")";
            // menuCtx.fillStyle = "rgb(" + x * 50 + ", " + y * 50 + ", " + 255 + ")";
            menuCtx.fillRect(x * size + offsetX, y * size + offsetY, size, size);
        }
    }

    window.requestAnimationFrame(updateMenuFrame);
};
window.requestAnimationFrame(updateMenuFrame);

function setSignInDisabled(disabled: boolean) {
    (document.getElementById("usernameInput") as HTMLInputElement).disabled = disabled;
    (document.getElementById("passwordInput") as HTMLInputElement).disabled = disabled;
    (document.getElementById("retypePasswordInput") as HTMLInputElement).disabled = disabled;
    (document.getElementById("signInButton") as HTMLButtonElement).disabled = disabled;
    (document.getElementById("createAccountButton") as HTMLButtonElement).disabled = disabled;
};

document.getElementById("signInButton").onclick = () => {
    socket.emit("signIn", {
        username: (document.getElementById("usernameInput") as HTMLInputElement).value,
        password: (document.getElementById("passwordInput") as HTMLInputElement).value,
    });
    document.getElementById("signInLoading").style.display = "revert-layer";
    setSignInDisabled(true);
};
document.getElementById("createAccountButton").onclick = () => {
    if (document.getElementById("retypePasswordLabel").style.display == "none") {
        document.getElementById("retypePasswordLabel").style.display = "revert-layer";
        document.getElementById("retypePasswordSpan").style.display = "revert-layer";
    }
    else {
        if ((document.getElementById("passwordInput") as HTMLInputElement).value != (document.getElementById("retypePasswordInput") as HTMLInputElement).value) {
            document.getElementById("signInResponse").style.display = "revert-layer";
            document.getElementById("signInResponse").innerText = "Passwords do not match";
            document.getElementById("signInResponse").style.color = "red";
            return;
        }
        socket.emit("createAccount", {
            username: (document.getElementById("usernameInput") as HTMLInputElement).value,
            password: (document.getElementById("passwordInput") as HTMLInputElement).value,
        });
        document.getElementById("signInLoading").style.display = "revert-layer";
        setSignInDisabled(true);
    }
};

socket.on("signIn", (data: any) => {
    let signInResponse = document.getElementById("signInResponse");
    switch (data.result) {
        case "success":
            signInResponse.innerText = "";
            document.getElementById("signInContainer").style.opacity = "0";
            document.getElementById("signInContainer").style.transform = "translateX(-50%) translateY(-100vh)";
            document.getElementById("signInContainer").style.pointerEvents = "none";
            // document.getElementById("menuButtonsContainer").style.display = "revert-layer";
            document.getElementById("menuButtonsContainer").style.pointerEvents = "auto";
            clientPlayer.name = data.username;
            clientPlayer.customizations = data.customizations;
            updatePlayerCustomizations();
            setTimeout(() => {
                document.getElementById("playButtonContainer").style.transform = "translateY(0px)";
                document.getElementById("playerCustomizationsContainer").style.transform = "translateX(0px)";
                document.getElementById("buildCustomizationsContainer").style.transform = "translateY(0px)";
                document.getElementById("playerName").innerText = data.username;
            }, 0);
            setTimeout(() => {
                document.getElementById("customizeButtonContainer").style.transform = "translateY(0px)";
            }, 200);
            setTimeout(() => {
                document.getElementById("settingsButtonContainer").style.transform = "translateY(0px)";
            }, 400);
            setTimeout(() => {
                document.getElementById("logOutButtonContainer").style.transform = "translateY(0px)";
            }, 600);
            break;
        case "usernameShort":
        case "usernameLong":
            signInResponse.innerText = "Your username must be between 3 and 32 characters long";
            signInResponse.style.color = "red";
            break;
        case "usernameInvalid":
            signInResponse.innerText = "Your username can only use the characters \"abcdefghijklmnopqrstuvwxyz1234567890-=`~!@#$%^&*()_+[]{}\\|;:'\",.<>/?\"";
            signInResponse.style.color = "red";
            break;
        case "usernameIncorrect":
            signInResponse.innerText = "Account \"" + data.username + "\" does not exist";
            signInResponse.style.color = "red";
            break;
        case "passwordIncorrect":
            signInResponse.innerText = "Incorrect password";
            signInResponse.style.color = "red";
            break;
        case "alreadyLoggedIn":
            signInResponse.innerText = "Account \"" + data.username + "\" is already logged in";
            signInResponse.style.color = "red";
            break;
    }
    if (signInResponse.innerText == "") {
        signInResponse.style.display = "none";
    }
    else {
        signInResponse.style.display = "revert-layer";
    }
    document.getElementById("signInLoading").style.display = "none";
    setSignInDisabled(false);
});
socket.on("createAccount", (data: any) => {
    let signInResponse = document.getElementById("signInResponse");
    switch (data.result) {
        case "success":
            signInResponse.innerText = "Successfully created account \"" + data.username + "\"";
            signInResponse.style.color = "lime";
            document.getElementById("retypePasswordLabel").style.display = "none";
            document.getElementById("retypePasswordSpan").style.display = "none";
            break;
        case "usernameShort":
        case "usernameLong":
            signInResponse.innerText = "Your username must be between 3 and 32 characters long";
            signInResponse.style.color = "red";
            break;
        case "usernameInvalid":
            signInResponse.innerText = "Your username can only use the characters \"abcdefghijklmnopqrstuvwxyz1234567890-=`~!@#$%^&*()_+[]{}\\|;:'\",.<>/?\"";
            signInResponse.style.color = "red";
            break;
        case "usernameExists":
            signInResponse.innerText = "An account with username \"" + data.username + "\" already exists";
            signInResponse.style.color = "red";
            break;
        case "passwordLong":
            signInResponse.innerText = "Your password must be at most 128 characters long";
            signInResponse.style.color = "red";
            break;
        case "alreadyLoggedIn":
            signInResponse.innerText = "Account \"" + data.username + "\" is already logged in";
            signInResponse.style.color = "red";
            break;
    }
    if (signInResponse.innerText == "") {
        signInResponse.style.display = "none";
    }
    else {
        signInResponse.style.display = "revert-layer";
    }
    document.getElementById("signInLoading").style.display = "none";
    setSignInDisabled(false);
});

document.getElementById("playButton").onclick = () => {
    // document.getElementById("menuTitle").style.transform = "translate(-50%, -50%) translateY(-50vh)";
    // document.getElementById("menuButtonsContainer").style.pointerEvents = "none";
    // setTimeout(() => {
    //     document.getElementById("playButtonContainer").style.transform = "revert-layer";
    // }, 150);
    // setTimeout(() => {
    //     document.getElementById("customizeButtonContainer").style.transform = "revert-layer";
    // }, 100);
    // setTimeout(() => {
    //     document.getElementById("settingsButtonContainer").style.transform = "revert-layer";
    // }, 50);
    // setTimeout(() => {
    //     document.getElementById("logOutButtonContainer").style.transform = "revert-layer";
    // }, 0);
    document.getElementById("transitionContainer").style.display = "revert-layer";
    document.getElementById("transitionContainer").style.pointerEvents = "auto";
    document.getElementById("transitionBackground").style.opacity = "0";
    document.getElementById("transitionBackground").style.transform = "translateX(0%)";
    document.getElementById("transitionBackground").style.transition = "1000ms ease-in opacity, 1000ms ease-in transform";
    document.getElementById("transitionBackground").innerText;
    document.getElementById("transitionBackground").style.opacity = "1";
    setTimeout(() => {
        socket.emit("play");
    }, 1000);
};
document.getElementById("customizeButton").onclick = () => {
    document.getElementById("transitionContainer").style.display = "revert-layer";
    document.getElementById("transitionContainer").style.pointerEvents = "auto";
    document.getElementById("transitionBackground").style.opacity = "1";
    document.getElementById("transitionBackground").style.transform = "translateX(100%)";
    document.getElementById("transitionBackground").style.transition = "1000ms ease-in opacity, 1000ms ease-in transform";
    document.getElementById("transitionBackground").innerText;
    document.getElementById("transitionBackground").style.transform = "translateX(0%)";
    document.getElementById("transitionBackground").ontransitionend = () => {
        document.getElementById("customizationsContainer").style.display = "revert-layer";
        document.getElementById("menuContainer").style.display = "none";
        document.getElementById("transitionBackground").style.transition = "1000ms ease-in opacity, 1000ms ease-out transform";
        document.getElementById("transitionBackground").style.transform = "translateX(-100%)";
        document.getElementById("transitionBackground").ontransitionend = () => {
        document.getElementById("transitionContainer").style.display = "none";
            document.getElementById("transitionBackground").ontransitionend = () => {};
        };
    };
};

function transitionToGame() {
    // document.getElementById("transitionContainer").style.display = "none";
    document.getElementById("menuContainer").style.display = "none";
    document.getElementById("gameContainer").style.display = "revert-layer";
    document.getElementById("transitionContainer").style.pointerEvents = "none";
    document.getElementById("transitionBackground").style.opacity = "0";
};
function transitionToMenu() {

};

export { transitionToGame };