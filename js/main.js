let gl;
let shaderProgram;
let mazeBuffers;
let floorBuffers;
let keyBuffers;

// Apenas 1 chave no centro do labirinto
const keyPositions = [
    { x: 0, y: -0.05, z: -5 },// Centro visual do labirinto (y=altura)
    { x: -2, y: 2, z: -5 }, // Canto superior esquerdo
    { x: 1.8, y: -2, z: -5 }  // Canto inferior direito
];

async function iniciaWebGL() {
    const canvas = document.querySelector("#meuCanvas");
    gl = canvas.getContext("webgl2");

    if (!gl) {
        alert("WebGL não suportado!");
        return;
    }

    // Ajusta o tamanho do desenho ao tamanho da janela
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Configura o WebGL
    gl.clearColor(0.1, 0.1, 0.15, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Compila os shaders
    shaderProgram = criarShaderProgram();
    if (!shaderProgram) {
        console.error("Erro ao criar shader program");
        return;
    }

    // Carrega os modelos
    console.log("Carregando modelos...");
    try {
        // Carrega o labirinto
        const mazeModel = await carregarOBJ('modelos/Maze.0/model.obj');
        console.log("Labirinto carregado:", mazeModel.numVertices, "vertices");
        mazeBuffers = criarBuffersOBJ(gl, mazeModel);

        // Carrega a chave (NORMALIZADA - centralizada e escalada para tamanho 1)
        const keyModel = await carregarOBJNormalizado('modelos/Key/Key_01(1).obj');
        console.log("Chave carregada e normalizada:", keyModel.numVertices, "vertices");
        keyBuffers = criarBuffersOBJ(gl, keyModel);

        // Carrega o modelo de grama (Grass Patch)
        const grassModel = await carregarOBJ('modelos/grass misx/model.obj');
        console.log("Grama carregada:", grassModel.numVertices, "vertices");
        floorBuffers = criarBuffersOBJ(gl, grassModel);

        // Inicia o loop de renderização
        renderizar();
    } catch (error) {
        console.error("Erro ao carregar modelos:", error);
    }
}

// Função removida - agora usamos o modelo Grass Patch real

/**
 * Compila e linka os shaders
 */
function criarShaderProgram() {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vsSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error("Vertex shader error:", gl.getShaderInfoLog(vertexShader));
        return null;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fsSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error("Fragment shader error:", gl.getShaderInfoLog(fragmentShader));
        return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

/**
 * Loop de renderização
 */
function renderizar() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaderProgram);

    // Configura a câmera de cima (top-down view)
    const eye = [0, 5, 0.01];
    const center = [0, 0, 0];
    const up = [0, 0, -1];

    const viewMatrix = lookAt(eye, center, up);

    const aspect = gl.canvas.width / gl.canvas.height;
    const fov = Math.PI / 4;
    const projectionMatrix = perspective(fov, aspect, 0.1, 100.0);

    // Localização dos uniforms
    const uModelViewMatrix = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    const uIsGrass = gl.getUniformLocation(shaderProgram, "uIsGrass");
    const uIsKey = gl.getUniformLocation(shaderProgram, "uIsKey");

    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

    // Desenha o chão (modelo Grass Patch)
    // O modelo Grass Patch precisa ser posicionado e escalado para cobrir o labirinto
    const grassScaleX = 3.0;    // Largura para cobrir o labirinto
    const grassScaleY = 0.3;    // Altura pequena = grama rala/baixa
    const grassScaleZ = 3.0;    // Profundidade para cobrir o labirinto
    const grassY = -0.30;       // Nível do chão do labirinto
    const grassScaleMatrix = mat4Scale(grassScaleX, grassScaleY, grassScaleZ);
    const grassTranslateMatrix = mat4Translate(-1.0, grassY, -0.8); // Centralizar no labirinto
    let grassModelMatrix = multiplyMatrices(grassTranslateMatrix, grassScaleMatrix);
    const grassModelViewMatrix = multiplyMatrices(viewMatrix, grassModelMatrix);

    gl.uniformMatrix4fv(uModelViewMatrix, false, grassModelViewMatrix);
    gl.uniform1i(uIsGrass, 1);
    gl.uniform1i(uIsKey, 0);
    desenharOBJ(gl, floorBuffers, shaderProgram);

    // Desenha o labirinto com matriz de visualização normal
    gl.uniformMatrix4fv(uModelViewMatrix, false, viewMatrix);

    // Desenha o labirinto
    gl.uniform1i(uIsGrass, 0);
    gl.uniform1i(uIsKey, 0);
    desenharOBJ(gl, mazeBuffers, shaderProgram);

    // Desenha as 3 chaves nas posições estratégicas
    gl.uniform1i(uIsGrass, 0);
    gl.uniform1i(uIsKey, 1);

    // Modelo normalizado tem tamanho 1, escalar para tamanho desejado no labirinto
    const keyScale = 0.5;    // 50% do tamanho - visível mas não enorme

    for (let i = 0; i < keyPositions.length; i++) {
        const pos = keyPositions[i];

        // Cria matriz de transformação: translação + escala (usa pos.y como altura)
        const scaleMatrix = mat4Scale(keyScale, keyScale, keyScale);
        const translateMatrix = mat4Translate(pos.x, pos.y, pos.z);

        // Combina as transformações: translate * scale
        let modelMatrix = multiplyMatrices(translateMatrix, scaleMatrix);

        // Combina com view matrix
        const modelViewMatrix = multiplyMatrices(viewMatrix, modelMatrix);

        gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
        desenharOBJ(gl, keyBuffers, shaderProgram);
    }

    console.log("Labirinto com 3 chaves renderizado!");
}

window.onload = iniciaWebGL;