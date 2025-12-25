import { SimulatedMap } from "./map.js";
import { random } from "./random.js";

enum Pixel {
    Id = 0,
    SpeedX = 1,
    SpeedY = 2,
    BackgroundId = 3,
}

interface PixelData {
    id?: string,
    index?: number,
    color: number[],
    noise?: number[],
    state: State,
    blastResistance: number,
    update?: Function,
}

enum State {
    Solid,
    SolidPlatform,
    Liquid,
    Gas,
}

function isOnGrid(map: SimulatedMap, x: number, y: number) {
    return x >= 0 && x < map.width && y >= 0 && y < map.height;
};
function isAir(map: SimulatedMap, x: number, y: number) {
    return isOnGrid(map, x, y) && map.grid[(x + y * map.width) * map.stride + Pixel.Id] == pixelData.air.index && map.nextGrid[(x + y * map.width) * map.stride + Pixel.Id] == -1;
};
function isPassableSolid(map: SimulatedMap, x: number, y: number) {
    return isOnGrid(map, x, y) && pixels[map.grid[(x + y * map.width) * map.stride + Pixel.Id]].state != State.Solid;
};
function isMoveableSolid(map: SimulatedMap, x: number, y: number) {
    return isOnGrid(map, x, y) && pixels[map.grid[(x + y * map.width) * map.stride + Pixel.Id]].state != State.Solid && map.nextGrid[(x + y * map.width) * map.stride + Pixel.Id] == -1;
};

// function addUpdatedChunk(map: SimulatedMap, x: number, y: number) {
//     let buffer = 2;

//     let chunkX = Math.floor(x / map.chunkWidth);
//     let chunkY = Math.floor(y / map.chunkHeight);
//     map.nextChunks[chunkY][chunkX][0] = Math.min(map.nextChunks[chunkY][chunkX][0], Math.max(x - buffer, chunkX * map.chunkWidth));
//     map.nextChunks[chunkY][chunkX][1] = Math.max(map.nextChunks[chunkY][chunkX][1], Math.min(Math.min(x + buffer, map.width - 1), chunkX * map.chunkWidth + map.chunkWidth - 1));
//     map.nextChunks[chunkY][chunkX][2] = Math.min(map.nextChunks[chunkY][chunkX][2], Math.max(y - buffer, chunkY * map.chunkHeight));
//     map.nextChunks[chunkY][chunkX][3] = Math.max(map.nextChunks[chunkY][chunkX][3], Math.min(Math.min(y + buffer, map.height - 1), chunkY * map.chunkWidth + map.chunkHeight - 1));
    
