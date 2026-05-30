import { socket } from "../../index.js";
import { clientPlayer } from "../entity/client-player.js";
import { updatePlayerCustomizations } from "./player-customizations.js";
import { initAllBuildWeapons, updatePreviewWeapon } from "./build-customizations.js";
import { createNoise3D } from "simplex-noise";
import { Player } from "../entity/player.js";
import { prerenderCustomizations } from "../ui/customizations.js";
import { setPerkPoints, setPerks } from "../ui/perks.js";
// import { setQuestProgress } from "../ui/quest.js";
import { Entity } from "../entity/entity.js";

// const menuCanvas: HTMLCanvasElement = document.getElementById("menuCanvas") as HTMLCanvasElement;
// const menuCtx = menuCanvas.getContext("2d") as CanvasRenderingContext2D;

// function onResize() {
//     menuCanvas.width = window.innerWidth * devicePixelRatio;
//     menuCanvas.height = window.innerHeight * devicePixelRatio;
//     menuCtx.imageSmoothingEnabled = false;
// };
// window.addEventListener("resize", () => {
//     onResize();
// });
// onResize();

let menuScreen = document.getElementById("menuScreen");

// let noise3D = createNoise3D();

// function updateMenuFrame() {
//     if (menuScreen.style.display == "none") {
//         window.requestAnimationFrame(updateMenuFrame);
//         return;
//     }

//     let time = performance.now();

//     let size = 64;

//     let offsetX = -time / 100;
//     let offsetY = time / 100;

//     for (let y = Math.floor(-offsetY / size); y < (menuCanvas.height - offsetY) / size; y++) {
//         for (let x = Math.floor(-offsetX / size); x < (menuCanvas.width - offsetX) / size; x++) {
//             let noise = noise3D(x, y, time / 1000);
//             let color = 230 - noise * 25;
//             menuCtx.fillStyle = "rgb(" + color + ", " + color + ", " + color + ")";
//             // menuCtx.fillStyle = "rgb(" + x * 50 + ", " + y * 50 + ", " + 255 + ")";
//             menuCtx.fillRect(x * size + offsetX, y * size + offsetY, size, size);
//         }
//     }

//     window.requestAnimationFrame(updateMenuFrame);
// };
// window.requestAnimationFrame(updateMenuFrame);

