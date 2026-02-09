/**
 * MAZE_GENERATOR.JS    
 * 21x21 células com posicionamento automático de objetos
 */

// ===== CONFIGURAÇÕES DO LABIRINTO =====
const MAZE_CONFIG = {
    gridWidth: 21,       // Largura em células
    gridHeight: 21,      // Altura em células
    cellSize: 0.5,       // Tamanho de cada célula (maior = paredes mais visíveis)
    wallHeight: 1.0,     // Altura das paredes
    originX: -5.25,      // Origem X (centralizado)
    originZ: -5.25,      // Origem Z (centralizado)
};

// ===== GERADOR DE LABIRINTO =====
function generateMazeMatrix(width, height) {
    // Inicializa matriz toda como parede (1)
    const maze = [];
    for (let z = 0; z < height; z++) {
        maze[z] = [];
        for (let x = 0; x < width; x++) {
            maze[z][x] = 1;
        }
    }

    // Função para obter vizinhos não visitados (a 2 células de distância)
    function getUnvisitedNeighbors(x, z) {
        const neighbors = [];
        const directions = [
            { dx: 0, dz: -2 }, // Norte
            { dx: 0, dz: 2 },  // Sul
            { dx: -2, dz: 0 }, // Oeste
            { dx: 2, dz: 0 },  // Leste
        ];

        for (const dir of directions) {
            const nx = x + dir.dx;
            const nz = z + dir.dz;
            if (nx > 0 && nx < width - 1 && nz > 0 && nz < height - 1) {
                if (maze[nz][nx] === 1) {
                    neighbors.push({ x: nx, z: nz, dx: dir.dx / 2, dz: dir.dz / 2 });
                }
            }
        }
        return neighbors;
    }

    // DFS iterativo com stack
    const stack = [];
    const startX = Math.floor(width / 2) % 2 === 0 ? Math.floor(width / 2) + 1 : Math.floor(width / 2);
    const startZ = height - 2; // Começa na entrada (sul)

    maze[startZ][startX] = 0;
    stack.push({ x: startX, z: startZ });

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = getUnvisitedNeighbors(current.x, current.z);

        if (neighbors.length === 0) {
            stack.pop();
        } else {
            // Escolhe vizinho aleatório
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            // Remove parede entre atual e próximo
            maze[current.z + next.dz][current.x + next.dx] = 0;
            // Marca próximo como visitado
            maze[next.z][next.x] = 0;
            stack.push({ x: next.x, z: next.z });
        }
    }

    // === ENTRADAS E SAÍDAS ===
    // Entrada (sul) - centro
    const entranceX = Math.floor(width / 2);
    if (entranceX % 2 === 0) entranceX + 1; // Mantém a lógica original mas o spawn real será ajustado no placeObjects
    maze[height - 1][entranceX] = 0;
    maze[height - 2][entranceX] = 0;

    // Saída (norte) - centro
    const exitX = Math.floor(width / 2);
    maze[0][exitX] = 0;
    maze[1][exitX] = 0;

    return maze;
}

// ===== ENCONTRAR CÉLULAS VAZIAS PARA OBJETOS =====
function findEmptyCells(maze) {
    const emptyCells = [];
    const height = maze.length;
    const width = maze[0].length;

    for (let z = 2; z < height - 2; z++) {
        for (let x = 2; x < width - 2; x++) {
            if (maze[z][x] === 0) {
                // Verifica se não está muito perto das bordas
                emptyCells.push({ gridX: x, gridZ: z });
            }
        }
    }

    // Embaralha para distribuição aleatória
    for (let i = emptyCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
    }

    return emptyCells;
}

// Converte coordenadas do grid para coordenadas do mundo
function gridToWorld(gridX, gridZ) {
    return {
        x: MAZE_CONFIG.originX + gridX * MAZE_CONFIG.cellSize + MAZE_CONFIG.cellSize / 2,
        z: MAZE_CONFIG.originZ + gridZ * MAZE_CONFIG.cellSize + MAZE_CONFIG.cellSize / 2
    };
}

