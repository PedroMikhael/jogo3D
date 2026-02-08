/**
 * ARQUIVO: main.js (VERSÃO FINAL MERGE - LANTERNA COM TECLA F)
 */

let gl, shaderProgram, stoneTexture;
let mazeBuffers, floorBuffers, keyBuffers, gravestoneBuffers, bonesBuffers;
let angelBuffers, anubisBuffers, treeBuffers, skeletonBuffers, moonBuffers;
let candelabraBuffers, roomBuffers, tableBuffers, whiteboardBuffers, doorBuffers, lanternaBuffers;

let keyAnimationTime = 0;
let lanternaLigada = true; // [ESTADO DA LANTERNA] Começa ligada
let walkCycle = 0; // [HEAD BOBBING] Ciclo de caminhada

// ===== SISTEMA DE CÂMERA E LIMITES =====
const MAZE_MIN_X = -1.5, MAZE_MAX_X = 1.5, MAZE_MIN_Z = -1.5, MAZE_MAX_Z = 2.5;

// const ROOM_POSITION = { x: -0.28, y: 0, z: 1.26 };
const ROOM_POSITION = { x: 0, y: 0, z: 0 }; // Placeholder
let cameraX = -0.40, cameraY = 0.02, cameraZ = 0.98; // Posição inicial ajustada direto no labirinto
let cameraYaw = 0, cameraPitch = 0;
const moveSpeed = 0.01, rotSpeed = 0.03;
const keys = {};

// ===== SISTEMA DE JOGO (HUD & LOGICA) =====
let startTime = 0;
let keysFound = 0;
const totalKeys = 3;
let collectedKeys = [false, false, false];

let isEntrySequenceActive = false;
let entryStartTime = 0;
const ENTRY_DURATION = 3.0;

// ===== POSIÇÕES DOS OBJETOS =====
const keyPositions = [{ x: -0.11, y: 0.03, z: -0.14 }, { x: -0.75, y: 0.03, z: -0.95 }, { x: 0.90, y: 0.03, z: 0.95 }];
const gravestonesPositions = [{ x: -0.56, y: -0.05, z: -0.08 }, { x: -0.31, y: -0.05, z: 0.44 }, { x: 0.41, y: -0.05, z: -0.86 }];
const bonesPositions = [{ x: -0.22, y: -0.05, z: 0.48 }, { x: 0.69, y: -0.05, z: -0.35 }];
const angelPositions = [{ x: 0.89, y: 0.025, z: -1 }];
const anubisPositions = [{ x: 0.61, y: 0.04, z: -0.17 }];
const treePositions = [{ x: 0.80, y: 0, z: 0.78 }];
const skeletonPositions = [{ x: 0.14, y: 0, z: 0.30 }];
const moonPosition = { x: 0.0, y: 6.0, z: -2.0 };
const doorPosition = { x: 0.55, y: 0, z: -1.16 };

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
    });
    document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });


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