socket.on("connect", () => {
    // document.getElementById("signIn").style.transition = "";
    // document.getElementById("signIn").style.transform = "translateX(-50%) translateY(25vh)";
    // document.getElementById("signIn").innerText;
    // document.getElementById("signIn").style.transition = "1000ms ease-out transform, opacity ease-in-out 1000ms";
    // document.getElementById("menuConnection").style.transition = "1500ms ease-in transform, opacity ease-in-out 500ms";
    // document.getElementById("menuConnection").innerText;
    // document.getElementById("signIn").style.opacity = "1";
    // document.getElementById("signIn").style.transform = "translateX(-50%)";
    // document.getElementById("signIn").style.pointerEvents = "auto";
    // document.getElementById("menuConnection").style.opacity = "0";
    // document.getElementById("menuConnection").style.transform = "translateX(-50%) translateY(-100vh)";
    // document.getElementById("menuConnection").style.pointerEvents = "none";
    document.getElementById("signIn").style.opacity = "1";
    document.getElementById("signIn").style.transform = "translateX(-50%)";
    document.getElementById("signIn").style.pointerEvents = "auto";
    document.getElementById("menuTitle").style.transform = "revert-layer";
    document.getElementById("menuButtons").style.pointerEvents = "none";
    document.getElementById("playButtonContainer").style.transform = "revert-layer";
    transitionToMenu();
});
socket.on("disconnect", () => {
    // document.getElementById("disconnectedScreen").style.display = "revert-layer";
    // document.getElementById("menuConnection").style.transition = "";
    // document.getElementById("menuConnection").style.transform = "translateY(25vh)";
    // document.getElementById("menuConnection").innerText;
    // document.getElementById("menuConnection").style.transition = "1000ms ease-out transform, opacity ease-in-out 1000ms";
    // document.getElementById("signIn").style.transition = "1500ms ease-in transform, opacity ease-in-out 500ms";
    // document.getElementById("signIn").innerText;
    // document.getElementById("menuConnection").style.opacity = "1";
    // document.getElementById("menuConnection").style.transform = "";
    // document.getElementById("menuConnection").style.pointerEvents = "auto";
    // document.getElementById("signIn").style.opacity = "0";
    // document.getElementById("signIn").style.transform = "translateX(-50%) translateY(-100vh)";
    // document.getElementById("signIn").style.pointerEvents = "none";
    // document.getElementById("menuButtons").style.opacity = "0";
    // document.getElementById("menuButtons").style.pointerEvents = "none";
});
// document.getElementById("disconnectedButton").onclick = () => {
//     window.location.reload();
// };

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
            document.getElementById("signInResponse").style.color = "#df3e23";
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
            document.getElementById("signIn").style.transition = "1500ms ease-in transform, opacity ease-in-out 500ms";
            document.getElementById("signIn").innerText;
            document.getElementById("signIn").style.opacity = "0";
            document.getElementById("signIn").style.transform = "translateX(-50%) translateY(-100vh)";
            document.getElementById("signIn").style.pointerEvents = "none";
            // document.getElementById("menuButtons").style.display = "revert-layer";
            document.getElementById("menuButtons").style.pointerEvents = "auto";
            clientPlayer.name = data.username;
            clientPlayer.builds = data.builds;
            clientPlayer.currentBuild = data.currentBuild;
            if (data.clientPlayer.colorLookup instanceof ArrayBuffer) {
                data.clientPlayer.colorLookup = new Uint8ClampedArray(data.clientPlayer.colorLookup);
            }
            clientPlayer.colorLookup = data.clientPlayer.colorLookup;
            for (let [_, entity] of Entity.list) {
                if (entity.id == clientPlayer.id) {
                    entity.remove();
                }
            }
            // new Player(clientPlayer.id, data.clientPlayer.x, data.clientPlayer.y, data.clientPlayer.width, data.clientPlayer.height, 1, 0, clientPlayer.controls, null, { uvLookup: "player_uv_lookup", uvSource: "player_uv_source", colorLookup: data.clientPlayer.colorLookup }, 22, 0, data.clientPlayer.hp, data.clientPlayer.hpMax, false, data.clientPlayer.name, false, null);
            new Player(clientPlayer.id, data.clientPlayer.x, data.clientPlayer.y, data.clientPlayer.width, data.clientPlayer.height, 1, 0, clientPlayer.controls, null, { uvLookup: "player_uv_lookup", uvSource: "player_uv_source", colorLookup: data.clientPlayer.colorLookup }, 6, 0, data.clientPlayer.hp, data.clientPlayer.hpMax, false, data.clientPlayer.name, false, null);
            let colorLookup = {};
            if (typeof clientPlayer.colorLookup == "string") {
                colorLookup = {
                    type: "string",
                    data: clientPlayer.colorLookup,
                };
            }
            else {
                colorLookup = {
                    type: "array",
                    // @ts-expect-error
                    data: new Uint8Array(clientPlayer.colorLookup).toBase64(),
                };
            }
            localStorage.setItem("menuPlayer", JSON.stringify({
                x: data.clientPlayer.x,
                y: data.clientPlayer.y,
                width: data.clientPlayer.width,
                height: data.clientPlayer.height,
                colorLookup: colorLookup,
                hp: data.clientPlayer.hp,
                hpMax: data.clientPlayer.hpMax,
                name: data.clientPlayer.name,
            }));
            prerenderCustomizations();
            setPerks(new Set<string>(data.perks));
            setPerkPoints(data.perkPoints);
            // setQuestProgress(data.questProgress);
            // updatePlayerCustomizations();
            // initAllBuildWeapons();
            setTimeout(() => {
                document.getElementById("playButtonContainer").style.transform = "translateY(0px)";
                // document.getElementById("playerCustomization").style.transform = "translateX(0px)";
                // document.getElementById("buildPreview").style.transform = "translateY(0px)";
                // document.getElementById("playerName").innerText = data.username;
            }, 0);
            // setTimeout(() => {
            //     document.getElementById("customizeButtonContainer").style.transform = "translateY(0px)";
            // }, 200);
            // setTimeout(() => {
            //     document.getElementById("settingsButtonContainer").style.transform = "translateY(0px)";
            // }, 400);
            // setTimeout(() => {
            //     document.getElementById("logOutButtonContainer").style.transform = "translateY(0px)";
            // }, 600);
            break;
        case "usernameShort":
        case "usernameLong":
            signInResponse.innerText = "Your username must be between 3 and 32 characters long";
            signInResponse.style.color = "#df3e23";
            break;
        case "usernameInvalid":
            signInResponse.innerText = "Your username can only use the characters \"abcdefghijklmnopqrstuvwxyz1234567890-=`~!@#$%^&*()_+[]{}\\|;:'\",.<>/?\"";
            signInResponse.style.color = "#df3e23";
            break;
        case "usernameIncorrect":
            signInResponse.innerText = "Account \"" + data.username + "\" does not exist";
            signInResponse.style.color = "#df3e23";
            break;
        case "passwordIncorrect":
            signInResponse.innerText = "Incorrect password";
            signInResponse.style.color = "#df3e23";
            break;
        case "alreadyLoggedIn":
            signInResponse.innerText = "Account \"" + data.username + "\" is already logged in";
            signInResponse.style.color = "#df3e23";
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
            signInResponse.style.color = "#14a02e";
            document.getElementById("retypePasswordLabel").style.display = "none";
            document.getElementById("retypePasswordSpan").style.display = "none";
            break;
        case "usernameShort":
        case "usernameLong":
            signInResponse.innerText = "Your username must be between 3 and 32 characters long";
            signInResponse.style.color = "#df3e23";
            break;
        case "usernameInvalid":
            signInResponse.innerText = "Your username can only use the characters \"abcdefghijklmnopqrstuvwxyz1234567890-=`~!@#$%^&*()_+[]{}\\|;:'\",.<>/?\"";
            signInResponse.style.color = "#df3e23";
            break;
        case "usernameExists":
            signInResponse.innerText = "An account with username \"" + data.username + "\" already exists";
            signInResponse.style.color = "#df3e23";
            break;
        case "passwordLong":
            signInResponse.innerText = "Your password must be at most 128 characters long";
            signInResponse.style.color = "#df3e23";
            break;
        case "alreadyLoggedIn":
            signInResponse.innerText = "Account \"" + data.username + "\" is already logged in";
            signInResponse.style.color = "#df3e23";
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
    document.getElementById("menuTitle").style.transform = "translate(-50%, -50%) translateY(-50vh)";
    document.getElementById("menuButtons").style.pointerEvents = "none";
    document.getElementById("playButtonContainer").style.transform = "revert-layer";
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
    // document.getElementById("transitionScreen").style.display = "revert-layer";
    // document.getElementById("transitionScreen").style.pointerEvents = "auto";
    // document.getElementById("transitionBackground").style.opacity = "0";
    // document.getElementById("transitionBackground").style.transform = "translateX(0%)";
    // document.getElementById("transitionBackground").style.transition = "1000ms ease-in opacity, 1000ms ease-in transform";
    // document.getElementById("transitionBackground").innerText;
    // document.getElementById("transitionBackground").style.opacity = "1";
    // setTimeout(() => {
    clientPlayer.teleporting = true;
        // socket.emit("play");
    // }, 1000);
};
/*
document.getElementById("customizeButton").onclick = () => {
    document.getElementById("transitionScreen").style.display = "revert-layer";
    document.getElementById("transitionScreen").style.pointerEvents = "auto";
    document.getElementById("transitionBackground").style.opacity = "1";
    document.getElementById("transitionBackground").style.transform = "translateX(100%)";
    document.getElementById("transitionBackground").style.transition = "1000ms ease-in opacity, 1000ms ease-in transform";
    document.getElementById("transitionBackground").innerText;
    document.getElementById("transitionBackground").style.transform = "translateX(0%)";
    document.getElementById("transitionBackground").ontransitionend = () => {
        document.getElementById("buildCustomizationScreen").style.display = "revert-layer";
        document.getElementById("mainMenuScreen").style.display = "none";
        document.getElementById("transitionBackground").style.transition = "1000ms ease-in opacity, 1000ms ease-out transform";
        document.getElementById("transitionBackground").style.transform = "translateX(-100%)";
        document.getElementById("transitionBackground").ontransitionend = () => {
        document.getElementById("transitionScreen").style.display = "none";
            document.getElementById("transitionBackground").ontransitionend = () => {};
        };
    };
};
document.getElementById("logOutButton").onclick = () => {
    window.location.reload();
};
document.getElementById("buildCustomizationBackButton").onclick = () => {
    for (let i = 0; i < clientPlayer.builds[clientPlayer.currentBuild].length; i++) {
        updatePreviewWeapon(i);
    }
    document.getElementById("transitionScreen").style.display = "revert-layer";
    document.getElementById("transitionScreen").style.pointerEvents = "auto";
    document.getElementById("transitionBackground").style.opacity = "1";
    document.getElementById("transitionBackground").style.transform = "translateX(-100%)";
    document.getElementById("transitionBackground").style.transition = "1000ms ease-in opacity, 1000ms ease-in transform";
    document.getElementById("transitionBackground").innerText;
    document.getElementById("transitionBackground").style.transform = "translateX(0%)";
    document.getElementById("transitionBackground").ontransitionend = () => {
        document.getElementById("mainMenuScreen").style.display = "revert-layer";
        document.getElementById("buildCustomizationScreen").style.display = "none";
        document.getElementById("transitionBackground").style.transition = "1000ms ease-in opacity, 1000ms ease-out transform";
        document.getElementById("transitionBackground").style.transform = "translateX(100%)";
        document.getElementById("transitionBackground").ontransitionend = () => {
        document.getElementById("transitionScreen").style.display = "none";
            document.getElementById("transitionBackground").ontransitionend = () => {};
        };
    };
};
*/

function transitionToGame() {
    // document.getElementById("transitionScreen").style.display = "none";
    document.getElementById("menuScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "revert-layer";
    // document.getElementById("transitionScreen").style.pointerEvents = "none";
    // document.getElementById("transitionBackground").style.opacity = "0";
};
function transitionToMenu() {
    document.getElementById("menuScreen").style.display = "revert-layer";
    document.getElementById("gameScreen").style.display = "none";
};

export { transitionToGame };