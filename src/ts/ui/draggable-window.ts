class DraggableWindow {
    div: HTMLDivElement;

    x = 100;
    y = 100;
    dragging = false;
    dragOffsetX = 0;
    dragOffsetY = 0;

    constructor(div: HTMLDivElement) {
        this.div = div;
        this.updatePosition();

        (this.div.querySelector(".windowBar") as HTMLElement).onmousedown = (e) => {
            this.dragging = true;
            this.dragOffsetX = e.clientX - this.x;
            this.dragOffsetY = e.clientY - this.y;
        };
        document.addEventListener("mousemove", (e) => {
            if (this.dragging) {
                this.x = e.clientX - this.dragOffsetX;
                this.y = e.clientY - this.dragOffsetY;
                this.updatePosition();
            }
        });
        document.addEventListener("mouseup", () => {
            this.dragging = false;
        });

        (this.div.querySelector(".windowBarCloseButton") as HTMLButtonElement).onclick = () => {
            this.hide();
        };
    }
    
    updatePosition() {
        let rect = this.div.getBoundingClientRect();
        let barRect = this.div.querySelector(".windowBar").getBoundingClientRect();
        this.x = Math.max(Math.min(this.x, window.innerWidth - rect.width), 0);
        this.y = Math.max(Math.min(this.y, window.innerHeight - (barRect.height + (barRect.y - rect.y) * 2)), 0);
        this.div.style.left = this.x + "px";
        this.div.style.top = this.y + "px";
    }

    show() {
        this.div.style.display = "revert-layer";
    }
    hide() {
        this.div.style.display = "none";
    }
    toggle() {
        if (this.div.style.display == "none") {
            this.show();
        }
        else {
            this.hide();
        }
    }
}

class TabbedDraggableWindow extends DraggableWindow {
    tabDivs: HTMLCollection;
    tabButtons: NodeListOf<Element>;

    tabs = 0;
    currentTab = 0;
    
    constructor(div: HTMLDivElement) {
        super(div);

        this.tabDivs = this.div.querySelector(".windowTabs").children;
        // this.tabButtons = this.div.querySelector(".windowTabButtons").children;
        this.tabButtons = this.div.querySelectorAll(".windowTabButton");

        for (let i = 0; i < this.tabDivs.length; i++) {
            (this.tabDivs[i] as HTMLElement).style.display = "none";
        }
        for (let i = 0; i < this.tabButtons.length; i++) {
            (this.tabButtons[i] as HTMLElement).onclick = () => {
                this.changeTab(i);
            };
        }

        this.changeTab(0);
    }

    changeTab(tab: number) {
        (this.tabDivs[this.currentTab] as HTMLElement).style.display = "none";
        (this.tabButtons[this.currentTab] as HTMLElement).classList.remove("selected");
        this.currentTab = tab;
        (this.tabDivs[this.currentTab] as HTMLElement).style.display = "revert-layer";
        (this.tabButtons[this.currentTab] as HTMLElement).classList.add("selected");
        (this.div.querySelector(".windowBarTitle") as HTMLElement).innerText = (this.tabButtons[this.currentTab] as HTMLElement).innerText;
    }
}

export { DraggableWindow, TabbedDraggableWindow };