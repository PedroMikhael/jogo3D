let lanternaBuffers; // Adicione esta linha
let gl;
let shaderProgram;
let mazeBuffers;
let floorBuffers;
let keyBuffers;
let stoneTexture;  // Textura de pedra para as paredes
let grassTexture; // Adicione se tiver uma imagem de grama, senão use stoneTexture
let gravestoneBuffers;
let bonesBuffers;
// Novos modelos
let angelBuffers;
let anubisBuffers;
let treeBuffers;
let skeletonBuffers;
let moonBuffers;
let candelabraBuffers;


// Animação das chaves
let keyAnimationTime = 0;

// ===== SISTEMA DE CÂMERA =====
// Limites do labirinto (baseado no modelo OBJ)
const MAZE_MIN_X = -1.1;
const MAZE_MAX_X = 1.0;
const MAZE_MIN_Z = -1.1;
const MAZE_MAX_Z = 1.0;

// Posição inicial no centro do labirinto
let cameraX = 0;
let cameraY = 0.05;  // Altura fixa da câmera (olho do jogador, perto do chão)
let cameraZ = 0;     // Centro do labirinto

// Ângulos de rotação da câmera
let cameraYaw = 0;    // Rotação horizontal (esquerda/direita)
let cameraPitch = 0;  // Rotação vertical (cima/baixo) - limitada

// Velocidade de movimento
const moveSpeed = 0.01;
const rotateSpeed = 0.03;

// Estado das teclas
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

