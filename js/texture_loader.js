/**
 * Módulo de carregamento de texturas
 * Consolida as melhorias da branch 'main' com a estrutura da 'mapa'
 */

var texImages = [];
var loadedTexCount = 0;

/**
 * Carrega múltiplas texturas (Padrão do professor)
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
 * Envia uma imagem para a GPU como textura 
 * IMPORTANTE: Usa configurações da branch MAIN (MIPMAP + REPEAT)
 */
function createTextureFromImage(gl, image, textureUnit) {
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Garante que a textura repita sem distorção
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    
    // Filtro LINEAR_MIPMAP_LINEAR remove o pixelado de longe
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // ESSENCIAL: Gera as versões menores da imagem para suavizar
    gl.generateMipmap(gl.TEXTURE_2D); 

    return tex;
}

/**
 * Força a repetição da textura (útil para atualizar texturas existentes)
 */
function setTextureRepeat(gl, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

/**
 * Carrega uma imagem e cria uma textura WebGL (Versão moderna Async)
 */
async function carregarTextura(gl, url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";

        image.onload = () => {
            const texture = createTextureFromImage(gl, image, 0);
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
 * Verifica se um número é potência de 2 (Otimização de GPU)
 */
function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}