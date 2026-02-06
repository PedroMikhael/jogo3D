let gl;
let shaderProgram;
let mazeBuffers;
let floorBuffers;
let keyBuffers;
let stoneTexture;  // Textura de pedra para as paredes
let gravestoneBuffers;
let bonesBuffers;
// Novos modelos
let angelBuffers;
let anubisBuffers;
let treeBuffers;
let skeletonBuffers;
let moonBuffers;
let candelabraBuffers;
let roomBuffers;  // Quarto vazio (spawn do jogador)
let tableBuffers; // Mesa dentro do quarto
let whiteboardBuffers; // Quadro branco dentro do quarto
let doorBuffers;  // Porta do labirinto


// Animação das chaves
let keyAnimationTime = 0;

// ===== SISTEMA DE CÂMERA =====
// Limites do mapa expandidos para incluir o quarto de spawn
// (Colisões serão implementadas posteriormente)
const MAZE_MIN_X = -1.5;
const MAZE_MAX_X = 1.5;
const MAZE_MIN_Z = -1.5;
const MAZE_MAX_Z = 2.5;  // Expandido para incluir o quarto

// Posição inicial DENTRO DO QUARTO (spawn)
// A porta do quarto leva às coordenadas -0.28, -0.01, 1 do labirinto
const ROOM_POSITION = { x: -0.28, y: 0, z: 1.26 } //Quarto posicionado atrás da entrada
let cameraX = ROOM_POSITION.x;   // Começa dentro do quarto
let cameraY = 0;              // Altura dos olhos
let cameraZ = ROOM_POSITION.z;  // Um pouco para dentro do quarto

// Ângulos de rotação da câmersa
let cameraYaw = 0;    // Rotação horizontal (esquerda/direita)
let cameraPitch = 0;  // Rotação vertical (cima/baixo) - limitada

// Velocidade de movimento
const moveSpeed = 0.01;
const rotSpeed = 0.03;

// ===== VARIÁVEIS DE ANIMAÇÃO DE ENTRADA =====
let isEntrySequenceActive = false;
let doorOpenAngle = 0;              // 0 a 90 graus (em radianos)
let entryProgress = 0;              // progresso da caminhada (0 a 1)
const ENTRY_DURATION = 3.0;         // segundos totais da animação
const DOOR_OPEN_SPEED = 2.0;        // velocidade de abertura da porta
let entryStartTime = 0;

// Variáveis de controle de input
let keysPressed = {};
let lastMouseX = 0;
let lastMouseY = 0;

// Estado das teclas (mantido para compatibilidade com initControls)
const keys = {};

// Inicializa controles de teclado
function initControls() {
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
}

// Limita a posição da câmera dentro do labirinto
function clampCameraPosition() {
    cameraX = Math.max(MAZE_MIN_X, Math.min(MAZE_MAX_X, cameraX));
    cameraZ = Math.max(MAZE_MIN_Z, Math.min(MAZE_MAX_Z, cameraZ));
}

