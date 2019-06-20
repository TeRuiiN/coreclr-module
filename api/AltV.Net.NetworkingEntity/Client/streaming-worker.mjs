let maxCoordinate = 50000;
let areaSize = 100;
let maxAreaIndex = maxCoordinate / areaSize;

onmessage = function (e) {
    let data = e.data;
    if (!this.areas) { // Init areas for fast spacing algorithm
        this.areas = new Array(maxAreaIndex);
        for (let i = 0; i < maxAreaIndex; i++) {
            this.areas[i] = new Array(maxAreaIndex);
            for (let j = 0; j < maxAreaIndex; j++) {
                this.areas[i][j] = [];
            }
        }
    }
    if (!this.streamedIn) {
        this.streamedIn = new Map();
    }
    if (data.position) {
        this.position = data.position;
    }
    if (data.entities) {
        // Fill entities in areas
        for (let i = 0; i < maxAreaIndex; i++) {
            for (let j = 0; j < maxAreaIndex; j++) {
                this.areas[i][j] = [];
            }
        }
        for (const [id, entity] of data.entities) {
            addEntityToArea(entity);
        }
    }
    if (data.entityToAdd) {
        addEntityToArea(data.entityToAdd);
    }
    if (data.entityToRemove) {
        if (this.streamedIn.has(data.entityToRemove.id)) {
            this.streamedIn.delete(data.entityToRemove.id);
            postMessage({streamOut: this.streamedIn.get(data.entityToRemove.id)});
        }
        removeEntityFromArea(data.entityToRemove);
    }
    start(this.position);
};

function addEntityToArea(entity) {
    const [startingYIndex, startingXIndex, stoppingYIndex, stoppingXIndex] = calcStartStopIndex(entity);
    if (startingYIndex == null || startingXIndex == null || stoppingYIndex == null || stoppingXIndex == null) return;
    for (let i = startingYIndex; i <= stoppingYIndex; i++) {
        for (let j = startingXIndex; j <= stoppingXIndex; j++) {
            this.areas[i][j].push(entity);
        }
    }
}

function calcStartStopIndex(entity) {
    let posX = offsetPosition(entity.position.x);
    let posY = offsetPosition(entity.position.y);

    if (posX < 0 || posY < 0 || posX > maxCoordinate || posY > maxCoordinate) return [null, null, null, null];

    let maxX = posX + entity.range;
    let maxY = posY + entity.range;
    let minX = posX - entity.range;
    let minY = posY - entity.range;

    let startingYIndex = Math.floor(minY / areaSize);
    let startingXIndex = Math.floor(minX / areaSize);
    let stoppingYIndex = Math.floor(maxY / areaSize);
    let stoppingXIndex = Math.floor(maxX / areaSize);

    return [startingYIndex, startingXIndex, stoppingYIndex, stoppingXIndex];
}

function removeEntityFromArea(entity) {
    const [startingYIndex, startingXIndex, stoppingYIndex, stoppingXIndex] = calcStartStopIndex(entity);
    if (startingYIndex == null || startingXIndex == null || stoppingYIndex == null || stoppingXIndex == null) return;
    for (let i = startingYIndex; i <= stoppingYIndex; i++) {
        for (let j = startingXIndex; j <= stoppingXIndex; j++) {
            this.areas[i][j].filter((arrEntity) => arrEntity.id !== entity.id)
        }
    }
}

function distance(v1, v2) {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    const dz = v1.z - v2.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function offsetPosition(value) {
    return value + 10000;
}

function start(position) {
    let keysToDeleteFromStreamedIn = [];
    for (const [id, entity] of this.streamedIn) {
        if (distance(entity.position, position) > entity.range) {
            postMessage({streamOut: entity});
            keysToDeleteFromStreamedIn.push(id);
        }
    }
    for (let key of keysToDeleteFromStreamedIn) {
        this.streamedIn.delete(key);
    }

    let posX = offsetPosition(position.x);
    let posY = offsetPosition(position.y);

    if (posX < 0 || posY < 0 || posX > maxCoordinate || posY > maxCoordinate) return;

    let xIndex = Math.floor(posX / areaSize);
    let yIndex = Math.floor(posY / areaSize);

    let entitiesInArea = this.areas[xIndex][yIndex];

    for (let entity of entitiesInArea) {
        if (!this.streamedIn.has(entity.id)) {
            if (distance(entity.position, position) <= entity.range) {
                postMessage({streamIn: entity});
                this.streamedIn.set(entity.id, entity)
            }
        }
    }
}