//     if (x >= buffer && x % map.chunkWidth < buffer) {
//         map.nextChunks[chunkY][chunkX - 1][0] = Math.min(map.nextChunks[chunkY][chunkX - 1][0], x - buffer);
//         map.nextChunks[chunkY][chunkX - 1][1] = Math.max(map.nextChunks[chunkY][chunkX - 1][1], chunkX * map.chunkWidth - 1);
//         map.nextChunks[chunkY][chunkX - 1][2] = Math.min(map.nextChunks[chunkY][chunkX - 1][2], Math.max(y - buffer, chunkY * map.chunkHeight));
//         map.nextChunks[chunkY][chunkX - 1][3] = Math.max(map.nextChunks[chunkY][chunkX - 1][3], Math.min(Math.min(y + buffer, map.height - 1), chunkY * map.chunkHeight + map.chunkHeight - 1));
//     }
//     if (chunkX < map.chunkXAmount - 1 && x % map.chunkWidth >= map.chunkWidth - buffer) {
//         map.nextChunks[chunkY][chunkX + 1][0] = Math.min(map.nextChunks[chunkY][chunkX + 1][0], chunkX * map.chunkWidth + map.chunkWidth);
//         map.nextChunks[chunkY][chunkX + 1][1] = Math.max(map.nextChunks[chunkY][chunkX + 1][1], Math.min(x + buffer, map.width - 1));
//         map.nextChunks[chunkY][chunkX + 1][2] = Math.min(map.nextChunks[chunkY][chunkX + 1][2], Math.max(y - buffer, chunkY * map.chunkHeight));
//         map.nextChunks[chunkY][chunkX + 1][3] = Math.max(map.nextChunks[chunkY][chunkX + 1][3], Math.min(Math.min(y + buffer, map.height - 1), chunkY * map.chunkHeight + map.chunkHeight - 1));
//     }
//     if (y >= buffer && y % map.chunkHeight < buffer) {
//         map.nextChunks[chunkY - 1][chunkX][0] = Math.min(map.nextChunks[chunkY - 1][chunkX][0], Math.max(x - buffer, chunkX * map.chunkWidth));
//         map.nextChunks[chunkY - 1][chunkX][1] = Math.max(map.nextChunks[chunkY - 1][chunkX][1], Math.min(Math.min(x + buffer, map.width - 1), chunkX * map.chunkWidth + map.chunkWidth - 1));
//         map.nextChunks[chunkY - 1][chunkX][2] = Math.min(map.nextChunks[chunkY - 1][chunkX][2], y - buffer);
//         map.nextChunks[chunkY - 1][chunkX][3] = Math.max(map.nextChunks[chunkY - 1][chunkX][3], chunkY * map.chunkHeight - 1);
//     }
//     if (chunkY < map.chunkYAmount - 1 && y % map.chunkHeight >= map.chunkHeight - buffer) {
//         map.nextChunks[chunkY + 1][chunkX][0] = Math.min(map.nextChunks[chunkY + 1][chunkX][0], Math.max(x - buffer, chunkX * map.chunkWidth));
//         map.nextChunks[chunkY + 1][chunkX][1] = Math.max(map.nextChunks[chunkY + 1][chunkX][1], Math.min(Math.min(x + buffer, map.width - 1), chunkX * map.chunkWidth + map.chunkWidth - 1));
//         map.nextChunks[chunkY + 1][chunkX][2] = Math.min(map.nextChunks[chunkY + 1][chunkX][2], chunkY * map.chunkHeight + map.chunkHeight);
//         map.nextChunks[chunkY + 1][chunkX][3] = Math.max(map.nextChunks[chunkY + 1][chunkX][3], Math.min(y + buffer, map.height - 1));
//     }
//     if (x >= buffer && x % map.chunkWidth < buffer) {
//         if (y >= buffer && y % map.chunkHeight < buffer) {
//             map.nextChunks[chunkY - 1][chunkX - 1][0] = Math.min(map.nextChunks[chunkY - 1][chunkX - 1][0], x - buffer);
//             map.nextChunks[chunkY - 1][chunkX - 1][1] = Math.max(map.nextChunks[chunkY - 1][chunkX - 1][1], chunkX * map.chunkWidth - 1);
//             map.nextChunks[chunkY - 1][chunkX - 1][2] = Math.min(map.nextChunks[chunkY - 1][chunkX - 1][2], y - buffer);
//             map.nextChunks[chunkY - 1][chunkX - 1][3] = Math.max(map.nextChunks[chunkY - 1][chunkX - 1][3], chunkY * map.chunkHeight - 1);
//         }
//         if (chunkY < map.chunkYAmount - 1 && y % map.chunkHeight >= map.chunkHeight - buffer) {
//             map.nextChunks[chunkY + 1][chunkX - 1][0] = Math.min(map.nextChunks[chunkY + 1][chunkX - 1][0], x - buffer);
//             map.nextChunks[chunkY + 1][chunkX - 1][1] = Math.max(map.nextChunks[chunkY + 1][chunkX - 1][1], chunkX * map.chunkWidth - 1);
//             map.nextChunks[chunkY + 1][chunkX - 1][2] = Math.min(map.nextChunks[chunkY + 1][chunkX - 1][2], chunkY * map.chunkHeight + map.chunkHeight);
//             map.nextChunks[chunkY + 1][chunkX - 1][3] = Math.max(map.nextChunks[chunkY + 1][chunkX - 1][3], Math.min(y + buffer, map.height - 1));
//         }
//     }
//     if (chunkX < map.chunkXAmount - 1 && x % map.chunkWidth >= map.chunkWidth - buffer) {
//         if (y >= buffer && y % map.chunkHeight < buffer) {
//             map.nextChunks[chunkY - 1][chunkX + 1][0] = Math.min(map.nextChunks[chunkY - 1][chunkX + 1][0], chunkX * map.chunkWidth + map.chunkWidth);
//             map.nextChunks[chunkY - 1][chunkX + 1][1] = Math.max(map.nextChunks[chunkY - 1][chunkX + 1][1], Math.min(x + buffer, map.width - 1));
//             map.nextChunks[chunkY - 1][chunkX + 1][2] = Math.min(map.nextChunks[chunkY - 1][chunkX + 1][2], y - buffer);
//             map.nextChunks[chunkY - 1][chunkX + 1][3] = Math.max(map.nextChunks[chunkY - 1][chunkX + 1][3], chunkY * map.chunkHeight - 1);
//         }
//         if (chunkY < map.chunkYAmount - 1 && y % map.chunkHeight >= map.chunkHeight - buffer) {
//             map.nextChunks[chunkY + 1][chunkX + 1][0] = Math.min(map.nextChunks[chunkY + 1][chunkX + 1][0], chunkX * map.chunkWidth + map.chunkWidth);
//             map.nextChunks[chunkY + 1][chunkX + 1][1] = Math.max(map.nextChunks[chunkY + 1][chunkX + 1][1], Math.min(x + buffer, map.width - 1));
//             map.nextChunks[chunkY + 1][chunkX + 1][2] = Math.min(map.nextChunks[chunkY + 1][chunkX + 1][2], chunkY * map.chunkHeight + map.chunkHeight);
//             map.nextChunks[chunkY + 1][chunkX + 1][3] = Math.max(map.nextChunks[chunkY + 1][chunkX + 1][3], Math.min(y + buffer, map.height - 1));
//         }
//     }
// };