// Função para processar entrada do teclado
function updateCamera() {
    // ===== SEQUÊNCIA DE ENTRADA CINEMATOGRÁFICA =====
    if (isEntrySequenceActive) {
        const currentTime = performance.now() / 1000;
        const elapsedTime = currentTime - entryStartTime;

        // Progresso linear de 0 a 1
        entryProgress = Math.min(elapsedTime / ENTRY_DURATION, 1.0);

        // 1. ANIMAÇÃO DA PORTA (REMOVIDA)
        // A porta permanece fechada ou estática

        // 2. MOVER A CÂMERA (começa um pouco depois da porta abrir)
        const moveStartDelay = 1;

        if (elapsedTime > moveStartDelay) {
            const moveDuration = ENTRY_DURATION - moveStartDelay;
            const moveTime = Math.max(0, elapsedTime - moveStartDelay);
            const moveProgress = Math.min(moveTime / moveDuration, 1.0);

            // Easing suave (ease-in-out sinusoidal)
            const moveEase = -(Math.cos(Math.PI * moveProgress) - 1) / 2;

            // Posição no quarto (start) -> Posição no labirinto (end)
            // Quarto: { x: -0.28, y: 0, z: 1.5 }
            // Labirinto entrada: { x: 1.18, y: 0, z: -0.35 }

            const startZ = 1.8;
            const endZ = 1.18;

            const startX = -0.28;
            const endX = -0.35;

            cameraZ = startZ - (startZ - endZ) * moveEase;
            cameraX = startX - (startX - endX) * moveEase;

            // Alinha a visão para frente
            // Se estiver olhando para outro lado, suavemente volta para 0
            cameraYaw = cameraYaw * (1 - moveEase);
        }

        // FIM DA SEQUÊNCIA
        if (entryProgress >= 1.0) {
            isEntrySequenceActive = false;
            console.log("Sequência de entrada finalizada. Controles liberados.");
        }

        return; // IGNORA O RESTO DAS ENTRADAS DURANTE A ANIMAÇÃO
    }

    // Se estiver em modo pointer lock ou mouse pressionado
    // Calcula direção para frente baseada no yaw
    const forwardX = Math.sin(cameraYaw);
    const forwardZ = -Math.cos(cameraYaw);

    // Direção para os lados (perpendicular)
    const rightX = Math.cos(cameraYaw);
    const rightZ = Math.sin(cameraYaw);

    // Movimento WASD (apenas no plano XZ)
    if (keys['w']) {
        cameraX += forwardX * moveSpeed;
        cameraZ += forwardZ * moveSpeed;
    }
    if (keys['s']) {
        cameraX -= forwardX * moveSpeed;
        cameraZ -= forwardZ * moveSpeed;
    }
    if (keys['a']) {
        cameraX -= rightX * moveSpeed;
        cameraZ -= rightZ * moveSpeed;
    }
    if (keys['d']) {
        cameraX += rightX * moveSpeed;
        cameraZ += rightZ * moveSpeed;
    }

    // Mantém a câmera dentro dos limites do labirinto
    clampCameraPosition();

    // Rotação com setas
    if (keys['arrowleft']) {
        cameraYaw -= rotSpeed;
    }
    if (keys['arrowright']) {
        cameraYaw += rotSpeed;
    }
    if (keys['arrowup']) {
        cameraPitch = Math.min(cameraPitch + rotSpeed, Math.PI / 3);
    }
    if (keys['arrowdown']) {
        cameraPitch = Math.max(cameraPitch - rotSpeed, -Math.PI / 3);
    }
}

// constantes de posição dos objetos
const keyPositions = [
    { x: -0.11, y: 0.03, z: -0.14 },// Centro visual do labirinto (y=altura)
    { x: -0.75, y: 0.03, z: -0.95 }, // Canto superior esquerdo
    { x: 0.90, y: 0.03, z: 0.95 }  // Canto inferior direito
];

const gravestonesPositions = [
    { x: -0.56, y: -0.05, z: -0.08 },
    { x: -0.31, y: -0.05, z: 0.44 },
    { x: -0.41, y: -0.05, z: 0.26 },
    { x: 0.41, y: -0.05, z: -0.86 },
    { x: 0.23, y: -0.05, z: -0.35 }
];

// Posições independentes para os ossos
const bonesPositions = [
    { x: -0.22, y: -0.05, z: 0.48 }, // Perto da primeira lápide
    { x: -0.41, y: -0.05, z: 1.06 },
    { x: 0.69, y: -0.05, z: -0.35 },
    { x: 0.23, y: -0.05, z: -0.89 },
];

// Posições para outros modelos
const angelPositions = [
    { x: 0.89, y: 0.025, z: -1 } // Centro
];

const anubisPositions = [
    { x: 0.61, y: 0.04, z: -0.17 }
];

const treePositions = [
    { x: 0.80, y: 0, z: 0.78 },

];

