import { serverIp, socket } from "../../index.js";
import { draggableWindow } from "./window.js";

interface QuestChallenge {
    name: string,
    description?: string,
    recommendedLevel: number,
}
interface Quest {
    name: string,
    description: string,
    challenges: { [key: string]: QuestChallenge },
    stars: number,
}

interface QuestChallengeProgress {
    completed: boolean,
}
interface QuestProgress {
    completed: boolean,
    challenges: { [key: string]: QuestChallengeProgress },
    stars: number,
}

let questData: { [key: string]: Quest } = null;
let questDivs: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();

let questProgress: { [key: string]: QuestProgress } = null;

let currentQuest: string = null;
let currentQuestChallenge: string = null;

let selectedQuest: string = null;
let selectedChallenge: string = null;
let selectedChallengeDiv: HTMLDivElement = null;

async function loadQuests() {
    questData = await (await fetch(serverIp + "assets/quests.json")).json();

    for (let i in questData) {
        let quest = document.createElement("div");
        quest.classList.add("quest");
        document.getElementById("questList").appendChild(quest);

        quest.onclick = () => {
            showQuestInfo(i);
        };

        let questIcon = document.createElement("img");
        questIcon.classList.add("questIcon");
        quest.appendChild(questIcon);

        let questName = document.createElement("div");
        questName.classList.add("questName");
        quest.appendChild(questName);
        
        questName.innerText = questData[i].name;

        let questChallenges = document.createElement("div");
        questChallenges.classList.add("questChallenges");
        quest.appendChild(questChallenges);

        for (let j in questData[i].challenges) {
            if (j == "no_challenge") {
                continue;
            }
            let questChallengeIcon = document.createElement("img");
            questChallengeIcon.classList.add("questIcon");
            questChallenges.appendChild(questChallengeIcon);
        }

        let questStars = document.createElement("div");
        questStars.classList.add("questStars");
        quest.appendChild(questStars);

        questDivs.set(i, quest);
    }
};

function updateQuestProgress(quest: string) {
    let div = questDivs.get(quest);

    (div.querySelector(".questIcon") as HTMLImageElement).src = questProgress[quest]?.completed ? "src/img/check_mark.png" : "src/img/cross_mark.png";
    (div.querySelector(".questStars") as HTMLDivElement).innerText = (questProgress[quest]?.stars ?? 0) + "/" + questData[quest].stars;

    let children = div.querySelector(".questChallenges").children;
    let index = 0;
    for (let i in questData[quest].challenges) {
        if (i == "no_challenge") {
            continue;
        }
        (children[index] as HTMLImageElement).src = questProgress[quest]?.challenges[i].completed ? "src/img/check_mark.png" : "src/img/cross_mark.png";
        index += 1;
    }

    let questsCompleted = 0;
    let totalQuests = 0;
    let challengesCompleted = 0;
    let totalChallenges = 0;
    let stars = 0;
    let totalStars = 0;
    for (let i in questData) {
        totalQuests += 1;
        questsCompleted += questProgress[i]?.completed ? 1 : 0;
        for (let j in questData[i].challenges) {
            if (j == "no_challenge") {
                continue;
            }
            totalChallenges += 1;
            challengesCompleted += questProgress[i]?.challenges[j].completed ? 1 : 0;
        }
        totalStars += questData[i].stars;
        stars += questProgress[i]?.stars;
    }
    document.getElementById("questProgressQuests").innerText = "Quests: " + questsCompleted + "/" + totalQuests;
    document.getElementById("questProgressChallenges").innerText = "Challenges: " + questsCompleted + "/" + totalQuests;
    document.getElementById("questProgressStars").innerText = "Stars: " + questsCompleted + "/" + totalQuests;
};

function setQuestProgress(progress: { [key: string]: QuestProgress }) {
    questProgress = progress;
    for (let i in questData) {
        updateQuestProgress(i);
    }
};

