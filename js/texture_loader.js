/**
 * Módulo de carregamento de texturas (baseado no código do professor)
 * Carrega imagens e envia para a GPU como texturas WebGL
 */

// Array de imagens carregadas (padrão do professor)
var texImages = [];
var loadedTexCount = 0;

/**
 * Carrega múltiplas texturas e chama callback quando todas estiverem prontas
 * (Padrão do professor)
 * @param {string[]} texSources - Array de URLs das texturas
 * @param {function} onAllLoaded - Callback chamado quando todas carregarem
 */
function loadTexturesFromSources(texSources, onAllLoaded) {
    loadedTexCount = 0;
    texImages = [];

    for (var i = 0; i < texSources.length; i++) {
        texImages[i] = new Image();
        texImages[i].src = texSources[i];
        texImages[i].onload = function () {
            loadedTexCount++;
            console.log("Textura carregada: " + loadedTexCount + "/" + texSources.length);
            if (loadedTexCount == texSources.length) {
                onAllLoaded(texImages);
            }
        };
        texImages[i].onerror = function () {
            console.error("Erro ao carregar textura: " + this.src);
        };
    }
}

/**
 * Envia uma imagem para a GPU como textura (padrão do professor)
 * @param {WebGLRenderingContext} gl - Contexto WebGL
 * @param {Image} image - Imagem carregada
 * @param {number} textureUnit - Unidade de textura (0, 1, 2, etc.)
 * @returns {WebGLTexture} - Textura criada
 */
function createTextureFromImage(gl, image, textureUnit) {
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Configuração de parâmetros (estilo do professor)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Envia imagem para a GPU
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    return tex;
}

/**
 * Configura textura para repetir (tiling) - útil para paredes
 * @param {WebGLRenderingContext} gl - Contexto WebGL
 * @param {WebGLTexture} texture - Textura a configurar
 */
function setTextureRepeat(gl, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

/**
 * Carrega uma imagem e cria uma textura WebGL (versão async/await)
 * @param {WebGLRenderingContext} gl - Contexto WebGL
 * @param {string} url - URL da imagem
 * @returns {Promise<WebGLTexture>} - Textura WebGL
 */
async function carregarTextura(gl, url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";

        image.onload = () => {
            const texture = createTextureFromImage(gl, image, 0);

            // Configura para repetir (útil para paredes)
            setTextureRepeat(gl, texture);

            console.log(`Textura carregada: ${url} (${image.width}x${image.height})`);
            resolve(texture);
        };

        image.onerror = () => {
            console.error(`Erro ao carregar textura: ${url}`);
            reject(new Error(`Falha ao carregar: ${url}`));
        };

        image.src = url;
    });
}

/**
 * Verifica se um número é potência de 2
 */
function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}