const skeletonPositions = [
    { x: 0.14, y: 0, z: 0.30 }
];

const moonPosition = { x: 0.0, y: 6.0, z: -2.0 }; // Lua no alto

// Mesa, candelabro e whiteboard DENTRO DO QUARTO (relativos a ROOM_POSITION)
const tablePosition = { x: 0, y: -0.05, z: 0.10 };  // Mesa no centro do quarto (offset relativo)
const candelabraInRoomPosition = { x: 0, y: 0, z: 0.10 };  // Candelabro em cima da mesa
const whiteboardPosition = { x: 0.15, y: 0, z: 0 };  // Whiteboard na parede lateral

// Candelabros no labirinto (posições antigas, se quiser manter)
const candelabraPositions = [
    // { x: -0.2, y: -0.1, z: -0.2 }  // Comentado - agora fica só no quarto
];

// Porta do labirinto
const doorPosition = { x: 0.55, y: 0, z: -1.16 }; // Y=0 para ficar no chão
const doorScale = 0.13;  // Escala aumentada para ser visível

// Função para iniciar o jogo (chamada pelo botão HTML)
function startGame() {
    const instructions = document.getElementById('instructions');
    instructions.classList.add('hidden');

    // Inicia a sequência de entrada cinematográfica
    isEntrySequenceActive = true;
    entryStartTime = performance.now() / 1000;

    // Tenta capturar o ponteiro do mouse (mas o controle só será liberado após a animação)
    const canvas = document.querySelector("#meuCanvas");
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.requestPointerLock();
}

// Evento para capturar mouse ao clicar no canvas (caso o usuário saia)
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector("#meuCanvas");
    canvas.addEventListener('click', () => {
        if (document.getElementById('instructions').classList.contains('hidden')) {
            canvas.requestPointerLock();
        }
    });
});