function showQuestInfo(quest: string) {
    selectedQuest = quest;
    document.getElementById("questList").style.display = "none";
    document.getElementById("questProgress").style.display = "none";
    document.getElementById("questInfo").style.display = "revert-layer";

    document.getElementById("questName").innerText = questData[quest].name;
    document.getElementById("questDescription").innerText = questData[quest].description;
    document.getElementById("questChallenges").innerHTML = "";
    for (let i in questData[quest].challenges) {
        let challenge = document.createElement("div");
        challenge.classList.add("questChallenge");
        document.getElementById("questChallenges").appendChild(challenge);
        
        let challengeIcon = document.createElement("img");
        challengeIcon.classList.add("questIcon");
        challenge.appendChild(challengeIcon);

        challengeIcon.src = questProgress[selectedQuest]?.challenges[i].completed ? "src/img/check_mark.png" : "src/img/cross_mark.png";
        
        let challengeName = document.createElement("div");
        challengeName.classList.add("questChallengeName");
        challenge.appendChild(challengeName);

        challengeName.innerText = questData[quest].challenges[i].name;
        
        let challengeLevel = document.createElement("div");
        challengeLevel.classList.add("questChallengeLevel");
        challenge.appendChild(challengeLevel);

        challengeLevel.innerText = "Lvl. " + questData[quest].challenges[i].recommendedLevel;
        
        let challengeDescription = document.createElement("div");
        challengeDescription.classList.add("questChallengeDescription");
        challengeDescription.classList.add("hidden");
        challenge.appendChild(challengeDescription);

        if (questData[quest].challenges[i].description != null) {
            challengeDescription.innerText = questData[quest].challenges[i].description;
        }
        else {
            challengeDescription.style.display = "none";
        }

        if (i == "no_challenge") {
            selectedChallenge = i;
            selectedChallengeDiv = challenge;
            challenge.classList.add("selected");
        }

        challenge.onclick = () => {
            if (selectedChallenge != i) {
                selectedChallengeDiv.classList.remove("selected");
                selectedChallengeDiv.querySelector(".questChallengeDescription").classList.add("hidden");
            }
            selectedChallenge = i;
            selectedChallengeDiv = challenge;
            challenge.classList.add("selected");
            challengeDescription.classList.toggle("hidden");
        };
    }
};
function hideQuestInfo() {
    selectedQuest = null;
    document.getElementById("questList").style.display = "revert-layer";
    document.getElementById("questProgress").style.display = "revert-layer";
    document.getElementById("questInfo").style.display = "none";
};

document.getElementById("startQuestButton").onclick = () => {
    if (currentQuest == null) {
        socket.emit("startQuest", {
            quest: selectedQuest,
            challenge: selectedChallenge,
        });
    }
    else {
        socket.emit("abandonQuest");
    }
};
document.getElementById("questBackButton").onclick = () => {
    hideQuestInfo();
};

document.getElementById("currentQuestName").onclick = () => {
    draggableWindow.show();
    showQuestInfo(currentQuest);
};

socket.on("startQuest", (data) => {
    currentQuest = data.quest;
    currentQuestChallenge = data.questChallenge;
    document.getElementById("currentQuest").style.display = "revert-layer";
    document.getElementById("currentQuestName").innerText = questData[currentQuest].name;
    document.getElementById("startQuestButton").innerText = "Abandon Quest";
    document.getElementById("startQuestButton").style.background = "linear-gradient(to right, #df3e23, #b4202a)";
});
socket.on("completeQuest", () => {
    currentQuest = null;
    document.getElementById("currentQuest").style.display = "none";
    document.getElementById("startQuestButton").innerText = "Start Quest";
    document.getElementById("startQuestButton").style.background = "linear-gradient(to right, #59c135, #14a02e)";
});
socket.on("abandonQuest", () => {
    currentQuest = null;
    document.getElementById("currentQuest").style.display = "none";
    document.getElementById("startQuestButton").innerText = "Start Quest";
    document.getElementById("startQuestButton").style.background = "linear-gradient(to right, #59c135, #14a02e)";
});

socket.on("questObjective", (data) => {
    document.getElementById("currentQuestObjective").innerText = data.text;
});

export { currentQuest, loadQuests, setQuestProgress };