function updateCamera() {
    if (isEntrySequenceActive) {
        const elapsedTime = (performance.now() / 1000) - entryStartTime;
        let progress = Math.min(elapsedTime / ENTRY_DURATION, 1.0);

        // Posição inicial (Origem, alto)
        let startX = 0, startY = 4.0, startZ = 0;
        let startPitch = -Math.PI / 2; // Olhando para baixo

        // Posição final (Inicio do jogo)
        let endX = -0.40, endY = 0.02, endZ = 0.98;
        let endPitch = 0;

        if (elapsedTime < 1.0) {
            // [Fase 1] Espera um pouco lá em cima
            cameraX = startX;
            cameraY = startY;
            cameraZ = startZ;
            cameraPitch = startPitch;
            cameraYaw = 0;
        } else {
            // [Fase 2] Desce para o labirinto
            const moveEase = -(Math.cos(Math.PI * Math.min((elapsedTime - 1.0) / 2.0, 1.0)) - 1) / 2;

            cameraX = startX + (endX - startX) * moveEase;
            cameraY = startY + (endY - startY) * moveEase;
            cameraZ = startZ + (endZ - startZ) * moveEase;
            cameraPitch = startPitch + (endPitch - startPitch) * moveEase;
            cameraYaw = 0;
        }

        if (progress >= 1.0) isEntrySequenceActive = false;
        return;
    }

    let oldX = cameraX, oldZ = cameraZ;
    const forwardX = Math.sin(cameraYaw), forwardZ = -Math.cos(cameraYaw);
    const rightX = Math.cos(cameraYaw), rightZ = Math.sin(cameraYaw);

    if (keys['w']) { cameraX += forwardX * moveSpeed; cameraZ += forwardZ * moveSpeed; }
    if (keys['s']) { cameraX -= forwardX * moveSpeed; cameraZ -= forwardZ * moveSpeed; }
    if (keys['a']) { cameraX -= rightX * moveSpeed; cameraZ -= rightZ * moveSpeed; }
    if (keys['d']) { cameraX += rightX * moveSpeed; cameraZ += rightZ * moveSpeed; }

    const margin = 0.15;
    if (cameraX < MAZE_MIN_X + margin || cameraX > MAZE_MAX_X - margin) cameraX = oldX;
    if (cameraZ < MAZE_MIN_Z + margin || cameraZ > MAZE_MAX_Z - margin) cameraZ = oldZ;

    const checkCollision = (objX, objZ, radius) => {
        let dist = Math.sqrt(Math.pow(cameraX - objX, 2) + Math.pow(cameraZ - objZ, 2));
        return dist < radius;
    };

    if (checkCollision(0.61, -0.17, 0.25)) { cameraX = oldX; cameraZ = oldZ; }
    if (checkCollision(-0.28, 1.36, 0.22)) { cameraX = oldX; cameraZ = oldZ; }
    if (cameraX > -0.13 - margin && cameraZ > 1.15 && cameraZ < 1.40) { cameraX = oldX; }

    // [HEAD BOBBING] Efeito de caminhada
    const isMoving = keys['w'] || keys['s'] || keys['a'] || keys['d'];
    if (isMoving) {
        walkCycle += 0.15; // Velocidade do passo
        // Senoide para subir e descer a câmera (simulando passos)
        cameraY = 0.02 + Math.sin(walkCycle) * 0.015;
    } else {
        // Se parar, volta suavemente para a altura original
        cameraY = cameraY * 0.9 + 0.02 * 0.1;
        walkCycle = 0;
    }

    if (keys['arrowleft']) cameraYaw -= rotSpeed;
    if (keys['arrowright']) cameraYaw += rotSpeed;
    if (keys['arrowup']) cameraPitch = Math.min(cameraPitch + rotSpeed, Math.PI / 3);
    if (keys['arrowdown']) cameraPitch = Math.max(cameraPitch - rotSpeed, -Math.PI / 3);
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
        async function prepararModelo(path, normalizar = true) {
            const rawData = await carregarOBJComMTL(path);
            if (!rawData.vertices || rawData.vertices.length === 0) return null;
            let finalData = normalizar ? normalizarModelo(rawData) : rawData;
            if (!finalData.cores && rawData.cores) finalData.cores = rawData.cores;
            return criarBuffersOBJComCores(gl, finalData);
        }

        mazeBuffers = await prepararModelo('modelos/Maze.0/model.obj', false);
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

    // 1. LABIRINTO
    if (mazeBuffers) {
        gl.uniform1i(uUseMTLColor, 0);
        gl.uniform1i(uIsRoomObject, 0);
        gl.uniformMatrix4fv(uModelViewMatrix, false, viewMatrix);
        desenharOBJComCores(gl, mazeBuffers, shaderProgram);
    }

    // 2. CHAVES
    keyAnimationTime += 0.03;
    if (keyBuffers) {
        gl.uniform1i(uIsKey, 1); gl.uniform1i(uUseMTLColor, 1);
        keyPositions.forEach((pos, i) => {
            // SÓ DESENHA SE NÃO FOI COLETADA
            if (!collectedKeys[i]) {
                let bounce = Math.sin(keyAnimationTime * 3 + i) * 0.02;
                let mm = multiplyMatrices(mat4Translate(pos.x, pos.y + bounce, pos.z),
                    multiplyMatrices(mat4RotateY(keyAnimationTime * 2), mat4Scale(0.08, 0.08, 0.08)));
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

    renderM(gravestoneBuffers, gravestonesPositions, 0.05);
    renderM(bonesBuffers, bonesPositions, 0.05);
    renderM(angelBuffers, angelPositions, 0.15);
    renderM(anubisBuffers, anubisPositions, 0.15);
    renderM(treeBuffers, treePositions, 0.3);
    renderM(skeletonBuffers, skeletonPositions, 0.12, Math.PI);

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

    // 5. PORTA (Saída + Entrada)
    if (doorBuffers) {
        gl.disable(gl.CULL_FACE);
        // Porta de Saída
        renderM(doorBuffers, [doorPosition], 0.3, 0, 1);

        // Porta de Entrada (Fechando o labirinto)
        // Posição ajustada para fechar o corredor inicial
        renderM(doorBuffers, [{ x: -0.35, y: 0, z: 1.08 }], 0.3, 0, 1);

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
        let bobY = (cameraY - 0.02) * 2.0;

        let breathing = Math.sin(keyAnimationTime * 2) * 0.002; // Respiração leve parada

        let mm = multiplyMatrices(mat4Translate(0.35, -0.4 + bobY + breathing, -0.7),
            multiplyMatrices(mat4RotateY(-Math.PI / 8), multiplyMatrices(mat4RotateX(Math.PI / 2), mat4Scale(0.025, 0.025, 0.025))));
        gl.uniformMatrix4fv(uModelViewMatrix, false, mm);
        desenharOBJComCores(gl, lanternaBuffers, shaderProgram);
    }
}
window.onload = iniciaWebGL;