// ===== POSICIONAR OBJETOS AUTOMATICAMENTE =====
function placeObjects(maze, emptyCells) {
    const height = maze.length;
    const width = maze[0].length;

    // Spawn do jogador (sul, centro ajustado para ímpar)
    let spawnGridX = Math.floor(width / 2);
    if (spawnGridX % 2 === 0) spawnGridX += 1;
    const spawnGridZ = height - 2;
    const spawnWorld = gridToWorld(spawnGridX, spawnGridZ);

    // Porta de saída (norte, centro)
    const exitGridX = Math.floor(width / 2);
    const exitGridZ = 1;
    const exitWorld = gridToWorld(exitGridX, exitGridZ);

    // Remove células próximas ao spawn e saída
    const filteredCells = emptyCells.filter(cell => {
        const distToSpawn = Math.abs(cell.gridX - spawnGridX) + Math.abs(cell.gridZ - spawnGridZ);
        const distToExit = Math.abs(cell.gridX - exitGridX) + Math.abs(cell.gridZ - exitGridZ);
        return distToSpawn > 4 && distToExit > 3;
    });

    let cellIndex = 0;

    // Função auxiliar para pegar próxima célula
    function getNextCell() {
        if (cellIndex >= filteredCells.length) return null;
        const cell = filteredCells[cellIndex++];
        return gridToWorld(cell.gridX, cell.gridZ);
    }

    // === POSICIONAR CHAVES (3) ===
    const keyPositions = [];
    for (let i = 0; i < 3; i++) {
        const pos = getNextCell();
        if (pos) {
            keyPositions.push({ x: pos.x, y: 0.2, z: pos.z });
        }
    }

    // === POSICIONAR ESTÁTUAS ===
    const angelPositions = [];
    const pos1 = getNextCell();
    if (pos1) angelPositions.push({ x: pos1.x, y: 0.08, z: pos1.z });

    const anubisPositions = [];
    const pos2 = getNextCell();
    if (pos2) anubisPositions.push({ x: pos2.x, y: 0.08, z: pos2.z });

    // === POSICIONAR DECORAÇÕES ===
    const gravestonesPositions = [];
    for (let i = 0; i < 4; i++) {
        const pos = getNextCell();
        if (pos) gravestonesPositions.push({ x: pos.x, y: 0.05, z: pos.z });
    }

    const bonesPositions = [];
    for (let i = 0; i < 3; i++) {
        const pos = getNextCell();
        if (pos) bonesPositions.push({ x: pos.x, y: 0.03, z: pos.z });
    }

    const treePositions = [];
    for (let i = 0; i < 2; i++) {
        const pos = getNextCell();
        if (pos) treePositions.push({ x: pos.x, y: 0.07, z: pos.z });
    }

    const skeletonPositions = [];
    const pos3 = getNextCell();
    if (pos3) skeletonPositions.push({ x: pos3.x, y: 0.3, z: pos3.z });

    return {
        spawn: { x: 0, y: 0.15, z: 5 },
        door: { x: exitWorld.x, y: 0, z: -4.75 },
        keys: keyPositions,
        angel: angelPositions,
        anubis: anubisPositions,
        gravestones: gravestonesPositions,
        bones: bonesPositions,
        trees: treePositions,
        skeleton: skeletonPositions,
        moon: { x: 0, y: 8.0, z: -3.0 }
    };
}

