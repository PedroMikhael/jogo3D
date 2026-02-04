let lanternaBuffers; // Adicione esta linha
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
let cameraY = -0.01;  // Altura fixa da câmera (olho do jogador, perto do chão)
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


    // Vetor de direção para onde o jogador olha
    const lightDirX = Math.sin(cameraYaw) * Math.cos(cameraPitch);
    const lightDirY = Math.sin(cameraPitch);
    const lightDirZ = -Math.cos(cameraYaw) * Math.cos(cameraPitch);

    // Envie para o Shader (certifique-se de que os nomes batem com seu fsSource)
    const uLightPos = gl.getUniformLocation(shaderProgram, "uLightPos");
    const uLightDir = gl.getUniformLocation(shaderProgram, "uLightDir");
    const uCutOff = gl.getUniformLocation(shaderProgram, "uCutOff");

    gl.uniform3fv(uLightPos, [0.1, -0.1 , 0.0 ]);
    gl.uniform3fv(uLightDir, [0.0, 0.0 , -1.0 ]);
    gl.uniform1f(uCutOff, Math.cos(Math.PI / 6)); // Ângulo do foco da lanterna (18 graus)

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
    const uStoneTexture = gl.getUniformLocation(shaderProgram, "uStoneTexture");
    const uTime = gl.getUniformLocation(shaderProgram, "uTime");

    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

    // Passa o tempo para animação da grama
    gl.uniform1f(uTime, keyAnimationTime);  // Reutiliza o tempo da animação das chaves

    // Ativa a textura de pedra
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, stoneTexture);
    gl.uniform1i(uStoneTexture, 0);

    // Desenha o chão (modelo Grass Patch)
    // Posiciona EM CIMA do chão do labirinto - usando gl-matrix igual às chaves
    const grassScale = 1;
    const grassY = -0.06;

    // Cria matriz model usando gl-matrix (igual às chaves)
    const grassModelMatrix = mat4.create();
    mat4.translate(grassModelMatrix, grassModelMatrix, [0, grassY, 0]);
    mat4.scale(grassModelMatrix, grassModelMatrix, [grassScale, 0.1, grassScale]);

    // Multiplica view * model
    const grassModelViewMatrix = mat4.create();
    mat4.multiply(grassModelViewMatrix, viewMatrix, grassModelMatrix);

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

        // Cria matriz model com animação
        const modelMatrix = mat4.create();

        // 1. Translação para a posição (com bounce no Y)
        mat4.translate(modelMatrix, modelMatrix, [pos.x, pos.y + bounce, pos.z]);

        // 2. Rotação no eixo Y
        mat4.rotateY(modelMatrix, modelMatrix, rotationAngle);

        // 3. Escala
        mat4.scale(modelMatrix, modelMatrix, [keyScale, keyScale, keyScale]);

        // Multiplica view * model
        const modelViewMatrix = mat4.create();
        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

        gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
        desenharOBJComCores(gl, keyBuffers, shaderProgram);
    }

    gl.uniform1i(uIsGrass, 0);
    gl.uniform1i(uIsKey, 0);
    gl.uniform1i(uUseMTLColor, 1);

    const gravestoneScale = 0.05; // Ajuste conforme o tamanho do modelo

    if (gravestoneBuffers) {
        for (const pos of gravestonesPositions) {
            const modelMatrix = mat4.create();
            // Translação
            mat4.translate(modelMatrix, modelMatrix, [pos.x, pos.y, pos.z]);
            // Escala
            mat4.scale(modelMatrix, modelMatrix, [gravestoneScale, gravestoneScale, gravestoneScale]);

            const modelViewMatrix = mat4.create();
            mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

            gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
            desenharOBJComCores(gl, gravestoneBuffers, shaderProgram);
        }
    }

    // --- Renderização dos Bones ---
    if (bonesBuffers) {
        for (const pos of bonesPositions) {
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, [pos.x, pos.y, pos.z]);
            mat4.scale(modelMatrix, modelMatrix, [0.05, 0.05, 0.05]);
            const modelViewMatrix = mat4.create();
            mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
            gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
            desenharOBJComCores(gl, bonesBuffers, shaderProgram);
        }
    }

    // --- Outros modelos ---
    const defaultScale = 0.15;

    // Anjo
    if (angelBuffers) {
        for (const pos of angelPositions) {
            const mm = mat4.create();
            mat4.translate(mm, mm, [pos.x, pos.y, pos.z]);
            mat4.scale(mm, mm, [defaultScale, defaultScale, defaultScale]);
            const mv = mat4.create(); mat4.multiply(mv, viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, angelBuffers, shaderProgram);
        }
    }

    // Anubis
    if (anubisBuffers) {
        for (const pos of anubisPositions) {
            const mm = mat4.create();
            mat4.translate(mm, mm, [pos.x, pos.y, pos.z]);
            mat4.scale(mm, mm, [defaultScale, defaultScale, defaultScale]);
            const mv = mat4.create(); mat4.multiply(mv, viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, anubisBuffers, shaderProgram);
        }
    }

    // Arvore
    if (treeBuffers) {
        for (const pos of treePositions) {
            const mm = mat4.create();
            mat4.translate(mm, mm, [pos.x, pos.y, pos.z]);
            mat4.scale(mm, mm, [0.3, 0.3, 0.3]);
            const mv = mat4.create(); mat4.multiply(mv, viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, treeBuffers, shaderProgram);
        }
    }

    // Esqueleto
    if (skeletonBuffers) {
        for (const pos of skeletonPositions) {
            const mm = mat4.create();
            mat4.translate(mm, mm, [pos.x, pos.y, pos.z]);
            // Reaplicando rotação e escala ajustada
            mat4.rotateY(mm, mm, Math.PI);
            mat4.scale(mm, mm, [0.12, 0.12, 0.12]);
            const mv = mat4.create(); mat4.multiply(mv, viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, skeletonBuffers, shaderProgram);
        }
    }

    // Lua
    if (moonBuffers && moonPosition) {
        const mm = mat4.create();
        mat4.translate(mm, mm, [moonPosition.x, moonPosition.y, moonPosition.z]);
        mat4.scale(mm, mm, [0.5, 0.5, 0.5]);
        mat4.rotateY(mm, mm, keyAnimationTime * 0.2);
        const mv = mat4.create(); mat4.multiply(mv, viewMatrix, mm);
        gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
        desenharOBJComCores(gl, moonBuffers, shaderProgram);
    }

    // Candelabro
    if (candelabraBuffers) {
        for (const pos of candelabraPositions) {
            const mm = mat4.create();
            mat4.translate(mm, mm, [pos.x, pos.y, pos.z]);
            mat4.scale(mm, mm, [0.1, 0.1, 0.1]);
            const mv = mat4.create(); mat4.multiply(mv, viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, candelabraBuffers, shaderProgram);
        }
    }


    // === RENDERIZAÇÃO DA LANTERNA (MÃO DO JOGADOR) ===
    if (lanternaBuffers) {
        gl.clear(gl.DEPTH_BUFFER_BIT); // Faz a lanterna ficar na frente de tudo

        const mMatrixMao = mat4.create();

        // 1. BALANÇO SUAVE (Simula o personagem respirando/andando)
        const bobbing = Math.sin(keyAnimationTime * 2.0) * 0.005;
        const sway = Math.cos(keyAnimationTime * 1.0) * 0.005; 
        
        // 2. POSIÇÃO (Ajustado para o canto inferior direito como na imagem)
        // [Eixo X (Direita), Eixo Y (Baixo), Eixo Z (Frente)]
        mat4.translate(mMatrixMao, mMatrixMao, [0.35 + sway, -0.4 + bobbing, -0.7]);

        // 3. Rotação (caso o modelo venha virado para trás)
        mat4.rotateY(mMatrixMao, mMatrixMao, -Math.PI / 8); // Inclina para o centro
        mat4.rotateX(mMatrixMao, mMatrixMao, Math.PI / 2); // Inclina um pouco para cima
        
        // 4. ESCALA
        mat4.scale(mMatrixMao, mMatrixMao, [0.025, 0.025, 0.025]);

        // IMPORTANTE: Enviamos a matriz diretamente, sem multiplicar pela ViewMatrix
        // Isso faz ela ignorar o movimento do mundo e ficar presa no seu nariz
        gl.uniformMatrix4fv(uModelViewMatrix, false, mMatrixMao);
        gl.uniform1i(uUseMTLColor, 1);
        desenharOBJComCores(gl, lanternaBuffers, shaderProgram);
    }

     
}

window.onload = iniciaWebGL;