// Vertex Shader: Processa a posição baseada nas matrizes de visualização do professor
const vsSource = `#version 300 es
    in vec4 aVertexPosition;
    
    uniform mat4 uModelViewMatrix; // Matriz M_vis calculada no JS
    uniform mat4 uProjectionMatrix;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
`;

const fsSource = `#version 300 es
    precision highp float;
    out vec4 fragColor;
    void main() {
        fragColor = vec4(1.0, 1.0, 1.0, 1.0); // Branco sólido inicial
    }
`;