function addUpdatedChunk(map: SimulatedMap, x: number, y: number) {
    let buffer = 2;

    let chunkX = Math.floor(x / map.chunkWidth);
    let chunkY = Math.floor(y / map.chunkHeight);
    let index = (Math.floor(x / map.chunkWidth) + Math.floor(y / map.chunkHeight) * map.chunkXAmount) * map.chunkStride;
    map.nextChunks[index] = Math.min(map.nextChunks[index], Math.max(x - buffer, chunkX * map.chunkWidth));
    map.nextChunks[index + 1] = Math.max(map.nextChunks[index + 1], Math.min(Math.min(x + buffer, map.width - 1), chunkX * map.chunkWidth + map.chunkWidth - 1));
    map.nextChunks[index + 2] = Math.min(map.nextChunks[index + 2], Math.max(y - buffer, chunkY * map.chunkHeight));
    map.nextChunks[index + 3] = Math.max(map.nextChunks[index + 3], Math.min(Math.min(y + buffer, map.height - 1), chunkY * map.chunkHeight + map.chunkHeight - 1));

    if (x >= buffer && x % map.chunkWidth < buffer) {
        map.nextChunks[index - map.chunkStride] = Math.min(map.nextChunks[index - map.chunkStride], x - buffer);
        map.nextChunks[index - map.chunkStride + 1] = Math.max(map.nextChunks[index - map.chunkStride + 1], chunkX * map.chunkWidth - 1);
        map.nextChunks[index - map.chunkStride + 2] = Math.min(map.nextChunks[index - map.chunkStride + 2], Math.max(y - buffer, chunkY * map.chunkHeight));
        map.nextChunks[index - map.chunkStride + 3] = Math.max(map.nextChunks[index - map.chunkStride + 3], Math.min(Math.min(y + buffer, map.height - 1), chunkY * map.chunkHeight + map.chunkHeight - 1));
    }
    if (x < map.width - 1 && x % map.chunkWidth >= map.chunkWidth - buffer) {
        map.nextChunks[index + map.chunkStride] = Math.min(map.nextChunks[index + map.chunkStride], chunkX * map.chunkWidth + map.chunkWidth);
        map.nextChunks[index + map.chunkStride + 1] = Math.max(map.nextChunks[index + map.chunkStride + 1], Math.min(x + buffer, map.width - 1));
        map.nextChunks[index + map.chunkStride + 2] = Math.min(map.nextChunks[index + map.chunkStride + 2], Math.max(y - buffer, chunkY * map.chunkHeight));
        map.nextChunks[index + map.chunkStride + 3] = Math.max(map.nextChunks[index + map.chunkStride + 3], Math.min(Math.min(y + buffer, map.height - 1), chunkY * map.chunkHeight + map.chunkHeight - 1));
    }
    if (y >= buffer && y % map.chunkHeight < buffer) {
        map.nextChunks[index - map.chunkXAmount * map.chunkStride] = Math.min(map.nextChunks[index - map.chunkXAmount * map.chunkStride], Math.max(x - buffer, chunkX * map.chunkWidth));
        map.nextChunks[index - map.chunkXAmount * map.chunkStride + 1] = Math.max(map.nextChunks[index - map.chunkXAmount * map.chunkStride + 1], Math.min(Math.min(x + buffer, map.width - 1), chunkX * map.chunkWidth + map.chunkWidth - 1));
        map.nextChunks[index - map.chunkXAmount * map.chunkStride + 2] = Math.min(map.nextChunks[index - map.chunkXAmount * map.chunkStride + 2], y - buffer);
        map.nextChunks[index - map.chunkXAmount * map.chunkStride + 3] = Math.max(map.nextChunks[index - map.chunkXAmount * map.chunkStride + 3], chunkY * map.chunkHeight - 1);
    }
    if (y < map.height - 1 && y % map.chunkHeight >= map.chunkHeight - buffer) {
        map.nextChunks[index + map.chunkXAmount * map.chunkStride] = Math.min(map.nextChunks[index + map.chunkXAmount * map.chunkStride], Math.max(x - buffer, chunkX * map.chunkWidth));
        map.nextChunks[index + map.chunkXAmount * map.chunkStride + 1] = Math.max(map.nextChunks[index + map.chunkXAmount * map.chunkStride + 1], Math.min(Math.min(x + buffer, map.width - 1), chunkX * map.chunkWidth + map.chunkWidth - 1));
        map.nextChunks[index + map.chunkXAmount * map.chunkStride + 2] = Math.min(map.nextChunks[index + map.chunkXAmount * map.chunkStride + 2], chunkY * map.chunkHeight + map.chunkHeight);
        map.nextChunks[index + map.chunkXAmount * map.chunkStride + 3] = Math.max(map.nextChunks[index + map.chunkXAmount * map.chunkStride + 3], Math.min(y + buffer, map.height - 1));
    }
    if (x >= buffer && x % map.chunkWidth < buffer) {
        if (y >= buffer && y % map.chunkHeight < buffer) {
            map.nextChunks[index - map.chunkStride - map.chunkXAmount * map.chunkStride] = Math.min(map.nextChunks[index - map.chunkStride - map.chunkXAmount * map.chunkStride], x - buffer);
            map.nextChunks[index - map.chunkStride - map.chunkXAmount * map.chunkStride + 1] = Math.max(map.nextChunks[index - map.chunkStride - map.chunkXAmount * map.chunkStride + 1], chunkX * map.chunkWidth - 1);
            map.nextChunks[index - map.chunkStride - map.chunkXAmount * map.chunkStride + 2] = Math.min(map.nextChunks[index - map.chunkStride - map.chunkXAmount * map.chunkStride + 2], y - buffer);
            map.nextChunks[index - map.chunkStride - map.chunkXAmount * map.chunkStride + 3] = Math.max(map.nextChunks[index - map.chunkStride - map.chunkXAmount * map.chunkStride + 3], chunkY * map.chunkHeight - 1);
        }
        if (y < map.height - 1 && y % map.chunkHeight >= map.chunkHeight - buffer) {
            map.nextChunks[index - map.chunkStride + map.chunkXAmount * map.chunkStride] = Math.min(map.nextChunks[index - map.chunkStride + map.chunkXAmount * map.chunkStride], x - buffer);
            map.nextChunks[index - map.chunkStride + map.chunkXAmount * map.chunkStride + 1] = Math.max(map.nextChunks[index - map.chunkStride + map.chunkXAmount * map.chunkStride + 1], chunkX * map.chunkWidth - 1);
            map.nextChunks[index - map.chunkStride + map.chunkXAmount * map.chunkStride + 2] = Math.min(map.nextChunks[index - map.chunkStride + map.chunkXAmount * map.chunkStride + 2], chunkY * map.chunkHeight + map.chunkHeight);
            map.nextChunks[index - map.chunkStride + map.chunkXAmount * map.chunkStride + 3] = Math.max(map.nextChunks[index - map.chunkStride + map.chunkXAmount * map.chunkStride + 3], Math.min(y + buffer, map.height - 1));
        }
    }
    if (x < map.width - 1 && x % map.chunkWidth >= map.chunkWidth - buffer) {
        if (y >= buffer && y % map.chunkHeight < buffer) {
            map.nextChunks[index + map.chunkStride - map.chunkXAmount * map.chunkStride] = Math.min(map.nextChunks[index + map.chunkStride - map.chunkXAmount * map.chunkStride], chunkX * map.chunkWidth + map.chunkWidth);
            map.nextChunks[index + map.chunkStride - map.chunkXAmount * map.chunkStride + 1] = Math.max(map.nextChunks[index + map.chunkStride - map.chunkXAmount * map.chunkStride + 1], Math.min(x + buffer, map.width - 1));
            map.nextChunks[index + map.chunkStride - map.chunkXAmount * map.chunkStride + 2] = Math.min(map.nextChunks[index + map.chunkStride - map.chunkXAmount * map.chunkStride + 2], y - buffer);
            map.nextChunks[index + map.chunkStride - map.chunkXAmount * map.chunkStride + 3] = Math.max(map.nextChunks[index + map.chunkStride - map.chunkXAmount * map.chunkStride + 3], chunkY * map.chunkHeight - 1);
        }
        if (y < map.height - 1 && y % map.chunkHeight >= map.chunkHeight - buffer) {
            map.nextChunks[index + map.chunkStride + map.chunkXAmount * map.chunkStride] = Math.min(map.nextChunks[index + map.chunkStride + map.chunkXAmount * map.chunkStride], chunkX * map.chunkWidth + map.chunkWidth);
            map.nextChunks[index + map.chunkStride + map.chunkXAmount * map.chunkStride + 1] = Math.max(map.nextChunks[index + map.chunkStride + map.chunkXAmount * map.chunkStride + 1], Math.min(x + buffer, map.width - 1));
            map.nextChunks[index + map.chunkStride + map.chunkXAmount * map.chunkStride + 2] = Math.min(map.nextChunks[index + map.chunkStride + map.chunkXAmount * map.chunkStride + 2], chunkY * map.chunkHeight + map.chunkHeight);
            map.nextChunks[index + map.chunkStride + map.chunkXAmount * map.chunkStride + 3] = Math.max(map.nextChunks[index + map.chunkStride + map.chunkXAmount * map.chunkStride + 3], Math.min(y + buffer, map.height - 1));
        }
    }
    addGridUpdatedChunk(map, x, y);
};
function addGridUpdatedChunk(map: SimulatedMap, x: number, y: number) {
    let index = (Math.floor(x / map.chunkWidth) + Math.floor(y / map.chunkHeight) * map.chunkXAmount) * map.chunkStride;
    map.gridUpdatedChunks[index] = Math.min(map.gridUpdatedChunks[index], x);
    map.gridUpdatedChunks[index + 1] = Math.max(map.gridUpdatedChunks[index + 1], x);
    map.gridUpdatedChunks[index + 2] = Math.min(map.gridUpdatedChunks[index + 2], y);
    map.gridUpdatedChunks[index + 3] = Math.max(map.gridUpdatedChunks[index + 3], y);
};

