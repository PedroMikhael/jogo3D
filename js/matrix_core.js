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
 * Multiplicação de duas matrizes 4x4 (column-major order - WebGL)
 * Resultado: a * b (aplica b primeiro, depois a)
 */
function multiplyMatrices(a, b) {
    let out = new Float32Array(16);

    // Column-major: out[col * 4 + row]
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            out[col * 4 + row] =
                a[0 * 4 + row] * b[col * 4 + 0] +
                a[1 * 4 + row] * b[col * 4 + 1] +
                a[2 * 4 + row] * b[col * 4 + 2] +
                a[3 * 4 + row] * b[col * 4 + 3];
        }
    }
    return out;
}
