/**
 * ARQUIVO: main.js (VERSÃO FINAL MERGE - LANTERNA COM TECLA F)
 */

let gl, shaderProgram, stoneTexture;
let generatedMaze; // Novo: labirinto gerado
let keyBuffers, gravestoneBuffers, bonesBuffers;
let angelBuffers, anubisBuffers, treeBuffers, skeletonBuffers, moonBuffers;
let candelabraBuffers, roomBuffers, tableBuffers, whiteboardBuffers, doorBuffers, lanternaBuffers;

let keyAnimationTime = 0;
let lanternaLigada = true; // [ESTADO DA LANTERNA] Começa ligada
let walkCycle = 0; // [HEAD BOBBING] Ciclo de caminhada

// ===== SISTEMA DE CÂMERA E LIMITES =====
// Limites serão definidos após geração do labirinto
let MAZE_MIN_X = -5.5, MAZE_MAX_X = 5.5, MAZE_MIN_Z = -5.5, MAZE_MAX_Z = 5.5;

// ===== SPAWN DO JOGADOR (será atualizado pelo gerador) =====
let PLAYER_SPAWN = {
    x: 0,
    y: 0.15,
    z: 4.5
};

let cameraX = PLAYER_SPAWN.x;
let cameraY = PLAYER_SPAWN.y;
let cameraZ = PLAYER_SPAWN.z;
let cameraYaw = Math.PI, cameraPitch = 0; // Olhando para norte
const moveSpeed = 0.01, rotSpeed = 0.03; // Velocidade ajustada
const keys = {};

// ===== SISTEMA DE JOGO (HUD & LOGICA) =====
let startTime = 0;
let keysFound = 0;
const totalKeys = 3;
let collectedKeys = [false, false, false];

let isEntrySequenceActive = false;
let entryStartTime = 0;
const ENTRY_DURATION = 3.0;

// ===== POSIÇÕES DOS OBJETOS (serão atualizadas pelo gerador) =====
let keyPositions = [];
let gravestonesPositions = [];
let bonesPositions = [];
let angelPositions = [];
let anubisPositions = [];
let treePositions = [];
let skeletonPositions = [];
let moonPosition = { x: 0, y: 8.0, z: -3.0 };
let doorPosition = { x: 0, y: 0, z: -5.0 };

function initControls() {
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        keys[key] = true;

        // [LOGICA DA TECLA F] Toggle da lanterna
        if (key === 'f') {
            lanternaLigada = !lanternaLigada;
        }

        // [LOGICA DA TECLA ESPACO] Interação com a porta
        if (key === ' ') {
            checkDoorInteraction();
        }

        if (key === "e" || key === "E") {
            if (canOpenDoor && !doorIsOpen) {
                doorIsOpen = true;
                console.log("Porta aberta");
            }
        }
    });
    document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

    // [CONTROLE DO MOUSE] Movimento da câmera
    document.addEventListener('mousemove', (e) => {
        // Só funciona quando o pointer está bloqueado (jogo em andamento)
        if (document.pointerLockElement) {
            const sensitivity = 0.002;
            cameraYaw += e.movementX * sensitivity;
            cameraPitch -= e.movementY * sensitivity;

            // Limita o pitch para não virar de cabeça para baixo
            cameraPitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, cameraPitch));
        }
    });

    // [POINTER LOCK] Clique para recapturar o mouse
    const canvas = document.querySelector("#meuCanvas");
    canvas.addEventListener('click', () => {
        if (!document.pointerLockElement && startTime > 0) {
            canvas.requestPointerLock();
        }
    });
}

function startGame() {
    document.getElementById('instructions').classList.add('hidden');

    // [START TIMER] Define o tempo inicial
    startTime = Date.now();

    isEntrySequenceActive = true;
    entryStartTime = performance.now() / 1000;
    const canvas = document.querySelector("#meuCanvas");
    canvas.requestPointerLock();
}

function createBoxCollider(cx, cz, size) {
    return {
        minX: cx - size,
        maxX: cx + size,
        minZ: cz - size,
        maxZ: cz + size
    };
}

// Cria collider retangular para paredes finas (x1,z1 até x2,z2 + espessura t)
function createThinWall(x1, z1, x2, z2, t = 0.05) {
    return {
        minX: Math.min(x1, x2) - t,
        maxX: Math.max(x1, x2) + t,
        minZ: Math.min(z1, z2) - t,
        maxZ: Math.max(z1, z2) + t
    };
}