async function iniciaWebGL() {
    const canvas = document.querySelector("#meuCanvas");

    // Usa função do professor para obter contexto WebGL
    gl = getGL(canvas);
    if (!gl) {
        return;
    }

    // Ajusta o tamanho do desenho ao tamanho da janela
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Configura o WebGL
    gl.clearColor(0.1, 0.1, 0.15, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE); // Habilita a remoção de faces traseiras
    gl.cullFace(gl.BACK);    // Define para remover as faces de trás

    // Compila os shaders usando função do professor
    shaderProgram = createProgramFromSources(gl, vsSource, fsSource);
    if (!shaderProgram) {
        console.error("Erro ao criar shader program");
        return;
    }

    // Carrega os modelos
    console.log("Carregando modelos...");
    try {
        // Carrega o labirinto COM materiais MTL
        const mazeModel = await carregarOBJComMTL('modelos/Maze.0/model.obj');
        console.log("Labirinto carregado:", mazeModel.numVertices, "vertices, materiais:", Object.keys(mazeModel.materials).length);
        mazeBuffers = criarBuffersOBJComCores(gl, mazeModel);

        // Carrega a chave COM materiais MTL (cores do MTL)
        const keyModel = await carregarOBJComMTL('modelos/Key/Key_01(1).obj');
        // Normaliza o modelo
        const keyModelNorm = normalizarModelo(keyModel);
        keyModelNorm.cores = keyModel.cores;  // Mantém as cores do MTL
        console.log("Chave carregada:", keyModelNorm.numVertices, "vertices, materiais:", Object.keys(keyModel.materials).length);
        keyBuffers = criarBuffersOBJComCores(gl, keyModelNorm);

        // Carrega o modelo de grama COM materiais
        const grassModel = await carregarOBJComMTL('modelos/Grass Patch/model.obj');
        console.log("Grama carregada:", grassModel.numVertices, "vertices");
        floorBuffers = criarBuffersOBJComCores(gl, grassModel);

        const gravestoneModel = await carregarOBJComMTL('modelos/gravestone/model.obj');
        const gravestoneModelNorm = normalizarModelo(gravestoneModel);
        gravestoneModelNorm.cores = gravestoneModel.cores;
        gravestoneBuffers = criarBuffersOBJComCores(gl, gravestoneModelNorm);
        console.log("Gravestone carregada!");

        // Carrega Pile of Bones
        const bonesModel = await carregarOBJComMTL('modelos/Pile of Bones/PileBones.obj');
        const bonesModelNorm = normalizarModelo(bonesModel);
        bonesModelNorm.cores = bonesModel.cores;
        bonesBuffers = criarBuffersOBJComCores(gl, bonesModelNorm);
        console.log("Ossos carregados!");

        // --- NOVOS MODELOS ---
        const angelModel = await carregarOBJComMTL('modelos/AngelStatue/AngelStatue.obj');
        const angelNorm = normalizarModelo(angelModel);
        angelNorm.cores = angelModel.cores;
        angelBuffers = criarBuffersOBJComCores(gl, angelNorm);

        const anubisModel = await carregarOBJComMTL('modelos/Anubis Statue/anubis.obj');
        const anubisNorm = normalizarModelo(anubisModel);
        anubisNorm.cores = anubisModel.cores;
        anubisBuffers = criarBuffersOBJComCores(gl, anubisNorm);

        const treeModel = await carregarOBJComMTL('modelos/deadTree/model.obj');
        const treeNorm = normalizarModelo(treeModel);
        treeNorm.cores = treeModel.cores;
        treeBuffers = criarBuffersOBJComCores(gl, treeNorm);

        const skeletonModel = await carregarOBJComMTL('modelos/Skeleton/model.obj');
        const skeletonNorm = normalizarModelo(skeletonModel);
        skeletonNorm.cores = skeletonModel.cores;
        skeletonBuffers = criarBuffersOBJComCores(gl, skeletonNorm);

        const moonModel = await carregarOBJComMTL('modelos/Moon/model.obj');
        const moonNorm = normalizarModelo(moonModel);
        moonNorm.cores = moonModel.cores;
        moonBuffers = criarBuffersOBJComCores(gl, moonNorm);

        const candelabraModel = await carregarOBJComMTL('modelos/Simple Candelabra/model.obj');
        const candelabraNorm = normalizarModelo(candelabraModel);
        candelabraNorm.cores = candelabraModel.cores;
        candelabraBuffers = criarBuffersOBJComCores(gl, candelabraNorm);

        // Carrega o quarto vazio (spawn do jogador)
        const roomModel = await carregarOBJComMTL('modelos/Room empty/model.obj');
        const roomNorm = normalizarModelo(roomModel);
        roomNorm.cores = roomModel.cores;
        roomBuffers = criarBuffersOBJComCores(gl, roomNorm);
        console.log("Quarto carregado!");

        // Carrega a mesa para o quarto
        const tableModel = await carregarOBJComMTL('modelos/Table (1)/model.obj');
        const tableNorm = normalizarModelo(tableModel);
        tableNorm.cores = tableModel.cores;
        tableBuffers = criarBuffersOBJComCores(gl, tableNorm);
        console.log("Mesa carregada!");

        // Carrega o whiteboard para o quarto
        const whiteboardModel = await carregarOBJComMTL('modelos/Whiteboard/Whiteboard.obj');
        const whiteboardNorm = normalizarModelo(whiteboardModel);
        whiteboardNorm.cores = whiteboardModel.cores;
        whiteboardBuffers = criarBuffersOBJComCores(gl, whiteboardNorm);
        console.log("Whiteboard carregado!");

        // Carrega a porta
        const doorModel = await carregarOBJComMTL('modelos/door/model.obj');
        const doorNorm = normalizarModelo(doorModel);
        doorNorm.cores = doorModel.cores;
        doorBuffers = criarBuffersOBJComCores(gl, doorNorm);
        console.log("Porta carregada!");

        console.log("Todos os modelos carregados!");

        // Carrega a textura de pedra
        stoneTexture = await carregarTextura(gl, 'modelos/img_dark_stone.jpg');
        console.log("Textura de pedra carregada!");

        // Inicializa controles de teclado
        initControls();

        // Inicia o loop de renderização
        renderLoop();
    } catch (error) {
        console.error("Erro ao carregar modelos:", error);
    }
}


