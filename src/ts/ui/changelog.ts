import { serverIp } from "../../index.js";

interface ChangelogEntry {
    version?: string,
    name: string,
    date: string,
    description: string,
}

let changelogData: ChangelogEntry[] = null;

async function loadChangelog() {
    changelogData = await (await fetch(serverIp + "assets/changelog.json")).json();

    for (let i in changelogData) {
        let div = document.createElement("div");
        div.classList.add("changelogUpdate");
        document.getElementById("changelogTab").appendChild(div);
        
        let name = document.createElement("div");
        name.classList.add("changelogName");
        if (changelogData[i].version != null) {
            name.innerText = "v" + changelogData[i].version + ": " + changelogData[i].name;
        }
        else {
            name.innerText = changelogData[i].name;
        }
        div.appendChild(name);
        
        let date = document.createElement("div");
        date.classList.add("changelogDate");
        date.innerText = changelogData[i].date;
        div.appendChild(date);
        
        let description = document.createElement("div");
        description.classList.add("changelogDescription");
        description.innerText = changelogData[i].description;
        div.appendChild(description);
    }
};

export { loadChangelog };