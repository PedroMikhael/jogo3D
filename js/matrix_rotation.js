/**
 * Transformações de Rotação 4x4
 * Matrizes para rotação nos eixos X, Y e Z
 */

/**
 * Transformação de Pitch - Rotação em X
 */
function mat4RotateX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ]);
}

/**
 * Transformação de Yaw - Rotação em Y
 */
function mat4RotateY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ]);
}

/**
 * Transformação de Roll - Rotação em Z
 */
function mat4RotateZ(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}