function move(map: SimulatedMap, x1: number, y1: number, x2: number, y2: number) {
    map.nextGrid[(x1 + y1 * map.width) * map.stride + Pixel.Id] = map.grid[(x2 + y2 * map.width) * map.stride + Pixel.Id];
    map.nextGrid[(x1 + y1 * map.width) * map.stride + Pixel.SpeedX] = map.grid[(x2 + y2 * map.width) * map.stride + Pixel.SpeedX];
    map.nextGrid[(x1 + y1 * map.width) * map.stride + Pixel.SpeedY] = map.grid[(x2 + y2 * map.width) * map.stride + Pixel.SpeedY];
    map.nextGrid[(x2 + y2 * map.width) * map.stride + Pixel.Id] = map.grid[(x1 + y1 * map.width) * map.stride + Pixel.Id];
    map.nextGrid[(x2 + y2 * map.width) * map.stride + Pixel.SpeedX] = map.grid[(x1 + y1 * map.width) * map.stride + Pixel.SpeedX];
    map.nextGrid[(x2 + y2 * map.width) * map.stride + Pixel.SpeedY] = map.grid[(x1 + y1 * map.width) * map.stride + Pixel.SpeedY];
    addUpdatedChunk(map, x1, y1);
    addUpdatedChunk(map, x2, y2);
};
function fall(map: SimulatedMap, x: number, y: number, isMoveable: Function = isAir) {
    if (isMoveable(map, x, y + 1)) {
        move(map, x, y, x, y + 1);
    }
};
function flowSearch(map: SimulatedMap, x: number, y: number, distance: number, height: number, isPassable: Function = isAir, isMoveable: Function = isPassable) {
    if (y >= map.height - height) {
        return false;
    }
    let left = 0;
    let right = 0;
    for (let i = 1; i <= distance; i++) {
        if (left < 0) {

        }
        else if (!isMoveable(map, x - i, y)) {
            left = -i;
            if (isPassable(map, x - i + 1, y + 1) && !isPassable(map, x - i, y)) {
                let air = true;
                for (let j = 1; j <= height; j++) {
                    if (!isMoveable(map, x - i, y + j)) {
                        air = false;
                        break;
                    }
                }
                if (air) {
                    left = 1;
                }
            }
        }
        else {
            let air = true;
            for (let j = 0; j <= height; j++) {
                if (!isMoveable(map, x - i, y + j)) {
                    air = false;
                    break;
                }
            }
            if (air) {
                left = 1;
            }
        }
        if (right < 0) {

        }
        else if (!isMoveable(map, x + i, y)) {
            right = -i;
            if (isPassable(map, x + i - 1, y + 1) && !isPassable(map, x + i, y)) {
                let air = true;
                for (let j = 1; j <= height; j++) {
                    if (!isMoveable(map, x + i, y + j)) {
                        air = false;
                        break;
                    }
                }
                if (air) {
                    right = 1;
                }
            }
        }
        else {
            let air = true;
            for (let j = 0; j <= height; j++) {
                if (!isMoveable(map, x + i, y + j)) {
                    air = false;
                    break;
                }
            }
            if (air) {
                right = 1;
            }
        }
        if (left == 1 || right == 1) {
            if (left == 1 && right == 1) {
                if (random() < 0.5) {
                    return -i;
                }
                else {
                    return i;
                }
            }
            else if (left == 1) {
                return -i;
            }
            else if (right == 1) {
                return i;
            }
        }
        if (left < 0 && right < 0) {
            if (!isPassable(map, x, y - 1)) {
                let leftAir = 0;
                let rightAir = 0;
                for (let j = i; j <= distance; j++) {
                    if (leftAir == 0 && !isPassable(map, x - j, y)) {
                        leftAir = j;
                    }
                    if (rightAir == 0 && !isPassable(map, x + j, y)) {
                        rightAir = j;
                    }
                    if (leftAir != 0 || rightAir != 0) {
                        if (leftAir != 0) {
                            if (isMoveable(map, x - 1, y)) {
                                return -i;
                            }
                        }
                        else if (rightAir != 0) {
                            if (isMoveable(map, x + 1, y)) {
                                return i;
                            }
                        }
                        break;
                    }
                }
                // if (left < right) {
                //     if (isMoveable(map, x + 1, y)) {
                //         return i;
                //     }
                //     // if (isPassable(map, x + 1, y) || isId(x + 1, y, WATER)) {
                //     //     return -i;
                //     // }
                // }
                // else if (right < left) {
                //     if (isMoveable(map, x - 1, y)) {
                //         return -i;
                //     }
                //     // if (isPassable(map, x - 1, y) || isId(x - 1, y, WATER)) {
                //     //     return i;
                //     // }
                // }
            }
            if (left == -1 && right == -1) {
                return false;
            }
            return 0;
        }
    }
    return 0;
};
function flow(map: SimulatedMap, x: number, y: number, distance: number, height: number, isPassable: Function = isAir, isMoveable: Function = isPassable) {
    if (isMoveable(map, x, y + 1)) {
        move(map, x, y, x, y + 1);
        return;
    }
    let direction = flowSearch(map, x, y, distance, height, isPassable, isMoveable);
    if (direction === false) {
    }
    else if (direction == 0) {
        if (distance > 2 || height > 2) {
            addUpdatedChunk(map, x, y);
        }
    }
    else if (Math.abs(direction) == 1) {
        move(map, x, y, x + direction, y + 1);
    }
    else {
        move(map, x, y, x + Math.sign(direction), y);
    }
};
function raycastFlow(map: SimulatedMap, x: number, y: number, isPassable: Function = isAir, isMoveable: Function = isPassable, slide: boolean = false, slope: number = 1, disperse: boolean = false, dispersion: number = 5, moveChance: number = 1) {
    let id = map.grid[(x + y * map.width) * map.stride + Pixel.Id];
    let speedX = map.grid[(x + y * map.width) * map.stride + Pixel.SpeedX];
    let speedY = map.grid[(x + y * map.width) * map.stride + Pixel.SpeedY];
    speedY += 1;
    speedX *= 0.99;
    if (Math.abs(speedX) < 1) {
        speedX = 0;
    }
    // if (speedY > 1) {
    //     speedY = 1;
    // }

    let disperseDirection = 0;

    let yLonger = Math.abs(speedY) > Math.abs(speedX);

    let shortLen = yLonger ? speedX : speedY;
    let longLen = yLonger ? speedY : speedX;

    let bounciness = 0.25;

    if (longLen != 0) {
        let inc = Math.sign(longLen);

        let multDiff = shortLen / longLen;
        let side = Math.sign(shortLen);
        if (side == 0) {
            // side = 1;
            side = Math.round(random()) * 2 - 1;
            // if ((x * x + y * y + tick * tick) % grid_size > grid_size / 2) {
            //     side = -1;
            // }
            //side = tick % 2) * 2 - 1;
            //side = floor(f32(x % 4) / 2)) * 2 - 1;
        }

        let offsetX = 0;
        let offsetY = 0;
        let sx = x;
        let sy = y;
        let cx = x;
        let cy = y;
        let ix = x;
        let iy = y;

        let moveStopped = random() > moveChance;

        if (yLonger) {
            // get optimal stop location
            for (let i = inc; ; i += inc) {
                cx = ix;
                cy = iy;
                ix = x + Math.floor(i * multDiff) + offsetX;
                iy = y + i + offsetY;
                let optimal = isMoveable(map, ix, iy);
                let stuck = false;
                move: {
                    if (cx == ix) {
                        if (!optimal) {
                            if (slide) {
                                left: {
                                    for (let j = 0; j <= slope; j++) {
                                        if (!isMoveable(map, cx + side, cy + inc * j)) {
                                            break left;
                                        }
                                    }
                                    offsetX += side;
                                    break move;
                                }
                                right: {
                                    for (let j = 0; j <= slope; j++) {
                                        if (!isMoveable(map, cx - side, cy + inc * j)) {
                                            break right;
                                        }
                                    }
                                    offsetX -= side;
                                    break move;
                                }
                            }
                            if (disperse) {
                                left: {
                                    let stop = 0;
                                    for (let j = 1; j <= dispersion; j++) {
                                        if (!isPassable(map, cx + side * j, cy)) {
                                            if (stop != 0) {
                                                offsetX += side * stop;
                                                offsetY -= inc;
                                                disperseDirection = 1;
                                                break move;
                                            }
                                            break left;
                                        }
                                        if (isMoveable(map, cx + side * j, cy + inc)) {
                                            offsetX += side * j;
                                            disperseDirection = 1;
                                            break move;
                                        }
                                        if (isMoveable(map, cx + side * j, cy)) {
                                            stop = j;
                                        }
                                    }
                                    if (stop != 0) {
                                        offsetX += side * stop;
                                        offsetY -= inc;
                                        disperseDirection = 1;
                                        break move;
                                    }
                                }
                                right: {
                                    let stop = 0;
                                    for (let j = 1; j <= dispersion; j++) {
                                        if (!isPassable(map, cx - side * j, cy)) {
                                            if (stop != 0) {
                                                offsetX -= side * stop;
                                                offsetY -= inc;
                                                disperseDirection = -1;
                                                break move;
                                            }
                                            break right;
                                        }
                                        if (isMoveable(map, cx - side * j, cy + inc)) {
                                            offsetX -= side * j;
                                            disperseDirection = -1;
                                            break move;
                                        }
                                        if (isMoveable(map, cx - side * j, cy)) {
                                            stop = j;
                                        }
                                    }
                                    if (stop != 0) {
                                        offsetX -= side * stop;
                                        offsetY -= inc;
                                        disperseDirection = -1;
                                        break move;
                                    }
                                }
                            }
                            speedX = 0;
                            speedY = 0;
                            // if (speedY >= 4) {
                            //     speedX = speedY * bounciness * -1 * f32(side);
                            //     speedY *= -bounciness;
                            // }
                            // else {
                            //     speedX = 0;
                            //     speedY = 0;
                            // }
                            stuck = true;
                            break move;
                        }
                    }
                    else {
                        if (!optimal) {
                            if (isMoveable(map, cx, cy + inc)) { // forward
                                offsetX -= side;
                            }
                            else if (isMoveable(map, cx + side, cy)) {
                                offsetY -= inc;
                            }
                            else {
                                speedX = 0;
                                speedY = 0;
                                stuck = true;
                            }
                        }
                        else {
                            if (!isMoveable(map, cx, cy + inc) && !isMoveable(map, cx + side, cy)) {
                                speedX = 0;
                                speedY = 0;
                                stuck = true;
                            }
                        }
                    }
                }
                if (stuck) {
                    if (disperseDirection != 0) {
                        // speedX += side * disperseDirection * dispersion;
                        speedY -= inc;
                    }
                    if (cx != x || cy != y || speedX != map.grid[(cx + cy * map.width) * map.stride + Pixel.SpeedX] || speedY != map.grid[(cx + cy * map.width) * map.stride + Pixel.SpeedY]) {
                        map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.Id] = id;
                        map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.SpeedX] = speedX;
                        map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.SpeedY] = speedY;
                        addUpdatedChunk(map, cx, cy);
                    }
                    break;
                }
                if (moveStopped) {
                    // speedY -= 1;
                    // map.nextGrid[cy][cx] = id;
                    // map.nextSpeedXGrid[cy][cx] = speedX;
                    // map.nextSpeedYGrid[cy][cx] = speedY;
                    // if (cx != x || cy != y) {
                    //     map.nextGrid[y][x] = map.grid[cy][cx];
                    //     map.nextSpeedXGrid[y][x] = map.speedXGrid[cy][cx];
                    //     map.nextSpeedYGrid[y][x] = map.speedYGrid[cy][cx];
                    //     addUpdatedChunk(map, x, y);
                    //     addUpdatedChunk(map, cx, cy);
                    // }
                    // addUpdatedChunk(x, y);
                    // grid[index + ID] = id;
                    // grid[index + VEL_X] = speedX;
                    // speedY -= 1;
                    // grid[index + VEL_Y] = speedY - Math.sign(speedY);
                    // grid[index + COLOR_R] = colorR;
                    // grid[index + COLOR_G] = colorG;
                    // grid[index + COLOR_B] = colorB;
                    // grid[index + COLOR_A] = colorA;
                    // grid[index + UPDATED] = tick;
                    // grid[index + PIXEL_DATA] = onFire;
                    break;
                }
                ix = x + Math.floor(i * multDiff) + offsetX;
                iy = y + i + offsetY;
                // if (stopPassable(ix, iy)) {
                //     sx = ix;
                //     sy = iy;
                // }
                map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.Id] = map.grid[(ix + iy * map.width) * map.stride + Pixel.Id];
                map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.SpeedX] = map.grid[(ix + iy * map.width) * map.stride + Pixel.SpeedX];
                map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.SpeedY] = map.grid[(ix + iy * map.width) * map.stride + Pixel.SpeedY];
                addUpdatedChunk(map, cx, cy);

                if (Math.abs(i) >= Math.abs(longLen)) {
                    if (disperseDirection != 0) {
                        // speedX += side * disperseDirection * dispersion;
                        speedY -= inc;
                    }
                    map.nextGrid[(ix + iy * map.width) * map.stride + Pixel.Id] = id;
                    map.nextGrid[(ix + iy * map.width) * map.stride + Pixel.SpeedX] = speedX;
                    map.nextGrid[(ix + iy * map.width) * map.stride + Pixel.SpeedY] = speedY;
                    addUpdatedChunk(map, ix, iy);
                    break;
                }
            }

            // let sIndex = (sx + sy * gridWidth) * stride;
            // if (sIndex != index) {
            //     let minX = gridSize;
            //     let maxX = 0;
            //     let minY = gridSize;
            //     let maxY = 0;
            //     for (let i = 1; i < move.length; i++) {
            //         let x = (move[i] / stride) % gridSize;
            //         let y = Math.floor((move[i] / stride) / gridSize);
            //         minX = Math.min(minX, x);
            //         maxX = Math.max(maxX, x);
            //         minY = Math.min(minY, y);
            //         maxY = Math.max(maxY, y);
            //         for (let j = 0; j < stride; j++) {
            //             grid[move[i - 1] + j] = grid[move[i] + j];
            //         }
            //         if (move[i] == sIndex) {
            //             grid[sIndex + ID] = id;
            //             grid[sIndex + VEL_X] = speedX;
            //             grid[sIndex + VEL_Y] = speedY;
            //             grid[sIndex + COLOR_R] = colorR;
            //             grid[sIndex + COLOR_G] = colorG;
            //             grid[sIndex + COLOR_B] = colorB;
            //             grid[sIndex + COLOR_A] = colorA;
            //             grid[sIndex + UPDATED] = tick;
            //             break;
            //         }
            //     }
            // }
        }
        else {
            for (let i = inc; ; i += inc) {
                cx = ix;
                cy = iy;
                ix = x + i + offsetX;
                iy = y + Math.floor(i * multDiff) + offsetY;
                let optimal = isMoveable(map, ix, iy);
                let stuck = false;
                move: {
                    if (cy == iy) {
                        if (!optimal) {
                            if (slide) {
                                left: {
                                    for (let j = 0; j <= slope; j++) {
                                        if (!isMoveable(map, cx + inc * j, cy + side)) {
                                            break left;
                                        }
                                    }
                                    offsetY += side;
                                    break move;
                                }
                                right: {
                                    for (let j = 0; j <= slope; j++) {
                                        if (!isMoveable(map, cx + inc * j, cy - side)) {
                                            break right;
                                        }
                                    }
                                    offsetY -= side;
                                    break move;
                                }
                            }
                            // if (disperse) {
                            //     left: {
                            //         let stop = 0;
                            //         for (let j = 1; j <= dispersion; j++) {
                            //             if (!isPassable(map, cx - inc, cy + side * j)) {
                            //                 if (stop != 0) {
                            //                     offsetX -= inc;
                            //                     offsetY += side * stop;
                            //                     disperseDirection = 1;
                            //                     break move;
                            //                 }
                            //                 break left;
                            //             }
                            //             if (isMoveable(map, cx, cy + side * j)) {
                            //                 offsetY += side * j;
                            //                 disperseDirection = 1;
                            //                 break move;
                            //             }
                            //             if (isMoveable(map, cx - inc, cy + side * j)) {
                            //                 stop = j;
                            //             }
                            //         }
                            //         if (stop != 0) {
                            //             offsetX -= inc;
                            //             offsetY += side * stop;
                            //             disperseDirection = 1;
                            //             break move;
                            //         }
                            //     }
                            //     right: {
                            //         let stop = 0;
                            //         for (let j = 1; j <= dispersion; j++) {
                            //             if (!isPassable(map, cx - inc, cy - side * j)) {
                            //                 if (stop != 0) {
                            //                     offsetX -= inc;
                            //                     offsetY -= side * stop;
                            //                     disperseDirection = -1;
                            //                     break move;
                            //                 }
                            //                 break right;
                            //             }
                            //             if (isMoveable(map, cx, cy - side * j)) {
                            //                 offsetY -= side * j;
                            //                 disperseDirection = -1;
                            //                 break move;
                            //             }
                            //             if (isMoveable(map, cx - inc, cy - side * j)) {
                            //                 stop = j;
                            //             }
                            //         }
                            //         if (stop != 0) {
                            //             offsetX -= inc;
                            //             offsetY -= side * stop;
                            //             disperseDirection = -1;
                            //             break move;
                            //         }
                            //     }
                            // }
                            speedX = 0;
                            speedY = 0;
                            // if (speedY >= 4) {
                            //     speedX = speedY * bounciness * -1 * f32(side);
                            //     speedY *= -bounciness;
                            // }
                            // else {
                            //     speedX = 0;
                            //     speedY = 0;
                            // }
                            stuck = true;
                            break move;
                        }
                    }
                    else {
                        if (!optimal) {
                            if (isMoveable(map, cx + inc, cy)) { // forward
                                offsetY -= side;
                            }
                            else if (isMoveable(map, cx, cy + side)) {
                                offsetX -= inc;
                            }
                            else {
                                speedX = 0;
                                speedY = 0;
                                stuck = true;
                            }
                        }
                        else {
                            if (!isMoveable(map, cx + inc, cy) && !isMoveable(map, cx, cy + side)) {
                                speedX = 0;
                                speedY = 0;
                                stuck = true;
                            }
                        }
                    }
                }
                if (stuck) {
                    if (cx != x || cy != y || speedX != map.grid[(cx + cy * map.width) * map.stride + Pixel.SpeedX] || speedY != map.grid[(cx + cy * map.width) * map.stride + Pixel.SpeedY]) {
                        map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.Id] = id;
                        map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.SpeedX] = speedX;
                        map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.SpeedY] = speedY;
                        addUpdatedChunk(map, cx, cy);
                    }
                    break;
                }
                if (moveStopped) {
                    // addUpdatedChunk(x, y);
                    // grid[index + ID] = id;
                    // grid[index + VEL_X] = speedX - Math.sign(speedX);
                    // speedY -= 1;
                    // grid[index + VEL_Y] = speedY;
                    // grid[index + COLOR_R] = colorR;
                    // grid[index + COLOR_G] = colorG;
                    // grid[index + COLOR_B] = colorB;
                    // grid[index + COLOR_A] = colorA;
                    // grid[index + UPDATED] = tick;
                    // grid[index + PIXEL_DATA] = onFire;
                    break;
                }
                ix = x + i + offsetX;
                iy = y + Math.floor(i * multDiff) + offsetY;
                
                map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.Id] = map.grid[(ix + iy * map.width) * map.stride + Pixel.Id];
                map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.SpeedX] = map.grid[(ix + iy * map.width) * map.stride + Pixel.SpeedX];
                map.nextGrid[(cx + cy * map.width) * map.stride + Pixel.SpeedY] = map.grid[(ix + iy * map.width) * map.stride + Pixel.SpeedY];
                addUpdatedChunk(map, cx, cy);

                if (Math.abs(i) >= Math.abs(longLen)) {
                    map.nextGrid[(ix + iy * map.width) * map.stride + Pixel.Id] = id;
                    map.nextGrid[(ix + iy * map.width) * map.stride + Pixel.SpeedX] = speedX;
                    map.nextGrid[(ix + iy * map.width) * map.stride + Pixel.SpeedY] = speedY;
                    addUpdatedChunk(map, ix, iy);
                    break;
                }
            }
        }
    }
    else {
        map.nextGrid[(x + y * map.width) * map.stride + Pixel.Id] = id;
        map.nextGrid[(x + y * map.width) * map.stride + Pixel.SpeedX] = speedX;
        map.nextGrid[(x + y * map.width) * map.stride + Pixel.SpeedY] = speedY;
        addUpdatedChunk(map, x, y);
    }
};