// ===== COLLIDERS DAS PAREDES DO LABIRINTO =====
// Baseado na imagem do Blender - Vista de cima
// Labirinto vai de aprox. X: -1.2 a 1.05, Z: -1.17 a 1.08
// Espessura das paredes: ~0.03

const WALL_THICKNESS = 0.03;

function createHWall(x1, x2, z) { // Parede Horizontal
    return {
        minX: Math.min(x1, x2),
        maxX: Math.max(x1, x2),
        minZ: z - WALL_THICKNESS,
        maxZ: z + WALL_THICKNESS
    };
}

function createVWall(x, z1, z2) { // Parede Vertical
    return {
        minX: x - WALL_THICKNESS,
        maxX: x + WALL_THICKNESS,
        minZ: Math.min(z1, z2),
        maxZ: Math.max(z1, z2)
    };
}

// ===== SISTEMA DE COLISÃO BASEADO EM MATRIZ 2D =====
// A matriz agora é gerada pelo maze_generator.js
// 1 = parede (bloqueado), 0 = caminho (livre)

let CELL_SIZE = 0.15;
let MAZE_ORIGIN_X = -1.20;
let MAZE_ORIGIN_Z = -1.17;

// Matriz do labirinto - será preenchida pelo gerador
let mazeGrid = [];

function worldToGrid(worldX, worldZ) {
    const gridX = Math.floor((worldX - MAZE_ORIGIN_X) / CELL_SIZE);
    const gridZ = Math.floor((worldZ - MAZE_ORIGIN_Z) / CELL_SIZE);
    return { x: gridX, z: gridZ };
}

function isPositionBlocked(worldX, worldZ) {
    const grid = worldToGrid(worldX, worldZ);
    if (grid.z < 0 || grid.z >= mazeGrid.length) return true;
    if (grid.x < 0 || grid.x >= mazeGrid[0].length) return true;
    return mazeGrid[grid.z][grid.x] === 1;
}

function checkMazeCollision(worldX, worldZ, radius) {
    const offsets = [
        { x: -radius, z: -radius },
        { x: radius, z: -radius },
        { x: -radius, z: radius },
        { x: radius, z: radius },
    ];
    for (const offset of offsets) {
        if (isPositionBlocked(worldX + offset.x, worldZ + offset.z)) {
            return true;
        }
    }
    return false;
}

// Colliders serão criados dinamicamente após geração do labirinto
let wallColliders = [];

// Door collider será atualizado após geração
let doorCollider = { minX: -0.5, maxX: 0.5, minZ: -6, maxZ: -5 };

function checkAABBCollision2D(x, z, box) {
    const playerRadius = 0.25; // Raio maior para labirinto maior

    return (
        x + playerRadius > box.minX &&
        x - playerRadius < box.maxX &&
        z + playerRadius > box.minZ &&
        z - playerRadius < box.maxZ
    );
}

let doorIsOpen = false;
let canOpenDoor = false;


