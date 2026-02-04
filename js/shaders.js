const vsSource = `#version 300 es
    precision highp float;

    in vec4 aVertexPosition;
    in vec3 aVertexNormal;
    in vec3 aVertexColor;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float uTime;
    uniform int uIsGrass;

    out vec3 vNormal;
    out vec3 vWorldPos;
    out vec3 vColor;

    void main() {
        vec4 pos = aVertexPosition;
        
        if (uIsGrass == 1) {
            float height = pos.y;
            if (height > 0.0) {
                float windX = sin(uTime * 2.0 + pos.x * 3.0) * 0.03 * height;
                pos.x += windX;
            }
        }
        
        // vWorldPos precisa ser a posição no mundo para a lanterna funcionar
        // Como o uModelViewMatrix já inclui a câmera, vamos usar apenas a posição do vértice
        vWorldPos = aVertexPosition.xyz; 
        vNormal = aVertexNormal;
        vColor = aVertexColor;
        
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
`;


const fsSource = `#version 300 es
    precision highp float;
    
    in vec3 vNormal;
    in vec3 vWorldPos;
    in vec3 vColor;
    
    uniform int uIsKey;
    uniform int uIsGrass;
    uniform int uUseMTLColor;
    uniform sampler2D uStoneTexture;

    // --- UNIFORMS DA LANTERNA ---
    uniform vec3 uLightPos;   // Posição da câmera (main.js passa cameraX, Y, Z)
    uniform vec3 uLightDir;   // Direção do olhar
    uniform float uCutOff;    // Ângulo do foco (coseno)

    out vec4 fragColor;

    void main() {
        vec3 normal = normalize(vNormal);
        vec3 color;

        // 1. DEFINIÇÃO DA COR BASE (Mantendo sua lógica de texturas/MTL)
        if (uIsKey == 1 || uUseMTLColor == 1) {
            color = (length(vColor) > 0.01) ? vColor : vec3(0.5);
        } else {
            // Textura para o labirinto
            vec2 uv = (abs(normal.x) > 0.5) ? vWorldPos.zy : vWorldPos.xz;
            color = texture(uStoneTexture, uv * 2.0).rgb;
        }

        // 2. CÁLCULO DA LANTERNA (SPOTLIGHT)
        vec3 lightDirToFrag = normalize(uLightPos - vWorldPos);
        float theta = dot(lightDirToFrag, normalize(-uLightDir));
        
        // Iluminação Ambiente (bem escura para clima de terror)
        float ambient = 0.05; 
        float spotlight = 0.0;

        // Se o fragmento estiver dentro do cone da lanterna
        if(theta > uCutOff) {
            float diff = max(dot(normal, lightDirToFrag), 0.0);
            
            // Atenuação por distância (luz enfraquece longe)
            float dist = distance(uLightPos, vWorldPos);
            float attenuation = 1.0 / (1.0 + 0.5 * dist + 0.2 * (dist * dist));
            
            spotlight = diff * attenuation * 2.5; // Força da lanterna
        }

        vec3 finalColor = color * (ambient + spotlight);
        
        // Efeito de "Fade" para o preto total no fundo do labirinto
        float fog = exp(-0.5 * distance(uLightPos, vWorldPos));
        finalColor *= clamp(fog, 0.0, 1.0);

        fragColor = vec4(finalColor, 1.0);
    }
`;