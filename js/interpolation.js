/**
 * Funções de Interpolação para Z-Buffer
 * Utilizadas para cálculos de profundidade durante a renderização
 */

/**
 * Calcula a interpolação de Z em uma linha de varrimento (Página 14).
 * @param {number} z1 - Valor de Z no primeiro ponto
 * @param {number} z2 - Valor de Z no segundo ponto
 * @param {number} y1 - Coordenada Y do primeiro ponto
 * @param {number} y2 - Coordenada Y do segundo ponto
 * @param {number} ys - Coordenada Y do ponto a interpolar
 */
function interpolaZ(z1, z2, y1, y2, ys) {
    return (z1 * (ys - y2) + z2 * (y1 - ys)) / (y1 - y2);
}

/**
 * Calcula o Zp final entre dois pontos a e b (Página 14).
 * @param {number} za - Valor de Z no ponto a
 * @param {number} zb - Valor de Z no ponto b
 * @param {number} xa - Coordenada X do ponto a
 * @param {number} xb - Coordenada X do ponto b
 * @param {number} xp - Coordenada X do ponto a interpolar
 */
function calculaZp(za, zb, xa, xb, xp) {
    return (zb * (xp - xa) + za * (xb - xp)) / (xb - xa);
}