function updateCamera() {
    if (isEntrySequenceActive) {
        const elapsedTime = (performance.now() / 1000) - entryStartTime;
        let progress = Math.min(elapsedTime / ENTRY_DURATION, 1.0);

        // Posição inicial (alto, centro do mapa)
        let startX = 0, startY = 12.0, startZ = 0;
        let startPitch = -Math.PI / 2; // Olhando para baixo
        let startYaw = 0;

        // Posição final (Inicio do jogo)
        let endX = PLAYER_SPAWN.x;
        let endY = PLAYER_SPAWN.y;
        let endZ = PLAYER_SPAWN.z;
        let endPitch = 0;
        let endYaw = Math.PI; // Olhando para norte

        if (elapsedTime < 1.0) {
            // [Fase 1] Espera um pouco lá em cima
            cameraX = startX;
            cameraY = startY;
            cameraZ = startZ;
            cameraPitch = startPitch;
            cameraYaw = startYaw;
        } else {
            // [Fase 2] Desce para o labirinto
            const moveEase = -(Math.cos(Math.PI * Math.min((elapsedTime - 1.0) / 2.0, 1.0)) - 1) / 2;

            cameraX = startX + (endX - startX) * moveEase;
            cameraY = startY + (endY - startY) * moveEase;
            cameraZ = startZ + (endZ - startZ) * moveEase;
            cameraPitch = startPitch + (endPitch - startPitch) * moveEase;
            cameraYaw = startYaw + (endYaw - startYaw) * moveEase;
        }

        if (progress >= 1.0) {
            isEntrySequenceActive = false;

            cameraX = PLAYER_SPAWN.x;
            cameraY = PLAYER_SPAWN.y;
            cameraZ = PLAYER_SPAWN.z;

        }
        return;
    }

    let oldX = cameraX, oldZ = cameraZ;
    const forwardX = Math.sin(cameraYaw), forwardZ = -Math.cos(cameraYaw);
    const rightX = Math.cos(cameraYaw), rightZ = Math.sin(cameraYaw);

    if (keys['w']) { cameraX += forwardX * moveSpeed; cameraZ += forwardZ * moveSpeed; }
    if (keys['s']) { cameraX -= forwardX * moveSpeed; cameraZ -= forwardZ * moveSpeed; }
    if (keys['a']) { cameraX -= rightX * moveSpeed; cameraZ -= rightZ * moveSpeed; }
    if (keys['d']) { cameraX += rightX * moveSpeed; cameraZ += rightZ * moveSpeed; }

    const margin = 0.10;
    const playerRadius = 0.12;

    // Verifica colisão com a MATRIZ do labirinto
    // Tenta mover em X primeiro
    if (checkMazeCollision(cameraX, oldZ, playerRadius)) {
        cameraX = oldX;
    }
    // Depois tenta mover em Z
    if (checkMazeCollision(cameraX, cameraZ, playerRadius)) {
        cameraZ = oldZ;
    }

    // Limites do mapa
    if (cameraX < MAZE_MIN_X + margin || cameraX > MAZE_MAX_X - margin) cameraX = oldX;
    if (cameraZ < MAZE_MIN_Z + margin || cameraZ > MAZE_MAX_Z - margin) cameraZ = oldZ;

    // Objetos específicos (Anubis)
    for (const box of wallColliders) {
        if (checkAABBCollision2D(cameraX, cameraZ, box)) {
            cameraX = oldX;
            cameraZ = oldZ;
            break;
        }
    }

    // porta
    if (!doorIsOpen && checkAABBCollision2D(cameraX, cameraZ, doorCollider)) {
        cameraX = oldX;
        cameraZ = oldZ;
        canOpenDoor = true;
    }

    // [HEAD BOBBING] Efeito de caminhada
    const isMoving = keys['w'] || keys['s'] || keys['a'] || keys['d'];
    if (isMoving) {
        walkCycle += 0.15; // Velocidade do passo
        // Senoide para subir e descer a câmera (simulando passos)
        const bob = Math.max(0, Math.sin(walkCycle)) * 0.012;
        cameraY = PLAYER_SPAWN.y + bob;
    } else {
        // Se parar, volta suavemente para a altura original
        cameraY += (PLAYER_SPAWN.y - cameraY) * 0.15;
        walkCycle = 0;
    }

    if (keys['arrowleft']) cameraYaw -= rotSpeed;
    if (keys['arrowright']) cameraYaw += rotSpeed;
    if (keys['arrowup']) cameraPitch = Math.min(cameraPitch + rotSpeed, Math.PI / 3);
    if (keys['arrowdown']) cameraPitch = Math.max(cameraPitch - rotSpeed, -Math.PI / 3);

    if (cameraY < PLAYER_SPAWN.y) {
        cameraY = PLAYER_SPAWN.y;
    }

}

