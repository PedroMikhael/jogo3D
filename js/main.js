let lanternaBuffers, gl, shaderProgram, mazeBuffers, floorBuffers, keyBuffers;
let stoneTexture, gravestoneBuffers, bonesBuffers, angelBuffers, anubisBuffers;
let treeBuffers, skeletonBuffers, moonBuffers, candelabraBuffers;

let keyAnimationTime = 0;

// ===== SISTEMA DE CÂMERA E LIMITES =====
const MAZE_MIN_X = -1.1, MAZE_MAX_X = 1.0;
const MAZE_MIN_Z = -1.1, MAZE_MAX_Z = 1.0;

let cameraX = 0, cameraY = 0.05, cameraZ = 0;
let cameraYaw = 0, cameraPitch = 0;
const moveSpeed = 0.01, rotateSpeed = 0.03;
const keys = {};

function initControls() {
    document.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
    document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
}

function clampCameraPosition() {
    cameraX = Math.max(MAZE_MIN_X, Math.min(MAZE_MAX_X, cameraX));
    cameraZ = Math.max(MAZE_MIN_Z, Math.min(MAZE_MAX_Z, cameraZ));
}

function updateCamera() {
    const forwardX = Math.sin(cameraYaw), forwardZ = -Math.cos(cameraYaw);
    const rightX = Math.cos(cameraYaw), rightZ = Math.sin(cameraYaw);

    if (keys['w']) { cameraX += forwardX * moveSpeed; cameraZ += forwardZ * moveSpeed; }
    if (keys['s']) { cameraX -= forwardX * moveSpeed; cameraZ -= forwardZ * moveSpeed; }
    if (keys['a']) { cameraX -= rightX * moveSpeed; cameraZ -= rightZ * moveSpeed; }
    if (keys['d']) { cameraX += rightX * moveSpeed; cameraZ += rightZ * moveSpeed; }

    clampCameraPosition();

    if (keys['arrowleft']) cameraYaw -= rotateSpeed;
    if (keys['arrowright']) cameraYaw += rotateSpeed;
    if (keys['arrowup']) cameraPitch = Math.min(cameraPitch + rotateSpeed, Math.PI / 3);
    if (keys['arrowdown']) cameraPitch = Math.max(cameraPitch - rotateSpeed, -Math.PI / 3);
}

// POSIÇÕES DOS OBJETOS
const keyPositions = [{ x: -0.11, y: 0.03, z: -0.14 }, { x: -0.75, y: 0.03, z: -0.95 }, { x: 0.90, y: 0.03, z: 0.95 }];
const gravestonesPositions = [{ x: -0.56, y: -0.05, z: -0.08 }, { x: -0.31, y: -0.05, z: 0.44 }, { x: -0.41, y: -0.05, z: 0.26 }, { x: 0.41, y: -0.05, z: -0.86 }, { x: 0.23, y: -0.05, z: -0.35 }];
const bonesPositions = [{ x: -0.22, y: -0.05, z: 0.48 }, { x: -0.41, y: -0.05, z: 1.06 }, { x: 0.69, y: -0.05, z: -0.35 }, { x: 0.23, y: -0.05, z: -0.89 }];
const angelPositions = [{ x: 0.89, y: 0.025, z: -1 }];
const anubisPositions = [{ x: 0.61, y: 0.04, z: -0.17 }];
const treePositions = [{ x: 0.80, y: 0, z: 0.78 }];
const skeletonPositions = [{ x: 0.14, y: 0, z: 0.30 }]; // O Skeleton causa medo!
const moonPosition = { x: 0.0, y: 6.0, z: -2.0 };
const candelabraPositions = [{ x: -0.2, y: -0.1, z: -0.2 }];

