/**
 * Operações Básicas de Matrizes 4x4
 * Funções fundamentais para criar e manipular matrizes de transformação
 */

/**
 * Cria uma matriz identidade 4x4
 */
function mat4Identity() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

/**
 * Cria uma matriz de translação
 */
function mat4Translate(x, y, z) {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ]);
}

/**
 * Transformação de Escala
 */
function mat4Scale(sx, sy, sz) {
    return new Float32Array([
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0, 1
    ]);
}

/**
 * Multiplicação de duas matrizes 4x4
 */
function multiplyMatrices(a, b) {
    let out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            out[i * 4 + j] = a[i * 4 + 0] * b[0 * 4 + j] +
                a[i * 4 + 1] * b[1 * 4 + j] +
                a[i * 4 + 2] * b[2 * 4 + j] +
                a[i * 4 + 3] * b[3 * 4 + j];
        }
    }
    return out;
}
