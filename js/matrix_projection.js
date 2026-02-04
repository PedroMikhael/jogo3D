/**
 * Matrizes de Projeção e Câmera
 * Funções para criar matrizes de projeção perspectiva, ortográfica e view (lookAt)
 * 
 * Inclui funções do professor: createPerspective e createCamera
 */

/**
 * Cria uma Matriz de Projeção Perspectiva (Frustum)
 */
function calculaMatrizProjecao(left, right, bottom, top, near, far) {
    const out = mat4.create();

    out[0] = (2 * near) / (right - left);
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;

    out[4] = 0;
    out[5] = (2 * near) / (top - bottom);
    out[6] = 0;
    out[7] = 0;

    out[8] = (right + left) / (right - left);
    out[9] = (top + bottom) / (top - bottom);
    out[10] = -(far + near) / (far - near);
    out[11] = -1;

    out[12] = 0;
    out[13] = 0;
    out[14] = -(2 * far * near) / (far - near);
    out[15] = 0;

    return out;
}

/**
 * Cria uma matriz de projeção perspectiva usando gl-matrix
 */
function calculaProjecaoPerspectivaSimples(fovy, aspect, near, far) {
    const out = mat4.create();
    mat4.perspective(out, fovy, aspect, near, far);
    return out;
}

/**
 * Cria uma matriz de projeção perspectiva (radianos)
 */
function perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / (near - far), -1,
        0, 0, (2 * far * near) / (near - far), 0
    ]);
}

/**
 * Cria uma matriz de projeção perspectiva usando graus (estilo do professor)
 * Equivalente a: createPerspective do código do professor
 * @param {number} fovy - Campo de visão vertical em GRAUS
 * @param {number} aspect - Proporção largura/altura
 * @param {number} near - Plano de corte próximo
 * @param {number} far - Plano de corte distante
 */
function createPerspective(fovy, aspect, near, far) {
    // Converte graus para radianos
    var fovRad = fovy * Math.PI / 180.0;

    var fy = 1 / Math.tan(fovRad / 2.0);
    var fx = fy / aspect;
    var B = (2 * far * near) / (near - far);
    var A = (far + near) / (near - far);

    // Retorna em formato coluna-major para WebGL
    return new Float32Array([
        fx, 0.0, 0.0, 0.0,
        0.0, fy, 0.0, 0.0,
        0.0, 0.0, A, -1.0,
        0.0, 0.0, B, 0.0
    ]);
}

/**
 * Cria uma matriz de projeção ortográfica
 */
function ortho(left, right, bottom, top, near, far) {
    return new Float32Array([
        2 / (right - left), 0, 0, 0,
        0, 2 / (top - bottom), 0, 0,
        0, 0, -2 / (far - near), 0,
        -(right + left) / (right - left),
        -(top + bottom) / (top - bottom),
        -(far + near) / (far - near),
        1
    ]);
}

/**
 * Cria uma matriz de visualização (View Matrix)
 * @param {Array} eye - Posição da câmera
 * @param {Array} center - Ponto para onde a câmera olha
 * @param {Array} up - Vetor "para cima" da câmera
 */
function lookAt(eye, center, up) {
    const zx = eye[0] - center[0];
    const zy = eye[1] - center[1];
    const zz = eye[2] - center[2];
    let zlen = Math.hypot(zx, zy, zz);
    const z = [zx / zlen, zy / zlen, zz / zlen];

    const xx = up[1] * z[2] - up[2] * z[1];
    const xy = up[2] * z[0] - up[0] * z[2];
    const xz = up[0] * z[1] - up[1] * z[0];
    let xlen = Math.hypot(xx, xy, xz);
    const x = [xx / xlen, xy / xlen, xz / xlen];

    const y = [
        z[1] * x[2] - z[2] * x[1],
        z[2] * x[0] - z[0] * x[2],
        z[0] * x[1] - z[1] * x[0]
    ];

    return new Float32Array([
        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,
        -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
        -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
        -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
        1
    ]);
}

/**
 * Cria uma matriz de câmera (estilo do professor)
 * Equivalente a: createCamera do código do professor
 * Nota: Esta versão NÃO requer math.js
 * @param {Array} pos - Posição da câmera [x, y, z]
 * @param {Array} target - Ponto alvo [x, y, z]
 * @param {Array} up - Vetor up [x, y, z]
 */
function createCamera(pos, target, up) {
    // Esta função é equivalente ao lookAt
    return lookAt(pos, target, up);
}
