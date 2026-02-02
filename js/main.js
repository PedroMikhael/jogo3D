let gl;

function iniciaWebGL() {
    const canvas = document.querySelector("#meuCanvas");
    gl = canvas.getContext("webgl2"); 

    if (!gl) {
        alert("WebGL não suportado!");
        return;
    }

    // Ajusta o tamanho do desenho ao tamanho da janela
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    console.log("Sistema pronto!");
}

window.onload = iniciaWebGL;