async function iniciaWebGL() {
    const canvas = document.querySelector("#meuCanvas");
    gl = getGL(canvas);
    if (!gl) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.01, 0.01, 0.03, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    shaderProgram = createProgramFromSources(gl, vsSource, fsSource);

    try {
        // Inicializa o labirinto gerado
        generatedMaze = initializeMaze(gl);
        mazeGrid = generatedMaze.matrix;
        CELL_SIZE = generatedMaze.config.cellSize;
        MAZE_ORIGIN_X = generatedMaze.config.originX;
        MAZE_ORIGIN_Z = generatedMaze.config.originZ;

        // Atualiza limites do mapa
        const mazeWidth = generatedMaze.config.gridWidth * CELL_SIZE;
        const mazeHeight = generatedMaze.config.gridHeight * CELL_SIZE;
        MAZE_MIN_X = MAZE_ORIGIN_X;
        MAZE_MAX_X = MAZE_ORIGIN_X + mazeWidth;
        MAZE_MIN_Z = MAZE_ORIGIN_Z;
        MAZE_MAX_Z = MAZE_ORIGIN_Z + mazeHeight;

        // Usa posições geradas automaticamente
        const obj = generatedMaze.objects;
        PLAYER_SPAWN = obj.spawn;
        doorPosition = obj.door;
        keyPositions = obj.keys;
        angelPositions = obj.angel;
        anubisPositions = obj.anubis;
        gravestonesPositions = obj.gravestones;
        bonesPositions = obj.bones;
        treePositions = obj.trees;
        skeletonPositions = obj.skeleton;
        moonPosition = obj.moon;

        // Atualiza posição inicial da câmera
        cameraX = PLAYER_SPAWN.x;
        cameraY = PLAYER_SPAWN.y;
        cameraZ = PLAYER_SPAWN.z;

        async function prepararModelo(path, normalizar = true) {
            const rawData = await carregarOBJComMTL(path);
            if (!rawData.vertices || rawData.vertices.length === 0) return null;
            let finalData = normalizar ? normalizarModelo(rawData) : rawData;
            if (!finalData.cores && rawData.cores) finalData.cores = rawData.cores;
            return criarBuffersOBJComCores(gl, finalData);
        }

        // mazeBuffers removido - agora usa generatedMaze.buffers
        keyBuffers = await prepararModelo('modelos/Key/Key_01(1).obj');
        gravestoneBuffers = await prepararModelo('modelos/gravestone/model.obj');
        bonesBuffers = await prepararModelo('modelos/Pile of Bones/PileBones.obj');
        angelBuffers = await prepararModelo('modelos/AngelStatue/AngelStatue.obj');
        anubisBuffers = await prepararModelo('modelos/Anubis Statue/anubis.obj');
        treeBuffers = await prepararModelo('modelos/deadTree/model.obj');
        skeletonBuffers = await prepararModelo('modelos/Skeleton/model.obj');
        moonBuffers = await prepararModelo('modelos/Moon/model.obj');
        roomBuffers = await prepararModelo('modelos/Room empty/model.obj');
        tableBuffers = await prepararModelo('modelos/Table (1)/model.obj');
        whiteboardBuffers = await prepararModelo('modelos/Whiteboard/Whiteboard.obj');
        doorBuffers = await prepararModelo('modelos/door/model.obj');
        lanternaBuffers = await prepararModelo('modelos/lanterna/model.obj');

        stoneTexture = await carregarTextura(gl, 'modelos/img_dark_stone.jpg');

        initControls();
        renderLoop();
    } catch (e) { console.error(e); }
}

function renderLoop() {
    updateCamera();
    renderizar();

    // 1. ATUALIZA COORDENADAS
    const coordsCtx = document.getElementById('coords');
    if (coordsCtx) {
        coordsCtx.innerText = `X: ${cameraX.toFixed(2)} | Y: ${cameraY.toFixed(2)} | Z: ${cameraZ.toFixed(2)}`;
    }

    // 2. ATUALIZA TIMER (Apenas se o jogo começou e não estamos na intro)
    if (!isEntrySequenceActive && startTime > 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) timeDisplay.innerText = `${minutes}:${seconds}`;
    }

    // 3. DETECTA COLETA DE CHAVES
    keyPositions.forEach((pos, i) => {
        if (!collectedKeys[i]) {
            // Distancia simples Euclideana 3D
            let dx = cameraX - pos.x;
            let dy = cameraY - pos.y;
            let dz = cameraZ - pos.z;
            let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Raio de coleta ajustado (0.1 para cada eixo ou 0.1 total)
            // Se for < 0.2 no total já garante proximidade real
            if (Math.abs(dx) < 0.15 && Math.abs(dy) < 0.2 && Math.abs(dz) < 0.15) {
                collectedKeys[i] = true;
                keysFound++;

                // Atualiza HUD
                const keysDisplay = document.getElementById('keys-display');
                if (keysDisplay) {
                    keysDisplay.innerText = `${keysFound}/${totalKeys}`;
                    // Adiciona classe de animação e remove depois
                    const hudItem = document.getElementById('key-counter');
                    hudItem.classList.add('key-collected');
                    setTimeout(() => hudItem.classList.remove('key-collected'), 500);
                }

                // (Opcional) Tocar som aqui
                console.log(`Chave ${i} coletada!`);
            }
        }
    });

    // 4. DETECTA PROXIMIDADE DA PORTA
    const dx = cameraX - doorPosition.x;
    const dz = cameraZ - doorPosition.z;
    const distToDoor = Math.sqrt(dx * dx + dz * dz);
    const msgBox = document.getElementById('interaction-msg');

    // Raio de interação REDUZIDO (Bem próximo)
    if (distToDoor < 0.4) {
        msgBox.classList.remove('hidden');
        if (keysFound < totalKeys) {
            msgBox.innerText = "Você não tem as chaves suficientes";
            msgBox.style.color = "#ff5555";
        } else {
            msgBox.innerText = "Aperte SPACE e saia do labirinto";
            msgBox.style.color = "#55ff55";
        }
    } else {
        msgBox.classList.add('hidden');
    }

    requestAnimationFrame(renderLoop);
}

