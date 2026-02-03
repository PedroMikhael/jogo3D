/**
 * Transformações de Rotação 4x4
 * Matrizes para rotação nos eixos X, Y e Z
 * 
 * Formato compatível com o código do professor:
 * matrotX, matrotY, matrotZ
 */

/**
 * Converte graus para radianos
 */
function degreesToRadians(degrees) {
    return degrees * Math.PI / 180.0;
}

/**
 * Transformação de Pitch - Rotação em X (radianos)
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
 * Transformação de Yaw - Rotação em Y (radianos)
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
 * Transformação de Roll - Rotação em Z (radianos)
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

/**
 * Rotação em X usando graus (estilo do professor)
 * Equivalente a: matrotX do código do professor
 */
function mat4RotateXDegrees(angleDegrees) {
    return mat4RotateX(degreesToRadians(angleDegrees));
}

/**
 * Rotação em Y usando graus (estilo do professor)
 * Equivalente a: matrotY do código do professor
 */
function mat4RotateYDegrees(angleDegrees) {
    return mat4RotateY(degreesToRadians(angleDegrees));
}

/**
 * Rotação em Z usando graus (estilo do professor)
 * Equivalente a: matrotZ do código do professor
 */
function mat4RotateZDegrees(angleDegrees) {
    return mat4RotateZ(degreesToRadians(angleDegrees));
}