// Atualiza a posição da câmera baseado nas teclas pressionadas
function updateCamera() {
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
        cameraYaw -= rotateSpeed;
    }
    if (keys['arrowright']) {
        cameraYaw += rotateSpeed;
    }
    if (keys['arrowup']) {
        cameraPitch = Math.min(cameraPitch + rotateSpeed, Math.PI / 3);
    }
    if (keys['arrowdown']) {
        cameraPitch = Math.max(cameraPitch - rotateSpeed, -Math.PI / 3);
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

const candelabraPositions = [
    { x: -0.2, y: -0.1, z: -0.2 }
];

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


        // Carregue a lanterna (ajuste o caminho se necessário)
        const lanternaModel = await carregarOBJComMTL('modelos/lanterna/model.obj');
        const lanternaNorm = normalizarModelo(lanternaModel);
        lanternaNorm.cores = lanternaModel.cores;
        lanternaBuffers = criarBuffersOBJComCores(gl, lanternaNorm);
        console.log("Lanterna carregada!");

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
    // 1. LIMPEZA E USO DO PROGRAMA
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shaderProgram);

    // 2. CONFIGURAÇÃO DA CÂMERA (VIEW MATRIX)
    const eye = [cameraX, cameraY, cameraZ];
    const lookX = cameraX + Math.sin(cameraYaw) * Math.cos(cameraPitch);
    const lookY = cameraY + Math.sin(cameraPitch);
    const lookZ = cameraZ - Math.cos(cameraYaw) * Math.cos(cameraPitch);
    const center = [lookX, lookY, lookZ];
    const up = [0, 1, 0];
    const viewMatrix = lookAt(eye, center, up);

    const aspect = gl.canvas.width / gl.canvas.height;
    const projectionMatrix = perspective(Math.PI / 4, aspect, 0.1, 100.0);

    // 3. LÓGICA DO FLICKER (LANTERNA PISCANDO)
    let flicker = 0.85 + Math.sin(keyAnimationTime * 30.0) * 0.15;
    if (Math.random() > 0.90) { 
        flicker *= Math.random() > 0.5 ? 0.1 : 0.4; 
    }
    if (Math.random() > 0.995) {
        flicker = 0.0;
    }

    // 4. ENVIO DE UNIFORMS GLOBAIS (LUZ E MATRIZES)
    const uModelViewMatrix = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    const uIsKey = gl.getUniformLocation(shaderProgram, "uIsKey");
    const uIsGrass = gl.getUniformLocation(shaderProgram, "uIsGrass");
    const uUseMTLColor = gl.getUniformLocation(shaderProgram, "uUseMTLColor");
    const uStoneTexture = gl.getUniformLocation(shaderProgram, "uStoneTexture");
    const uTime = gl.getUniformLocation(shaderProgram, "uTime");
    const uLightIntensity = gl.getUniformLocation(shaderProgram, "uLightIntensity");
    const uLightPos = gl.getUniformLocation(shaderProgram, "uLightPos");
    const uLightDir = gl.getUniformLocation(shaderProgram, "uLightDir");
    const uCutOff = gl.getUniformLocation(shaderProgram, "uCutOff");

    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniform1f(uTime, keyAnimationTime);
    gl.uniform1f(uLightIntensity, flicker);
    
    // Configuração da Lanterna (Espaço da Câmera)
    gl.uniform3fv(uLightPos, [0.1, -0.1, 0.0]);
    gl.uniform3fv(uLightDir, [0.0, 0.0, -1.0]);
    gl.uniform1f(uCutOff, Math.cos(Math.PI / 15));

    // 5. ATIVAÇÃO DA TEXTURA (Se estiver carregada)
    gl.activeTexture(gl.TEXTURE0);
    if (stoneTexture) {
        gl.bindTexture(gl.TEXTURE_2D, stoneTexture);
        gl.uniform1i(uStoneTexture, 0);
    }

    // --- DESENHO DOS OBJETOS ---

    // A. CHÃO (GRASS PATCH)
    if (floorBuffers) {
        const grassModelMatrix = mat4.create();
        mat4.translate(grassModelMatrix, grassModelMatrix, [0, -0.06, 0]);
        mat4.scale(grassModelMatrix, grassModelMatrix, [1.0, 0.1, 1.0]);
        const grassMV = mat4.create();
        mat4.multiply(grassMV, viewMatrix, grassModelMatrix);

        gl.uniformMatrix4fv(uModelViewMatrix, false, grassMV);
        gl.uniform1i(uIsGrass, 1);
        gl.uniform1i(uIsKey, 0);
        gl.uniform1i(uUseMTLColor, 0);
        desenharOBJComCores(gl, floorBuffers, shaderProgram);
    }

    // B. LABIRINTO (MAZE)
    if (mazeBuffers) {
        gl.uniformMatrix4fv(uModelViewMatrix, false, viewMatrix);
        gl.uniform1i(uIsGrass, 0);
        gl.uniform1i(uIsKey, 0);
        gl.uniform1i(uUseMTLColor, 0); // Usa Textura stoneTexture
        desenharOBJComCores(gl, mazeBuffers, shaderProgram);
    }

    // C. CHAVES (COM ANIMAÇÃO)
    keyAnimationTime += 0.03;
    if (keyBuffers) {
        gl.uniform1i(uIsGrass, 0);
        gl.uniform1i(uIsKey, 1);
        gl.uniform1i(uUseMTLColor, 1); // Usa cores do MTL
        for (let i = 0; i < keyPositions.length; i++) {
            const pos = keyPositions[i];
            const bounce = Math.sin(keyAnimationTime * 3.0 + i * 2) * 0.02;
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, [pos.x, pos.y + bounce, pos.z]);
            mat4.rotateY(modelMatrix, modelMatrix, keyAnimationTime * 2 + i);
            mat4.scale(modelMatrix, modelMatrix, [0.08, 0.08, 0.08]);
            const mvMatrix = mat4.create();
            mat4.multiply(mvMatrix, viewMatrix, modelMatrix);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mvMatrix);
            desenharOBJComCores(gl, keyBuffers, shaderProgram);
        }
    }

    // D. MODELOS ESTÁTICOS (Lápides, Ossos, etc.)
    gl.uniform1i(uIsKey, 0);
    gl.uniform1i(uUseMTLColor, 1);

    const renderStatic = (buffers, positions, scale, rotateY = 0) => {
        if (!buffers) return;
        for (const pos of positions) {
            const mm = mat4.create();
            mat4.translate(mm, mm, [pos.x, pos.y, pos.z]);
            if(rotateY !== 0) mat4.rotateY(mm, mm, rotateY);
            mat4.scale(mm, mm, [scale, scale, scale]);
            const mv = mat4.create();
            mat4.multiply(mv, viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, buffers, shaderProgram);
        }
    };

    renderStatic(gravestoneBuffers, gravestonesPositions, 0.05);
    renderStatic(bonesBuffers, bonesPositions, 0.05);
    renderStatic(angelBuffers, angelPositions, 0.15);
    renderStatic(anubisBuffers, anubisPositions, 0.15);
    renderStatic(treeBuffers, treePositions, 0.3);
    renderStatic(skeletonBuffers, skeletonPositions, 0.12, Math.PI);
    renderStatic(candelabraBuffers, candelabraPositions, 0.1);

    // E. LUA (IGNORA FOG SE QUISER QUE FIQUE BRILHANTE)
    if (moonBuffers) {
        const mm = mat4.create();
        mat4.translate(mm, mm, [moonPosition.x, moonPosition.y, moonPosition.z]);
        mat4.scale(mm, mm, [0.5, 0.5, 0.5]);
        const mv = mat4.create();
        mat4.multiply(mv, viewMatrix, mm);
        gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
        desenharOBJComCores(gl, moonBuffers, shaderProgram);
    }

    // F. LANTERNA (MÃO DO JOGADOR)
    if (lanternaBuffers) {
        gl.clear(gl.DEPTH_BUFFER_BIT); 
        const bob = Math.sin(keyAnimationTime * 2.0) * 0.005;
        const mMatrixMao = mat4.create();
        mat4.translate(mMatrixMao, mMatrixMao, [0.35, -0.4 + bob, -0.7]);
        mat4.rotateY(mMatrixMao, mMatrixMao, -Math.PI / 8);
        mat4.rotateX(mMatrixMao, mMatrixMao, Math.PI / 2);
        mat4.scale(mMatrixMao, mMatrixMao, [0.025, 0.025, 0.025]);

        gl.uniformMatrix4fv(uModelViewMatrix, false, mMatrixMao);
        gl.uniform1i(uUseMTLColor, 1);
        desenharOBJComCores(gl, lanternaBuffers, shaderProgram);
    }
}

window.onload = iniciaWebGL;