// ===== GERAÇÃO DE GEOMETRIA 3D =====
function generateMazeGeometry(maze) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const indices = [];

    const cellSize = MAZE_CONFIG.cellSize;
    const wallHeight = MAZE_CONFIG.wallHeight;
    const originX = MAZE_CONFIG.originX;
    const originZ = MAZE_CONFIG.originZ;

    let vertexOffset = 0;

    for (let z = 0; z < maze.length; z++) {
        for (let x = 0; x < maze[0].length; x++) {
            if (maze[z][x] === 1) {
                // Calcula posição do cubo no mundo
                const wx = originX + x * cellSize;
                const wz = originZ + z * cellSize;

                // Adiciona cubo (6 faces)
                const cubeData = createCube(wx, 0, wz, cellSize, wallHeight, cellSize, vertexOffset);

                vertices.push(...cubeData.vertices);
                normals.push(...cubeData.normals);
                texCoords.push(...cubeData.texCoords);
                indices.push(...cubeData.indices);

                vertexOffset += 24; // 24 vértices por cubo
            }
        }
    }

    // Adiciona chão
    const floorWidth = maze[0].length * cellSize;
    const floorDepth = maze.length * cellSize;
    const floorData = createFloor(originX, originZ, floorWidth, floorDepth, vertexOffset);
    vertices.push(...floorData.vertices);
    normals.push(...floorData.normals);
    texCoords.push(...floorData.texCoords);
    indices.push(...floorData.indices);

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices)
    };
}

// Cria um cubo (parede)
function createCube(x, y, z, width, height, depth, indexOffset) {
    const w = width, h = height, d = depth;

    const x0 = x, x1 = x + w;
    const y0 = y, y1 = y + h;
    const z0 = z, z1 = z + d;

    const texRepeatX = 1;
    const texRepeatY = height / width * 2;

    const vertices = [
        // Frente (Z+)
        x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1,
        // Trás (Z-)
        x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0,
        // Topo (Y+)
        x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0,
        // Base (Y-)
        x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1,
        // Direita (X+)
        x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1,
        // Esquerda (X-)
        x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0,
    ];

    const normals = [
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ];

    const texCoords = [];
    for (let i = 0; i < 6; i++) {
        texCoords.push(0, 0, texRepeatX, 0, texRepeatX, texRepeatY, 0, texRepeatY);
    }

    const indices = [];
    for (let i = 0; i < 6; i++) {
        const base = indexOffset + i * 4;
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    return { vertices, normals, texCoords, indices };
}

// Cria o chão
function createFloor(x, z, width, depth, indexOffset) {
    const y = -0.01;

    const vertices = [
        x, y, z,
        x + width, y, z,
        x + width, y, z + depth,
        x, y, z + depth
    ];

    const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];

    const texRepeat = 10;
    const texCoords = [0, 0, texRepeat, 0, texRepeat, texRepeat, 0, texRepeat];

    const indices = [
        indexOffset, indexOffset + 1, indexOffset + 2,
        indexOffset, indexOffset + 2, indexOffset + 3
    ];

    return { vertices, normals, texCoords, indices };
}

// ===== CRIAÇÃO DE BUFFERS WEBGL =====
function createMazeBuffers(gl, geometryData) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometryData.vertices, gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometryData.normals, gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometryData.texCoords, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometryData.indices, gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        normal: normalBuffer,
        texCoord: texCoordBuffer,
        indices: indexBuffer,
        vertexCount: geometryData.indices.length
    };
}

// ===== FUNÇÃO DE RENDERIZAÇÃO =====
function drawMaze(gl, buffers, shaderProgram, texture) {
    const aPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    const aNormal = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    const aTexCoord = gl.getAttribLocation(shaderProgram, "aTexCoord");

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    if (aNormal >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aNormal);
    }

    if (aTexCoord >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aTexCoord);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, gl.UNSIGNED_SHORT, 0);
}

function initializeMaze(gl) {
    const maze = generateMazeMatrix(MAZE_CONFIG.gridWidth, MAZE_CONFIG.gridHeight);
    const emptyCells = findEmptyCells(maze);
    const objects = placeObjects(maze, emptyCells);
    const geometry = generateMazeGeometry(maze);
    const buffers = createMazeBuffers(gl, geometry);

    console.log("Labirinto gerado:", MAZE_CONFIG.gridWidth, "x", MAZE_CONFIG.gridHeight);
    console.log("Spawn:", objects.spawn);
    console.log("Porta:", objects.door);
    console.log("Chaves:", objects.keys);

    return {
        matrix: maze,
        buffers: buffers,
        config: MAZE_CONFIG,
        objects: objects
    };
}
