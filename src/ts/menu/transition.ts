

const transitionCanvas: HTMLCanvasElement = document.getElementById("transitionCanvas") as HTMLCanvasElement;
const transitionCtx = transitionCanvas.getContext("2d") as CanvasRenderingContext2D;

function onResize() {
    transitionCanvas.width = window.innerWidth * devicePixelRatio;
    transitionCanvas.height = window.innerHeight * devicePixelRatio;
    transitionCtx.imageSmoothingEnabled = false;
};
window.addEventListener("resize", () => {
    onResize();
});
onResize();