function getTouching(map: SimulatedMap, x: number, y: number, id: number) {
    let number = 0;
    if (x > 0) {
        if (map.grid[(x - 1 + y * map.width) * map.stride + Pixel.Id] == id) {
            number += 1;
        }
    }
    if (x < map.width - 1) {
        if (map.grid[(x + 1 + y * map.width) * map.stride + Pixel.Id] == id) {
            number += 1;
        }
    }
    if (y > 0) {
        if (map.grid[(x + (y - 1) * map.width) * map.stride + Pixel.Id] == id) {
            number += 1;
        }
    }
    if (y < map.height - 1) {
        if (map.grid[(x + (y + 1) * map.width) * map.stride + Pixel.Id] == id) {
            number += 1;
        }
    }
    return number;
};

function calculateNormal(map: SimulatedMap, x: number, y: number, radius: number) {
    let vectorX = 0;
    let vectorY = 0;
    for (let y1 = Math.floor(y - radius); y1 <= Math.ceil(y + radius); y1++) {
        for (let x1 = Math.floor(x - radius); x1 <= Math.ceil(x + radius); x1++) {
            if (x1 >= 0 && x1 < map.width && y1 >= 0 && y1 < map.height && pixels[map.grid[(x1 + y1 * map.width) * map.stride + Pixel.Id]].state != State.Solid) {
                continue;
            }
            let weight = Math.pow(Math.E, -(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2)) / (2 * Math.pow(radius / 2, 2)));
            vectorX += (x1 - x) * weight;
            vectorY += (y1 - y) * weight;
        }
    }
    let magnitude = Math.sqrt(Math.pow(vectorX, 2) + Math.pow(vectorY, 2));
    if (magnitude > 0) {
        vectorX /= magnitude;
        vectorY /= magnitude;
    }
    return [-vectorX, -vectorY];
};
function explode(map: SimulatedMap, x: number, y: number, radius: number, normal: number[]) {
    for (let y1 = Math.max(Math.floor(y - radius), 0); y1 <= Math.min(Math.ceil(y + radius), map.height - 1); y1++) {
        for (let x1 = Math.max(Math.floor(x - radius), 0); x1 <= Math.min(Math.ceil(x + radius), map.width - 1); x1++) {
            let distance = Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2));
            if (distance > radius) {
                continue;
            }
            let weight = Math.pow(Math.E, -Math.pow(distance, 2) / (2 * Math.pow(radius / 2, 2)));
            if (random() < weight) {
                map.addUpdate(x1, y1, pixelData.air.index, 0, 0);
                // map.grid[(x1 + y1 * map.width) * map.stride + Pixel.Id] = pixelData.air.index;
            }
            else {
                map.addUpdate(x1, y1, map.grid[(x1 + y1 * map.width) * map.stride + Pixel.Id], map.grid[(x1 + y1 * map.width) * map.stride + Pixel.SpeedX] + (x1 - x) / distance * weight * radius + normal[0] * weight * radius, map.grid[(x1 + y1 * map.width) * map.stride + Pixel.SpeedY] + (y1 - y) / distance * weight * radius + normal[1] * weight * radius);
                // map.grid[(x1 + y1 * map.width) * map.stride + Pixel.SpeedX] += (x1 - x) / distance * weight * radius + normal[0] * weight * radius;
                // map.grid[(x1 + y1 * map.width) * map.stride + Pixel.SpeedY] += (y1 - y) / distance * weight * radius + normal[1] * weight * radius;
            }
        }
    }
};