function checkDoorInteraction() {
    const dx = cameraX - doorPosition.x;
    const dz = cameraZ - doorPosition.z;
    const distToDoor = Math.sqrt(dx * dx + dz * dz);

    if (distToDoor < 0.4 && keysFound === totalKeys) {
        // [WIN CONDITION]
        const winScreen = document.getElementById('win-screen');
        const finalTime = document.getElementById('time-display').innerText;
        document.getElementById('final-time').innerText = `Tempo Final: ${finalTime}`;
        winScreen.classList.add('visible');

        // Para o loop de renderização (opcional, ou apenas deixa rodando ao fundo)
        // Aqui apenas soltamos o mouse para o jogador poder clicar
        document.exitPointerLock();
    }
}

function renderizar() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shaderProgram);

    const eye = [cameraX, cameraY, cameraZ];
    const lookX = cameraX + Math.sin(cameraYaw) * Math.cos(cameraPitch);
    const lookY = cameraY + Math.sin(cameraPitch);
    const lookZ = cameraZ - Math.cos(cameraYaw) * Math.cos(cameraPitch);
    const viewMatrix = lookAt(eye, [lookX, lookY, lookZ], [0, 1, 0]);
    const projectionMatrix = perspective(Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 100.0);

    const uModelViewMatrix = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    const uUseMTLColor = gl.getUniformLocation(shaderProgram, "uUseMTLColor");
    const uIsKey = gl.getUniformLocation(shaderProgram, "uIsKey");
    const uIsRoomObject = gl.getUniformLocation(shaderProgram, "uIsRoomObject");
    const uLightIntensity = gl.getUniformLocation(shaderProgram, "uLightIntensity");
    const uTime = gl.getUniformLocation(shaderProgram, "uTime");

    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniform1f(uTime, keyAnimationTime);

    // [INTENSIDADE DINAMICA] Só ilumina se lanternaLigada for true
    gl.uniform1f(uLightIntensity, lanternaLigada ? 1.0 : 0.0);

    const uCutOffLoc = gl.getUniformLocation(shaderProgram, "uCutOff");
    gl.uniform1f(uCutOffLoc, Math.cos(Math.PI / 12));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, stoneTexture);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "uStoneTexture"), 0);

    // 1. LABIRINTO (Gerado proceduralmente)
    if (generatedMaze && generatedMaze.buffers) {
        gl.disable(gl.CULL_FACE); // Paredes vistas de ambos lados

        gl.uniform1i(uUseMTLColor, 0);
        gl.uniform1i(uIsRoomObject, 0);
        gl.uniformMatrix4fv(uModelViewMatrix, false, viewMatrix);

        // Usa a textura de pedra
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, stoneTexture);

        drawMaze(gl, generatedMaze.buffers, shaderProgram, stoneTexture);
    }

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // 2. CHAVES    
    keyAnimationTime += 0.03;
    if (keyBuffers) {
        gl.uniform1i(uIsKey, 1); gl.uniform1i(uUseMTLColor, 1);
        keyPositions.forEach((pos, i) => {
            // SÓ DESENHA SE NÃO FOI COLETADA
            if (!collectedKeys[i]) {
                let bounce = Math.sin(keyAnimationTime * 3 + i) * 0.05;
                let mm = multiplyMatrices(mat4Translate(pos.x, pos.y + bounce, pos.z),
                    multiplyMatrices(mat4RotateY(keyAnimationTime * 2), mat4Scale(0.2, 0.2, 0.2)));
                gl.uniformMatrix4fv(uModelViewMatrix, false, multiplyMatrices(viewMatrix, mm));
                desenharOBJComCores(gl, keyBuffers, shaderProgram);
            }
        });
        gl.uniform1i(uIsKey, 0);
    }

    // 3. ESTÁTUAS E OBJETOS
    const renderM = (bufs, posArr, s, r = 0, isRoom = 0) => {
        if (!bufs) return;
        gl.uniform1i(uUseMTLColor, 1);
        gl.uniform1i(uIsRoomObject, isRoom);
        posArr.forEach(p => {
            let mm = multiplyMatrices(mat4Translate(p.x, p.y, p.z),
                multiplyMatrices(mat4RotateY(r), mat4Scale(s, s, s)));
            gl.uniformMatrix4fv(uModelViewMatrix, false, multiplyMatrices(viewMatrix, mm));
            desenharOBJComCores(gl, bufs, shaderProgram);
        });
    };

    renderM(gravestoneBuffers, gravestonesPositions, 0.15);
    renderM(bonesBuffers, bonesPositions, 0.12);
    renderM(angelBuffers, angelPositions, 0.4);
    renderM(anubisBuffers, anubisPositions, 0.4);
    renderM(treeBuffers, treePositions, 0.6);
    renderM(skeletonBuffers, skeletonPositions, 0.25, Math.PI);

    /* [QUARTO REMOVIDO TEMPORARIAMENTE]
    // 4. QUARTO
    if (roomBuffers) {
        gl.uniform1i(uUseMTLColor, 1); gl.uniform1i(uIsRoomObject, 1);
        let mm = multiplyMatrices(mat4Translate(ROOM_POSITION.x, ROOM_POSITION.y, ROOM_POSITION.z),
            multiplyMatrices(mat4RotateY(-Math.PI / 2), mat4Scale(0.4, 0.4, 0.4)));
        gl.uniformMatrix4fv(uModelViewMatrix, false, multiplyMatrices(viewMatrix, mm));
        desenharOBJComCores(gl, roomBuffers, shaderProgram);
    }

    renderM(tableBuffers, [{ x: ROOM_POSITION.x, y: -0.05, z: ROOM_POSITION.z + 0.1 }], 0.08, 0, 1);
    renderM(whiteboardBuffers, [{ x: ROOM_POSITION.x + 0.10, y: 0, z: ROOM_POSITION.z }], 0.3, -Math.PI / 2, 1);
    */

    // 5. PORTA (Saída)
    if (doorBuffers) {
        gl.disable(gl.CULL_FACE);

        // Porta de Saída (norte)
        const animatedDoorPosition = { ...doorPosition };

        if (doorIsOpen) {
            animatedDoorPosition.y += 3.0; // sobe a porta
        }

        renderM(doorBuffers, [animatedDoorPosition], 0.6, 0, 1);

        gl.enable(gl.CULL_FACE);
    }

    // 6. LUA
    if (moonBuffers) {
        gl.uniform1i(uUseMTLColor, 1); gl.uniform1i(uIsRoomObject, 0);
        let mm = multiplyMatrices(mat4Translate(moonPosition.x, moonPosition.y, moonPosition.z),
            multiplyMatrices(mat4RotateY(keyAnimationTime * 0.2), mat4Scale(0.5, 0.5, 0.5)));
        gl.uniformMatrix4fv(uModelViewMatrix, false, multiplyMatrices(viewMatrix, mm));
        desenharOBJComCores(gl, moonBuffers, shaderProgram);
    }

    // 7. LANTERNA (Modelo 3D sempre visível na mão, luz que muda)
    if (lanternaBuffers) {
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.uniform1i(uUseMTLColor, 1); gl.uniform1i(uIsRoomObject, 0);

        // Mantém o objeto da lanterna um pouco iluminado para o player ver a mão
        gl.uniform1f(uLightIntensity, lanternaLigada ? 1.0 : 0.2);

        // [SYNC HEAD BOB] A lanterna deve acompanhar o movimento da câmera
        // cameraY varia entre 0.005 e 0.035. O offset base da lanterna é -0.4.
        // Adicionamos (cameraY - 0.02) * 5.0 para amplificar o movimento na mão
        let bobY = (cameraY - PLAYER_SPAWN.y) * 2.0;

        let breathing = Math.sin(keyAnimationTime * 2) * 0.002; // Respiração leve parada

        let mm = multiplyMatrices(mat4Translate(0.35, -0.4 + bobY + breathing, -0.7),
            multiplyMatrices(mat4RotateY(-Math.PI / 8), multiplyMatrices(mat4RotateX(Math.PI / 2), mat4Scale(0.025, 0.025, 0.025))));
        gl.uniformMatrix4fv(uModelViewMatrix, false, mm);
        desenharOBJComCores(gl, lanternaBuffers, shaderProgram);
    }
}
window.onload = iniciaWebGL;