async function iniciaWebGL() {
    const canvas = document.querySelector("#meuCanvas");
    gl = getGL(canvas);
    if (!gl) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.01, 0.01, 0.03, 1.0); // Noite escura
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    shaderProgram = createProgramFromSources(gl, vsSource, fsSource);

    try {
        console.log("Carregando recursos de terror...");
        mazeBuffers = criarBuffersOBJComCores(gl, await carregarOBJComMTL('modelos/Maze.0/model.obj'));
        keyBuffers = criarBuffersOBJComCores(gl, normalizarModelo(await carregarOBJComMTL('modelos/Key/Key_01(1).obj')));
        floorBuffers = criarBuffersOBJComCores(gl, await carregarOBJComMTL('modelos/Grass Patch/model.obj')); // Reutilizado como chão de pedra
        gravestoneBuffers = criarBuffersOBJComCores(gl, normalizarModelo(await carregarOBJComMTL('modelos/gravestone/model.obj')));
        bonesBuffers = criarBuffersOBJComCores(gl, normalizarModelo(await carregarOBJComMTL('modelos/Pile of Bones/PileBones.obj')));
        lanternaBuffers = criarBuffersOBJComCores(gl, normalizarModelo(await carregarOBJComMTL('modelos/lanterna/model.obj')));
        angelBuffers = criarBuffersOBJComCores(gl, normalizarModelo(await carregarOBJComMTL('modelos/AngelStatue/AngelStatue.obj')));
        anubisBuffers = criarBuffersOBJComCores(gl, normalizarModelo(await carregarOBJComMTL('modelos/Anubis Statue/anubis.obj')));
        treeBuffers = criarBuffersOBJComCores(gl, normalizarModelo(await carregarOBJComMTL('modelos/deadTree/model.obj')));
        skeletonBuffers = criarBuffersOBJComCores(gl, normalizarModelo(await carregarOBJComMTL('modelos/Skeleton/model.obj')));
        moonBuffers = criarBuffersOBJComCores(gl, normalizarModelo(await carregarOBJComMTL('modelos/Moon/model.obj')));
        candelabraBuffers = criarBuffersOBJComCores(gl, normalizarModelo(await carregarOBJComMTL('modelos/Simple Candelabra/model.obj')));
        
        stoneTexture = await carregarTextura(gl, 'modelos/img_dark_stone.jpg');

        initControls();
        renderLoop();
    } catch (error) {
        console.error("Falha no carregamento:", error);
    }
}

function renderLoop() {
    updateCamera();
    renderizar();
    requestAnimationFrame(renderLoop);
}

