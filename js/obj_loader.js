/**
 * Converte arquivos .obj em buffers prontos para WebGL
 * Com suporte a materiais MTL
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
 * Carrega um OBJ junto com seu arquivo MTL (materiais)
 * @param {string} objUrl - Caminho para o arquivo .obj
 * @returns {Promise<Object>} Modelo com vértices, normais, cores por vértice e materiais
 */
async function carregarOBJComMTL(objUrl) {
    const response = await fetch(objUrl);
    const text = await response.text();

    // Base URL para resolver caminhos do MTL
    const baseUrl = objUrl.substring(0, objUrl.lastIndexOf('/') + 1);

    // Procura a linha 'mtllib' no OBJ para encontrar o arquivo MTL
    let mtlFile = null;
    const linhas = text.split('\n');
    for (const linha of linhas) {
        if (linha.trim().startsWith('mtllib')) {
            mtlFile = linha.trim().split(/\s+/)[1];
            break;
        }
    }

    // Carrega o MTL se encontrado
    let materials = {};
    if (mtlFile) {
        // CORREÇÃO: Encode URI component para lidar com espaços (Room empty)
        const encodedMtlFile = encodeURIComponent(mtlFile);
        const mtlUrl = baseUrl + mtlFile; // O browser lida com espaços na URL geralmente, mas...

        console.log(`Carregando MTL: ${mtlUrl}`);
        try {
            materials = await carregarMTL(mtlUrl);
            if (Object.keys(materials).length === 0) {
                console.error(`AVISO CRÍTICO: Arquivo MTL ${mtlUrl} carregou mas não retornou materiais!`);
            } else {
                console.log(`Sucesso: ${mtlUrl} carregou ${Object.keys(materials).length} materiais.`);
            }
        } catch (e) {
            console.error(`ERRO FATAL ao carregar MTL: ${mtlUrl}`, e);
        }
    }

    // Parseia o OBJ com suporte a materiais
    const modelo = parsearOBJComMateriais(text, materials);
    modelo.materials = materials;

    return modelo;
}

/**
 * Carrega e parseia um arquivo OBJ, normalizando-o automaticamente
 * Centraliza na origem e escala para caber em um cubo unitário
 * @param {string} url - Caminho para o arquivo .obj
 * @returns {Promise<Object>} Objeto normalizado com vértices, normais, texturas e índices
 */
async function carregarOBJNormalizado(url) {
    const response = await fetch(url);
    const text = await response.text();
    const modelo = parsearOBJ(text);
    return normalizarModelo(modelo);
}

/**
 * Normaliza um modelo: centraliza na origem e escala para caber em um cubo unitário
 * @param {Object} modelo - Modelo parseado do OBJ
 * @returns {Object} Modelo normalizado
 */