/**
 * Loop de animação - chamado a cada frame
 */
function renderLoop() {
    // Atualiza a posição da câmera baseado nas teclas
    updateCamera();

    // Atualiza o display de coordenadas
    const coordsDiv = document.getElementById('coords');
    if (coordsDiv) {
        coordsDiv.textContent = `X: ${cameraX.toFixed(2)} | Y: ${cameraY.toFixed(2)} | Z: ${cameraZ.toFixed(2)}`;
    }

    // Renderiza a cena
    renderizar();

    // Solicita próximo frame
    requestAnimationFrame(renderLoop);
}

function renderizar() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaderProgram);

    // Câmera em primeira pessoa
    // Posição do olho
    const eye = [cameraX, cameraY, cameraZ];

    // Ponto para onde a câmera está olhando (baseado em yaw e pitch)
    const lookX = cameraX + Math.sin(cameraYaw) * Math.cos(cameraPitch);
    const lookY = cameraY + Math.sin(cameraPitch);
    const lookZ = cameraZ - Math.cos(cameraYaw) * Math.cos(cameraPitch);
    const center = [lookX, lookY, lookZ];

    // Vetor "para cima" sempre é Y positivo
    const up = [0, 1, 0];

    const viewMatrix = lookAt(eye, center, up);

    const aspect = gl.canvas.width / gl.canvas.height;
    const fov = Math.PI / 4;
    const projectionMatrix = perspective(fov, aspect, 0.1, 100.0);

    // Localização dos uniforms
    const uModelViewMatrix = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    const uIsKey = gl.getUniformLocation(shaderProgram, "uIsKey");
    const uIsGrass = gl.getUniformLocation(shaderProgram, "uIsGrass");
    const uUseMTLColor = gl.getUniformLocation(shaderProgram, "uUseMTLColor");
    const uIsRoomObject = gl.getUniformLocation(shaderProgram, "uIsRoomObject");
    const uStoneTexture = gl.getUniformLocation(shaderProgram, "uStoneTexture");
    const uTime = gl.getUniformLocation(shaderProgram, "uTime");

    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

    // Passa o tempo para animação da grama
    gl.uniform1f(uTime, keyAnimationTime);  // Reutiliza o tempo da animação das chaves

    // Ativa a textura de pedra
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, stoneTexture);
    gl.uniform1i(uStoneTexture, 0);

    // Desenha o chão (modelo Grass Patch) - TRANSFORMAÇÕES MANUAIS
    const grassScale = 1;
    const grassY = -0.06;

    // Matrizes manuais para a grama
    const grassScaleMatrix = mat4Scale(grassScale, 0.1, grassScale);
    const grassTranslateMatrix = mat4Translate(0, grassY, 0);
    let grassModelMatrix = multiplyMatrices(grassTranslateMatrix, grassScaleMatrix);
    const grassModelViewMatrix = multiplyMatrices(viewMatrix, grassModelMatrix);

    gl.uniformMatrix4fv(uModelViewMatrix, false, grassModelViewMatrix);
    gl.uniform1i(uIsGrass, 1);
    gl.uniform1i(uIsKey, 0);
    gl.uniform1i(uUseMTLColor, 0);
    desenharOBJComCores(gl, floorBuffers, shaderProgram);

    // Desenha o labirinto com textura de pedra (sem cores MTL)
    gl.uniformMatrix4fv(uModelViewMatrix, false, viewMatrix);
    gl.uniform1i(uIsGrass, 0);
    gl.uniform1i(uIsKey, 0);
    gl.uniform1i(uUseMTLColor, 0);  // Usar TEXTURA de pedra para labirinto
    desenharOBJComCores(gl, mazeBuffers, shaderProgram);

    // Desenha as 3 chaves nas posições estratégicas
    gl.uniform1i(uIsGrass, 0);
    gl.uniform1i(uIsKey, 1);
    gl.uniform1i(uUseMTLColor, 1);  // Usar cores do MTL para chaves

    // Atualiza animação das chaves
    keyAnimationTime += 0.03;

    // Escala fixa para as chaves
    const keyScale = 0.08;

    for (let i = 0; i < keyPositions.length; i++) {
        const pos = keyPositions[i];

        // Calcula o "pulo" - movimento vertical usando seno
        const bounceHeight = 0.02;
        const bounceSpeed = 3.0;
        const bounce = Math.sin(keyAnimationTime * bounceSpeed + i * 2) * bounceHeight;

        // Rotação contínua no eixo Y
        const rotationAngle = keyAnimationTime * 2 + i * (Math.PI * 2 / 3);

        // ===== TRANSFORMAÇÕES MANUAIS (sem gl-matrix) =====
        // Ordem de aplicação: T * R * S (primeiro escala, depois rotação, depois translação)

        // 1. Matriz de Escala (MANUAL)
        const scaleMatrix = mat4Scale(keyScale, keyScale, keyScale);

        // 2. Matriz de Rotação em Y (MANUAL)
        const rotateMatrix = mat4RotateY(rotationAngle);

        // 3. Matriz de Translação (MANUAL) - com bounce no Y
        const translateMatrix = mat4Translate(pos.x, pos.y + bounce, pos.z);

        // Combina as transformações manualmente: T * R * S
        let modelMatrix = multiplyMatrices(rotateMatrix, scaleMatrix);      // R * S
        modelMatrix = multiplyMatrices(translateMatrix, modelMatrix);        // T * (R * S)

        // Multiplica view * model (viewMatrix já é manual via lookAt)
        const modelViewMatrix = multiplyMatrices(viewMatrix, modelMatrix);

        gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
        desenharOBJComCores(gl, keyBuffers, shaderProgram);
    }

    gl.uniform1i(uIsGrass, 0);
    gl.uniform1i(uIsKey, 0);
    gl.uniform1i(uUseMTLColor, 1);

    const gravestoneScale = 0.05; // Ajuste conforme o tamanho do modelo

    if (gravestoneBuffers) {
        for (const pos of gravestonesPositions) {
            // Transformações MANUAIS para lápides
            const scaleM = mat4Scale(gravestoneScale, gravestoneScale, gravestoneScale);
            const translateM = mat4Translate(pos.x, pos.y, pos.z);
            let modelMatrix = multiplyMatrices(translateM, scaleM);
            const modelViewMatrix = multiplyMatrices(viewMatrix, modelMatrix);

            gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
            desenharOBJComCores(gl, gravestoneBuffers, shaderProgram);
        }
    }

    // --- Renderização dos Bones - TRANSFORMAÇÕES MANUAIS ---
    if (bonesBuffers) {
        for (const pos of bonesPositions) {
            const scaleM = mat4Scale(0.05, 0.05, 0.05);
            const translateM = mat4Translate(pos.x, pos.y, pos.z);
            let modelMatrix = multiplyMatrices(translateM, scaleM);
            const modelViewMatrix = multiplyMatrices(viewMatrix, modelMatrix);
            gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
            desenharOBJComCores(gl, bonesBuffers, shaderProgram);
        }
    }

    // --- Outros modelos ---
    const defaultScale = 0.15;

    // Anjo - TRANSFORMAÇÕES MANUAIS
    if (angelBuffers) {
        for (const pos of angelPositions) {
            const scaleM = mat4Scale(defaultScale, defaultScale, defaultScale);
            const translateM = mat4Translate(pos.x, pos.y, pos.z);
            let mm = multiplyMatrices(translateM, scaleM);
            const mv = multiplyMatrices(viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, angelBuffers, shaderProgram);
        }
    }

    // Anubis - TRANSFORMAÇÕES MANUAIS
    if (anubisBuffers) {
        for (const pos of anubisPositions) {
            const scaleM = mat4Scale(defaultScale, defaultScale, defaultScale);
            const translateM = mat4Translate(pos.x, pos.y, pos.z);
            let mm = multiplyMatrices(translateM, scaleM);
            const mv = multiplyMatrices(viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, anubisBuffers, shaderProgram);
        }
    }

    // Arvore - TRANSFORMAÇÕES MANUAIS
    if (treeBuffers) {
        for (const pos of treePositions) {
            const scaleM = mat4Scale(0.3, 0.3, 0.3);
            const translateM = mat4Translate(pos.x, pos.y, pos.z);
            let mm = multiplyMatrices(translateM, scaleM);
            const mv = multiplyMatrices(viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, treeBuffers, shaderProgram);
        }
    }

    // Esqueleto - TRANSFORMAÇÕES MANUAIS
    if (skeletonBuffers) {
        for (const pos of skeletonPositions) {
            const scaleM = mat4Scale(0.12, 0.12, 0.12);
            const rotateM = mat4RotateY(Math.PI);  // Rotação de 180°
            const translateM = mat4Translate(pos.x, pos.y, pos.z);
            // Ordem: T * R * S
            let mm = multiplyMatrices(rotateM, scaleM);
            mm = multiplyMatrices(translateM, mm);
            const mv = multiplyMatrices(viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, skeletonBuffers, shaderProgram);
        }
    }

    // Lua - TRANSFORMAÇÕES MANUAIS (com rotação animada)
    if (moonBuffers && moonPosition) {
        const scaleM = mat4Scale(0.5, 0.5, 0.5);
        const rotateM = mat4RotateY(keyAnimationTime * 0.2);  // Rotação animada
        const translateM = mat4Translate(moonPosition.x, moonPosition.y, moonPosition.z);
        // Ordem: T * R * S
        let mm = multiplyMatrices(rotateM, scaleM);
        mm = multiplyMatrices(translateM, mm);
        const mv = multiplyMatrices(viewMatrix, mm);
        gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
        desenharOBJComCores(gl, moonBuffers, shaderProgram);
    }

    // Candelabro - TRANSFORMAÇÕES MANUAIS
    if (candelabraBuffers) {
        for (const pos of candelabraPositions) {
            const scaleM = mat4Scale(0.1, 0.1, 0.1);
            const translateM = mat4Translate(pos.x, pos.y, pos.z);
            let mm = multiplyMatrices(translateM, scaleM);
            const mv = multiplyMatrices(viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, candelabraBuffers, shaderProgram);
        }
    }

    // Quarto vazio (spawn do jogador) - TRANSFORMAÇÕES MANUAIS
    if (roomBuffers) {
        const roomScale = 0.4;   // Escala aumentada para caber o jogador
        const scaleM = mat4Scale(roomScale, roomScale, roomScale);
        // Rotação para alinhar a porta com a entrada do labirinto
        const rotateM = mat4RotateY(Math.PI / -2);  // Girado -90° (porta para o lado)
        const translateM = mat4Translate(ROOM_POSITION.x, ROOM_POSITION.y, ROOM_POSITION.z);
        // Ordem: T * R * S
        let mm = multiplyMatrices(rotateM, scaleM);
        mm = multiplyMatrices(translateM, mm);
        const mv = multiplyMatrices(viewMatrix, mm);
        gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
        gl.uniform1i(uUseMTLColor, 1);  // Usar cores do MTL
        desenharOBJComCores(gl, roomBuffers, shaderProgram);
    }

    // Mesa dentro do quarto - TRANSFORMAÇÕES MANUAIS
    if (tableBuffers) {
        const tableScale = 0.08;  // Ajuste o tamanho da mesa
        const scaleM = mat4Scale(tableScale, tableScale, tableScale);
        // Posição absoluta = ROOM_POSITION + offset da mesa
        const tableX = ROOM_POSITION.x + tablePosition.x;
        const tableY = ROOM_POSITION.y + tablePosition.y;
        const tableZ = ROOM_POSITION.z + tablePosition.z;
        const translateM = mat4Translate(tableX, tableY, tableZ);
        let mm = multiplyMatrices(translateM, scaleM);
        const mv = multiplyMatrices(viewMatrix, mm);
        gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
        gl.uniform1i(uUseMTLColor, 1);
        desenharOBJComCores(gl, tableBuffers, shaderProgram);
    }

    // Candelabro em cima da mesa (dentro do quarto) - TRANSFORMAÇÕES MANUAIS
    if (candelabraBuffers) {
        const candScale = 0.05;  // Tamanho do candelabro
        const scaleM = mat4Scale(candScale, candScale, candScale);
        // Posição absoluta = ROOM_POSITION + offset do candelabro (em cima da mesa)
        const candX = ROOM_POSITION.x + candelabraInRoomPosition.x;
        const candY = ROOM_POSITION.y + candelabraInRoomPosition.y;
        const candZ = ROOM_POSITION.z + candelabraInRoomPosition.z;
        const translateM = mat4Translate(candX, candY, candZ);
        let mm = multiplyMatrices(translateM, scaleM);
        const mv = multiplyMatrices(viewMatrix, mm);
        gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
        gl.uniform1i(uUseMTLColor, 1);
        desenharOBJComCores(gl, candelabraBuffers, shaderProgram);
    }

    // Whiteboard dentro do quarto - TRANSFORMAÇÕES MANUAIS
    if (whiteboardBuffers) {

        const wbScale = 0.3;  // Tamanho do whiteboard
        const scaleM = mat4Scale(wbScale, wbScale, wbScale);
        const rotateM = mat4RotateY(-Math.PI / 2);  // Girar para ficar na parede
        // Posição absoluta = ROOM_POSITION + offset
        const wbX = ROOM_POSITION.x + whiteboardPosition.x;
        const wbY = ROOM_POSITION.y + whiteboardPosition.y;
        const wbZ = ROOM_POSITION.z + whiteboardPosition.z;
        const translateM = mat4Translate(wbX, wbY, wbZ);
        // Ordem: T * R * S
        let mm = multiplyMatrices(rotateM, scaleM);
        mm = multiplyMatrices(translateM, mm);
        const mv = multiplyMatrices(viewMatrix, mm);
        gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
        gl.uniform1i(uIsRoomObject, 1);  // Objeto do quarto - não usar textura de pedra
        gl.uniform1i(uUseMTLColor, 1);
        desenharOBJComCores(gl, whiteboardBuffers, shaderProgram);
        gl.uniform1i(uIsRoomObject, 0);  // Reseta para outros objetos

        // Reabilita backface culling para outros objetos
        gl.enable(gl.CULL_FACE);
    }

    // Porta do labirinto - TRANSFORMAÇÕES MANUAIS
    if (doorBuffers) {
        gl.disable(gl.CULL_FACE); // Desabilita culling para garantir que apareça de todos os lados

        // Escala não uniforme: (Largura, Altura, Profundidade)
        // doorScale * 3 no eixo X para alargar a porta
        const scaleM = mat4Scale(doorScale * 3, doorScale, doorScale);

        const translateM = mat4Translate(doorPosition.x, doorPosition.y, doorPosition.z);

        // Ordem: T * S (sem rotação)
        let mm = multiplyMatrices(translateM, scaleM);

        const mv = multiplyMatrices(viewMatrix, mm);
        gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
        gl.uniform1i(uIsRoomObject, 1);  // Não usar textura de pedra
        gl.uniform1i(uUseMTLColor, 1);
        desenharOBJComCores(gl, doorBuffers, shaderProgram);
        gl.uniform1i(uIsRoomObject, 0);  // Reseta

        gl.enable(gl.CULL_FACE);
    }
}

window.onload = iniciaWebGL;