let pixelData: {
    [key: string]: PixelData,
} = {
    air: {
        color: [225, 255, 255, 1],
        state: State.Gas,
        blastResistance: 0,
    },
    sand: {
        color: [255, 225, 125, 1],
        noise: [10, 10, 10, 0],
        state: State.Solid,
        blastResistance: 100,
        update: function(map: SimulatedMap, x: number, y: number) {
            // flow(map, x, y, 1, 1);
            raycastFlow(map, x, y, (map: SimulatedMap, x: number, y: number) => {
                return isOnGrid(map, x, y) && (map.grid[(x + y * map.width) * map.stride + Pixel.Id] == pixelData.air.index || map.grid[(x + y * map.width) * map.stride + Pixel.Id] == pixelData.sand.index);
            }, isAir, true, 1, false);
        },
    },
    water: {
        color: [75, 100, 255, 1],
        // noise: [25, 25, 25, 0],
        state: State.Liquid,
        blastResistance: 100,
        update: function(map: SimulatedMap, x: number, y: number) {
            raycastFlow(map, x, y, (map: SimulatedMap, x: number, y: number) => {
                return isOnGrid(map, x, y) && (map.grid[(x + y * map.width) * map.stride + Pixel.Id] == pixelData.air.index || map.grid[(x + y * map.width) * map.stride + Pixel.Id] == pixelData.water.index);
            }, isAir, true, 1, true, 8);
        },
    },
    concrete_powder: {
        color: [150, 150, 150, 1],
        state: State.Solid,
        blastResistance: 100,
        update: function(map: SimulatedMap, x: number, y: number) {
            // flow(map, x, y, 1, 2);
            raycastFlow(map, x, y, (map: SimulatedMap, x: number, y: number) => {
                return isOnGrid(map, x, y) && (map.grid[(x + y * map.width) * map.stride + Pixel.Id] == pixelData.air.index || map.grid[(x + y * map.width) * map.stride + Pixel.Id] == pixelData.concrete_powder.index);
            }, isAir, true, 2, false);
        },
    },
    concrete: {
        color: [6, 6, 8, 1],
        state: State.Solid,
        blastResistance: 100,
    },
    concrete_platform: {
        color: [20, 16, 19, 1],
        state: State.SolidPlatform,
        blastResistance: 100,
    },
    concrete_background_light: {
        color: [109, 117, 141, 1],
        state: State.Gas,
        blastResistance: 100,
    },
    concrete_background_medium: {
        color: [74, 84, 98, 1],
        state: State.Gas,
        blastResistance: 100,
    },
    concrete_background_dark: {
        color: [51, 57, 65, 1],
        state: State.Gas,
        blastResistance: 100,
    },
    concrete_wall_light: {
        color: [218, 224, 234, 1],
        state: State.Gas,
        blastResistance: 100,
    },
    concrete_wall_dark: {
        color: [179, 185, 209, 1],
        state: State.Gas,
        blastResistance: 100,
    },
};

let pixels: PixelData[] = [

];

for (let i in pixelData) {
    pixelData[i as keyof typeof pixelData].id = i;
    pixelData[i as keyof typeof pixelData].index = pixels.length;
    pixels.push(pixelData[i as keyof typeof pixelData]);
}

export { Pixel, PixelData, pixelData, pixels, State, addUpdatedChunk, getTouching, calculateNormal, explode };