function normalizarModelo(modelo) {
    const vertices = modelo.vertices;
    const numVertices = vertices.length / 3;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < numVertices; i++) {
        minX = Math.min(minX, vertices[i * 3]);
        minY = Math.min(minY, vertices[i * 3 + 1]);
        minZ = Math.min(minZ, vertices[i * 3 + 2]);
        maxX = Math.max(maxX, vertices[i * 3]);
        maxY = Math.max(maxY, vertices[i * 3 + 1]);
        maxZ = Math.max(maxZ, vertices[i * 3 + 2]);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const maxSize = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
    const scaleFactor = maxSize > 0 ? 1.0 / maxSize : 1.0;

    const normalizedVertices = new Float32Array(vertices.length);
    for (let i = 0; i < numVertices; i++) {
        normalizedVertices[i * 3] = (vertices[i * 3] - centerX) * scaleFactor;
        normalizedVertices[i * 3 + 1] = (vertices[i * 3 + 1] - centerY) * scaleFactor;
        normalizedVertices[i * 3 + 2] = (vertices[i * 3 + 2] - centerZ) * scaleFactor;
    }

    return {
        vertices: normalizedVertices,
        normais: modelo.normais,
        texturas: modelo.texturas,
        cores: modelo.cores, // <--- LINHA VITAL ADICIONADA: REPASSA AS CORES DO MTL
        indices: modelo.indices,
        numVertices: modelo.numVertices,
        numFaces: modelo.numFaces
    };
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

/**
 * Parseia OBJ com suporte a materiais MTL
 * Gera cores por vértice baseado no material ativo
 * @param {string} objText - Conteúdo do arquivo OBJ
 * @param {Object} materials - Materiais carregados do MTL
 * @returns {Object} Modelo com cores por vértice
 */
function parsearOBJComMateriais(objText, materials) {
    const tempVertices = [];
    const tempNormais = [];
    const tempTexturas = [];

    const vertices = [];
    const normais = [];
    const texturas = [];
    const cores = [];  // Novo: cores por vértice
    const indices = [];

    const vertexCache = {};
    let indexCounter = 0;

    // Material atual
    let currentMaterial = null;
    let currentColor = [0.5, 0.5, 0.5];  // Cor padrão cinza

    const linhas = objText.split('\n');

    for (let linha of linhas) {
        linha = linha.trim();
        if (linha.startsWith('#') || linha.length === 0) continue;

        const partes = linha.split(/\s+/);
        const tipo = partes[0];

        switch (tipo) {
            case 'v':
                tempVertices.push([
                    parseFloat(partes[1]),
                    parseFloat(partes[2]),
                    parseFloat(partes[3])
                ]);
                break;

            case 'vn':
                tempNormais.push([
                    parseFloat(partes[1]),
                    parseFloat(partes[2]),
                    parseFloat(partes[3])
                ]);
                break;

            case 'vt':
                tempTexturas.push([
                    parseFloat(partes[1]),
                    parseFloat(partes[2] || 0)
                ]);
                break;

            case 'usemtl':
                // Troca de material
                currentMaterial = partes[1];
                if (materials[currentMaterial]) {
                    currentColor = materials[currentMaterial].diffuse;
                } else {
                    currentColor = [0.5, 0.5, 0.5];
                }
                break;

            case 'f':
                const faceVertices = partes.slice(1);
                for (let i = 1; i < faceVertices.length - 1; i++) {
                    processarVertice(faceVertices[0]);
                    processarVertice(faceVertices[i]);
                    processarVertice(faceVertices[i + 1]);
                }
                break;
        }
    }

    function processarVertice(vertexStr) {
        // Chave única inclui material atual
        const cacheKey = vertexStr + '_' + currentMaterial;

        if (vertexCache[cacheKey] !== undefined) {
            indices.push(vertexCache[cacheKey]);
            return;
        }

        const partes = vertexStr.split('/');
        const vIdx = parseInt(partes[0]) - 1;
        const vtIdx = partes[1] ? parseInt(partes[1]) - 1 : -1;
        const vnIdx = partes[2] ? parseInt(partes[2]) - 1 : -1;

        if (tempVertices[vIdx]) {
            vertices.push(...tempVertices[vIdx]);
        }

        if (vtIdx >= 0 && tempTexturas[vtIdx]) {
            texturas.push(...tempTexturas[vtIdx]);
        } else {
            texturas.push(0, 0);
        }

        if (vnIdx >= 0 && tempNormais[vnIdx]) {
            normais.push(...tempNormais[vnIdx]);
        } else {
            normais.push(0, 1, 0);
        }

        // Adiciona cor do material atual
        cores.push(...currentColor);

        vertexCache[cacheKey] = indexCounter;
        indices.push(indexCounter);
        indexCounter++;
    }

    console.log(`OBJ parseado com materiais: ${vertices.length / 3} vértices, ${indices.length / 3} faces`);

    return {
        vertices: new Float32Array(vertices),
        normais: new Float32Array(normais),
        texturas: new Float32Array(texturas),
        cores: new Float32Array(cores),
        indices: new Uint16Array(indices),
        numVertices: vertices.length / 3,
        numFaces: indices.length / 3
    };
}

/**
 * Cria buffers WebGL para modelo com cores
 * @param {WebGLRenderingContext} gl - Contexto WebGL
 * @param {Object} modelo - Modelo com cores
 * @returns {Object} Buffers prontos para renderização
 */
function criarBuffersOBJComCores(gl, modelo) {
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelo.vertices, gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelo.normais, gl.STATIC_DRAW);

    const texturaBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texturaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelo.texturas, gl.STATIC_DRAW);

    // Buffer de cores
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelo.cores, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelo.indices, gl.STATIC_DRAW);

    return {
        vertices: vertexBuffer,
        normais: normalBuffer,
        texturas: texturaBuffer,
        cores: colorBuffer,
        indices: indexBuffer,
        numIndices: modelo.indices.length,
        hasCores: true
    };
}

/**
 * Desenha um modelo OBJ com cores por vértice
 * @param {WebGLRenderingContext} gl - Contexto WebGL
 * @param {Object} buffers - Buffers do modelo
 * @param {WebGLProgram} program - Programa shader
 */
function desenharOBJComCores(gl, buffers, program) {
    // Conecta vértices
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
    const posLoc = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    // Conecta normais
    const normalLoc = gl.getAttribLocation(program, "aVertexNormal");
    if (normalLoc >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normais);
        gl.enableVertexAttribArray(normalLoc);
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Conecta cores
    const colorLoc = gl.getAttribLocation(program, "aVertexColor");
    if (colorLoc >= 0 && buffers.cores) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cores);
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Desenha
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.drawElements(gl.TRIANGLES, buffers.numIndices, gl.UNSIGNED_SHORT, 0);
}
