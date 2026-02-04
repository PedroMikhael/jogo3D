/**
 * Parser de arquivos MTL (Material Template Library)
 * Carrega materiais e texturas dos modelos OBJ
 */

/**
 * Carrega e parseia um arquivo MTL
 * @param {string} url - Caminho para o arquivo .mtl
 * @returns {Promise<Object>} Objeto com materiais parseados
 */
async function carregarMTL(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`MTL não encontrado: ${url}`);
            return {};
        }
        const text = await response.text();
        return parsearMTL(text, url);
    } catch (error) {
        console.warn(`Erro ao carregar MTL: ${url}`, error);
        return {};
    }
}

/**
 * Parseia o conteúdo de texto de um arquivo MTL
 * @param {string} mtlText - Conteúdo do arquivo MTL
 * @param {string} mtlUrl - URL do arquivo MTL (para resolver caminhos de texturas)
 * @returns {Object} Dicionário de materiais
 */
function parsearMTL(mtlText, mtlUrl = '') {
    const materials = {};
    let currentMaterial = null;

    // Base URL para resolver caminhos de texturas
    const baseUrl = mtlUrl.substring(0, mtlUrl.lastIndexOf('/') + 1);

    const linhas = mtlText.split('\n');

    for (let linha of linhas) {
        linha = linha.trim();

        // Ignora comentários e linhas vazias
        if (linha.startsWith('#') || linha.length === 0) continue;

        const partes = linha.split(/\s+/);
        const comando = partes[0];

        switch (comando) {
            case 'newmtl':
                // Novo material
                currentMaterial = partes[1];
                materials[currentMaterial] = {
                    name: currentMaterial,
                    // Cores padrão
                    ambient: [0.1, 0.1, 0.1],      // Ka
                    diffuse: [0.8, 0.8, 0.8],      // Kd
                    specular: [1.0, 1.0, 1.0],     // Ks
                    emissive: [0.0, 0.0, 0.0],     // Ke
                    shininess: 32.0,               // Ns
                    opacity: 1.0,                  // d ou Tr
                    illum: 2,                      // Modelo de iluminação
                    // Texturas
                    diffuseMap: null,              // map_Kd
                    specularMap: null,             // map_Ks
                    bumpMap: null,                 // map_Bump ou bump
                    normalMap: null                // map_Kn
                };
                break;

            case 'Ka':
                // Cor ambiente
                if (currentMaterial) {
                    materials[currentMaterial].ambient = [
                        parseFloat(partes[1]),
                        parseFloat(partes[2]),
                        parseFloat(partes[3])
                    ];
                }
                break;

            case 'Kd':
                // Cor difusa
                if (currentMaterial) {
                    materials[currentMaterial].diffuse = [
                        parseFloat(partes[1]),
                        parseFloat(partes[2]),
                        parseFloat(partes[3])
                    ];
                }
                break;

            case 'Ks':
                // Cor especular
                if (currentMaterial) {
                    materials[currentMaterial].specular = [
                        parseFloat(partes[1]),
                        parseFloat(partes[2]),
                        parseFloat(partes[3])
                    ];
                }
                break;

            case 'Ke':
                // Cor emissiva
                if (currentMaterial) {
                    materials[currentMaterial].emissive = [
                        parseFloat(partes[1]),
                        parseFloat(partes[2]),
                        parseFloat(partes[3])
                    ];
                }
                break;

            case 'Ns':
                // Expoente especular (shininess)
                if (currentMaterial) {
                    materials[currentMaterial].shininess = parseFloat(partes[1]);
                }
                break;

            case 'd':
                // Opacidade (dissolve)
                if (currentMaterial) {
                    materials[currentMaterial].opacity = parseFloat(partes[1]);
                }
                break;

            case 'Tr':
                // Transparência (inverso de d)
                if (currentMaterial) {
                    materials[currentMaterial].opacity = 1.0 - parseFloat(partes[1]);
                }
                break;

            case 'illum':
                // Modelo de iluminação
                if (currentMaterial) {
                    materials[currentMaterial].illum = parseInt(partes[1]);
                }
                break;

            case 'map_Kd':
                // Textura difusa
                if (currentMaterial) {
                    materials[currentMaterial].diffuseMap = baseUrl + partes.slice(1).join(' ');
                }
                break;

            case 'map_Ks':
                // Textura especular
                if (currentMaterial) {
                    materials[currentMaterial].specularMap = baseUrl + partes.slice(1).join(' ');
                }
                break;

            case 'map_Bump':
            case 'bump':
                // Bump/Normal map
                if (currentMaterial) {
                    materials[currentMaterial].bumpMap = baseUrl + partes.slice(1).join(' ');
                }
                break;

            case 'Ni':
                // Índice de refração (ignorado por enquanto)
                break;

            case 'Tf':
                // Transmission filter (ignorado por enquanto)
                break;
        }
    }

    console.log(`MTL parseado: ${Object.keys(materials).length} materiais encontrados`);
    return materials;
}

/**
 * Carrega todas as texturas de um conjunto de materiais
 * @param {WebGLRenderingContext} gl - Contexto WebGL
 * @param {Object} materials - Materiais parseados do MTL
 * @returns {Promise<Object>} Materiais com texturas WebGL carregadas
 */
async function carregarTexturasMTL(gl, materials) {
    const promises = [];

    for (const matName in materials) {
        const mat = materials[matName];

        if (mat.diffuseMap) {
            promises.push(
                carregarTextura(gl, mat.diffuseMap)
                    .then(tex => { mat.diffuseTexture = tex; })
                    .catch(err => { console.warn(`Textura não carregada: ${mat.diffuseMap}`); })
            );
        }
    }

    await Promise.all(promises);
    return materials;
}

/**
 * Obtém a cor difusa de um material como array RGB normalizado
 * @param {Object} material - Material parseado
 * @returns {Array} Cor RGB [r, g, b] entre 0 e 1
 */
function getMaterialColor(material) {
    if (!material) return [0.5, 0.5, 0.5];
    return material.diffuse || [0.5, 0.5, 0.5];
}
