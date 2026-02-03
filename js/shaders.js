// Vertex Shader: Processa a posição e passa dados para o fragment
const vsSource = `#version 300 es
    in vec4 aVertexPosition;
    in vec3 aVertexNormal;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    out vec3 vNormal;
    out vec3 vWorldPos;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vNormal = aVertexNormal;
        vWorldPos = aVertexPosition.xyz;
    }
`;

const fsSource = `#version 300 es
    precision highp float;
    
    in vec3 vNormal;
    in vec3 vWorldPos;
    
    uniform int uIsGrass;
    uniform int uIsKey;
    
    out vec4 fragColor;
    
    void main() {
        vec3 normal = normalize(vNormal);
        
        // Cor da grama
        vec3 grassColor = vec3(0.2, 0.55, 0.15);
        float variation = sin(vWorldPos.x * 30.0) * cos(vWorldPos.z * 30.0) * 0.08;
        grassColor += vec3(variation * 0.3, variation, variation * 0.2);
        
        if (uIsKey == 1) {
            // É uma chave - cor dourada/amarela brilhante
            vec3 keyColor = vec3(1.0, 0.85, 0.2);
            
            // Adiciona brilho baseado na normal
            float shine = max(dot(normal, vec3(0.0, 1.0, 0.0)), 0.0);
            keyColor += vec3(shine * 0.3);
            
            fragColor = vec4(keyColor, 1.0);
        } else if (uIsGrass == 1) {
            // É o plano de grama
            fragColor = vec4(grassColor, 1.0);
        } else {
            // É o labirinto
            float isHorizontal = abs(normal.y);
            
            if (isHorizontal > 0.8) {
                if (vWorldPos.y > 0.0) {
                    // Topo das paredes - cinza claro
                    fragColor = vec4(0.8, 0.8, 0.85, 1.0);
                } else {
                    // Chão do labirinto - GRAMA
                    fragColor = vec4(grassColor, 1.0);
                }
            } else {
                // Parede lateral
                vec3 wallColor = vec3(0.5, 0.52, 0.7);
                wallColor.r += abs(normal.x) * 0.15;
                wallColor.b += abs(normal.z) * 0.1;
                fragColor = vec4(wallColor, 1.0);
            }
        }
    }
`;