function renderizar() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shaderProgram);

    // MATRIZES DE VISÃO
    const eye = [cameraX, cameraY, cameraZ];
    const lookX = cameraX + Math.sin(cameraYaw) * Math.cos(cameraPitch);
    const lookY = cameraY + Math.sin(cameraPitch);
    const lookZ = cameraZ - Math.cos(cameraYaw) * Math.cos(cameraPitch);
    const viewMatrix = lookAt(eye, [lookX, lookY, lookZ], [0, 1, 0]);
    const projectionMatrix = perspective(Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 100.0);

    // === LÓGICA DE MEDO (SANIDADE) ===
    // Se estiver perto do esqueleto, a lanterna falha mais
    let distAoEsqueleto = Math.sqrt(Math.pow(cameraX - 0.14, 2) + Math.pow(cameraZ - 0.30, 2));
    let flickerRange = distAoEsqueleto < 0.3 ? 0.4 : 0.15;
    
    let flicker = 0.85 + Math.sin(keyAnimationTime * 40.0) * flickerRange;
    if (distAoEsqueleto < 0.25 && Math.random() > 0.8) flicker *= 0.2; // Falha grave perto do monstro

    // UNIFORMS
    const uModelViewMatrix = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    const uUseMTLColor = gl.getUniformLocation(shaderProgram, "uUseMTLColor");
    const uStoneTexture = gl.getUniformLocation(shaderProgram, "uStoneTexture");
    const uTime = gl.getUniformLocation(shaderProgram, "uTime");
    const uLightIntensity = gl.getUniformLocation(shaderProgram, "uLightIntensity");
    const uCutOff = gl.getUniformLocation(shaderProgram, "uCutOff");

    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniform1f(uTime, keyAnimationTime);
    gl.uniform1f(uLightIntensity, flicker);
    gl.uniform1f(uCutOff, Math.cos(Math.PI / 12));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, stoneTexture);
    gl.uniform1i(uStoneTexture, 0);

    // --- DESENHO DOS OBJETOS ---

    // A. CHÃO DE PEDRA (Onde a poça de sangue aparece via Shader)
    if (floorBuffers) {
        const floorMM = mat4.create();
        mat4.translate(floorMM, floorMM, [0, -0.06, 0]);
        mat4.scale(floorMM, floorMM, [10.0, 1.0, 10.0]); // Escala grande para o chão de pedra
        const floorMV = mat4.create();
        mat4.multiply(floorMV, viewMatrix, floorMM);
        gl.uniformMatrix4fv(uModelViewMatrix, false, floorMV);
        gl.uniform1i(uUseMTLColor, 0); 
        desenharOBJComCores(gl, floorBuffers, shaderProgram);
    }

    // B. LABIRINTO
    if (mazeBuffers) {
        gl.uniformMatrix4fv(uModelViewMatrix, false, viewMatrix);
        gl.uniform1i(uUseMTLColor, 0);
        desenharOBJComCores(gl, mazeBuffers, shaderProgram);
    }

    // C. CHAVES (ANIMAÇÃO)
    keyAnimationTime += 0.03;
    if (keyBuffers) {
        gl.uniform1i(uUseMTLColor, 1);
        for (let i = 0; i < keyPositions.length; i++) {
            const pos = keyPositions[i];
            const bounce = Math.sin(keyAnimationTime * 3.0 + i) * 0.02;
            const mm = mat4.create();
            mat4.translate(mm, mm, [pos.x, pos.y + bounce, pos.z]);
            mat4.rotateY(mm, mm, keyAnimationTime * 2);
            mat4.scale(mm, mm, [0.08, 0.08, 0.08]);
            const mv = mat4.create();
            mat4.multiply(mv, viewMatrix, mm);
            gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
            desenharOBJComCores(gl, keyBuffers, shaderProgram);
        }
    }

    // D. MODELOS ESTÁTICOS
    const renderStatic = (buffers, positions, scale, rotateY = 0) => {
        if (!buffers) return;
        gl.uniform1i(uUseMTLColor, 1);
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

    // E. LUA
    if (moonBuffers) {
        const mm = mat4.create();
        mat4.translate(mm, mm, [moonPosition.x, moonPosition.y, moonPosition.z]);
        mat4.scale(mm, mm, [0.5, 0.5, 0.5]);
        const mv = mat4.create();
        mat4.multiply(mv, viewMatrix, mm);
        gl.uniformMatrix4fv(uModelViewMatrix, false, mv);
        desenharOBJComCores(gl, moonBuffers, shaderProgram);
    }

    // F. LANTERNA (Overlay na mão)
    if (lanternaBuffers) {
        gl.clear(gl.DEPTH_BUFFER_BIT); 
        const bob = Math.sin(keyAnimationTime * 2.0) * 0.005;
        const mm = mat4.create();
        mat4.translate(mm, mm, [0.35, -0.4 + bob, -0.7]);
        mat4.rotateY(mm, mm, -Math.PI / 8);
        mat4.rotateX(mm, mm, Math.PI / 2);
        mat4.scale(mm, mm, [0.025, 0.025, 0.025]);
        gl.uniformMatrix4fv(uModelViewMatrix, false, mm);
        gl.uniform1i(uUseMTLColor, 1);
        desenharOBJComCores(gl, lanternaBuffers, shaderProgram);
    }
}

window.onload = iniciaWebGL;