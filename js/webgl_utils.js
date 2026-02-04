/**
 * Funções utilitárias WebGL (código do professor)
 * Gerencia contexto, shaders e programas
 */

/**
 * Obtém o contexto WebGL do canvas
 * @param {HTMLCanvasElement} canvas - Elemento canvas
 * @returns {WebGLRenderingContext|false} - Contexto WebGL ou false se não disponível
 */
function getGL(canvas) {
    var gl = canvas.getContext("webgl2");
    if (gl) return gl;

    var gl = canvas.getContext("webgl");
    if (gl) return gl;

    gl = canvas.getContext("experimental-webgl");
    if (gl) return gl;

    alert("Contexto WebGL inexistente! Troque de navegador!");
    return false;
}

/**
 * Cria e compila um shader
 * @param {WebGLRenderingContext} gl - Contexto WebGL
 * @param {number} shaderType - Tipo do shader (gl.VERTEX_SHADER ou gl.FRAGMENT_SHADER)
 * @param {string} shaderSrc - Código fonte do shader
 * @returns {WebGLShader|undefined} - Shader compilado ou undefined se erro
 */
function createShader(gl, shaderType, shaderSrc) {
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSrc);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        return shader;

    console.error("Erro de compilação: " + gl.getShaderInfoLog(shader));
    alert("Erro de compilação: " + gl.getShaderInfoLog(shader));

    gl.deleteShader(shader);
}

/**
 * Cria e linka um programa de shaders
 * @param {WebGLRenderingContext} gl - Contexto WebGL
 * @param {WebGLShader} vtxShader - Vertex shader compilado
 * @param {WebGLShader} fragShader - Fragment shader compilado
 * @returns {WebGLProgram|undefined} - Programa linkado ou undefined se erro
 */
function createProgram(gl, vtxShader, fragShader) {
    var prog = gl.createProgram();
    gl.attachShader(prog, vtxShader);
    gl.attachShader(prog, fragShader);
    gl.linkProgram(prog);

    if (gl.getProgramParameter(prog, gl.LINK_STATUS))
        return prog;

    console.error("Erro de linkagem: " + gl.getProgramInfoLog(prog));
    alert("Erro de linkagem: " + gl.getProgramInfoLog(prog));

    gl.deleteProgram(prog);
}

/**
 * Função auxiliar para criar programa a partir de strings de shader
 * @param {WebGLRenderingContext} gl - Contexto WebGL
 * @param {string} vtxShSrc - Código fonte do vertex shader
 * @param {string} fragShSrc - Código fonte do fragment shader
 * @returns {WebGLProgram|undefined} - Programa linkado
 */
function createProgramFromSources(gl, vtxShSrc, fragShSrc) {
    var vtxShader = createShader(gl, gl.VERTEX_SHADER, vtxShSrc);
    var fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragShSrc);

    if (!vtxShader || !fragShader) return undefined;

    return createProgram(gl, vtxShader, fragShader);
}
