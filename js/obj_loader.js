/**
 * Converte arquivos .obj em buffers prontos para WebGL
 */

/**
 * Carrega e parseia um arquivo OBJ
 * @param {string} url - Caminho para o arquivo .obj
 * @returns {Promise<Object>} Objeto com vértices, normais, texturas e índices
 */
async function carregarOBJ(url) {
    const response = await fetch(url);
    const text = await response.text();
    return parsearOBJ(text);
}

/**
 * Parseia o conteúdo de texto de um arquivo OBJ
 * @param {string} objText - Conteúdo do arquivo OBJ
 * @returns {Object} Dados parseados do modelo
 */
function parsearOBJ(objText) {
    // Arrays temporários para guardar os dados brutos
    const tempVertices = [];   // v x y z
    const tempNormais = [];    // vn x y z
    const tempTexturas = [];   // vt u v

    // Arrays finais para WebGL
    const vertices = [];
    const normais = [];
    const texturas = [];
    const indices = [];

    // Cache para evitar duplicatas de vértices
    const vertexCache = {};
    let indexCounter = 0;

    // Processa linha por linha
    const linhas = objText.split('\n');

    for (let linha of linhas) {
        linha = linha.trim();

        // Ignora comentários e linhas vazias
        if (linha.startsWith('#') || linha.length === 0) continue;

        const partes = linha.split(/\s+/);
        const tipo = partes[0];

        switch (tipo) {
            case 'v':  // Vértice
                tempVertices.push([
                    parseFloat(partes[1]),
                    parseFloat(partes[2]),
                    parseFloat(partes[3])
                ]);
                break;

            case 'vn': // Normal
                tempNormais.push([
                    parseFloat(partes[1]),
                    parseFloat(partes[2]),
                    parseFloat(partes[3])
                ]);
                break;

            case 'vt': // Coordenada de textura
                tempTexturas.push([
                    parseFloat(partes[1]),
                    parseFloat(partes[2] || 0)
                ]);
                break;

            case 'f':  // Face
                // Faces podem ser triângulos ou polígonos
                // Converte polígonos em triângulos (fan triangulation)
                const faceVertices = partes.slice(1);

                for (let i = 1; i < faceVertices.length - 1; i++) {
                    // Triangula: 0, i, i+1
                    processarVertice(faceVertices[0]);
                    processarVertice(faceVertices[i]);
                    processarVertice(faceVertices[i + 1]);
                }
                break;
        }
    }

    /**
     * Processa um vértice da face (formato: v/vt/vn ou v//vn ou v/vt ou v)
     */
    function processarVertice(vertexStr) {
        // Verifica se já processamos este vértice
        if (vertexCache[vertexStr] !== undefined) {
            indices.push(vertexCache[vertexStr]);
            return;
        }

        const partes = vertexStr.split('/');

        // Índice do vértice (OBJ usa índices 1-based, JavaScript usa 0-based)
        const vIdx = parseInt(partes[0]) - 1;
        const vtIdx = partes[1] ? parseInt(partes[1]) - 1 : -1;
        const vnIdx = partes[2] ? parseInt(partes[2]) - 1 : -1;

        // Adiciona o vértice
        if (tempVertices[vIdx]) {
            vertices.push(...tempVertices[vIdx]);
        }

        // Adiciona coordenada de textura (se existir)
        if (vtIdx >= 0 && tempTexturas[vtIdx]) {
            texturas.push(...tempTexturas[vtIdx]);
        } else {
            texturas.push(0, 0);
        }

        // Adiciona normal (se existir)
        if (vnIdx >= 0 && tempNormais[vnIdx]) {
            normais.push(...tempNormais[vnIdx]);
        } else {
            normais.push(0, 1, 0); // Normal padrão para cima
        }

        // Adiciona ao cache e ao array de índices
        vertexCache[vertexStr] = indexCounter;
        indices.push(indexCounter);
        indexCounter++;
    }

    return {
        vertices: new Float32Array(vertices),
        normais: new Float32Array(normais),
        texturas: new Float32Array(texturas),
        indices: new Uint16Array(indices),
        numVertices: vertices.length / 3,
        numFaces: indices.length / 3
    };
}

/**
 * Cria buffers WebGL a partir de um modelo OBJ carregado
 * @param {WebGL2RenderingContext} gl - Contexto WebGL
 * @param {Object} modelo - Modelo parseado do OBJ
 * @returns {Object} Buffers prontos para renderização
 */
function criarBuffersOBJ(gl, modelo) {
    // Buffer de vértices
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelo.vertices, gl.STATIC_DRAW);

    // Buffer de normais
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelo.normais, gl.STATIC_DRAW);

    // Buffer de coordenadas de textura
    const texturaBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texturaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelo.texturas, gl.STATIC_DRAW);

    // Buffer de índices (Element Array Buffer)
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelo.indices, gl.STATIC_DRAW);

    return {
        vertices: vertexBuffer,
        normais: normalBuffer,
        texturas: texturaBuffer,
        indices: indexBuffer,
        numIndices: modelo.indices.length
    };
}

/**
 * Desenha um modelo OBJ
 * @param {WebGL2RenderingContext} gl - Contexto WebGL
 * @param {Object} buffers - Buffers do modelo
 * @param {WebGLProgram} program - Programa shader
 */
function desenharOBJ(gl, buffers, program) {
    // Conecta vértices
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
    const posLoc = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    // Conecta normais (se o shader tiver)
    const normalLoc = gl.getAttribLocation(program, "aVertexNormal");
    if (normalLoc >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normais);
        gl.enableVertexAttribArray(normalLoc);
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Desenha usando índices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.drawElements(gl.TRIANGLES, buffers.numIndices, gl.UNSIGNED_SHORT, 0);
}
