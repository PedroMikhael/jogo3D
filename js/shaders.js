const vsSource = `#version 300 es
    precision highp float;

    in vec4 aVertexPosition;
    in vec3 aVertexNormal;
    in vec3 aVertexColor;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float uTime;
    uniform highp int uIsGrass; // Adicionado highp aqui

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
        
        // Transformação da normal para o espaço da câmera
        vNormal = mat3(uModelViewMatrix) * aVertexNormal;
        
        // Posição no espaço da câmera (View Space)
        vWorldPos = (uModelViewMatrix * aVertexPosition).xyz; 
        vColor = aVertexColor;
        
        gl_Position = uProjectionMatrix * uModelViewMatrix * pos;
    }
`;


const fsSource = `#version 300 es
    precision highp float;
    precision highp int;

    in vec3 vNormal;
    in vec3 vWorldPos;
    in vec3 vColor;
    
    uniform highp int uIsKey;
    uniform highp int uIsGrass;
    uniform highp int uUseMTLColor;
    uniform sampler2D uStoneTexture;
    uniform float uLightIntensity;
    uniform float uCutOff;

    out vec4 fragColor;

    void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(-vWorldPos); 
        
        vec3 baseColor;

        // 1. COR DO OBJETO
        if (uUseMTLColor == 1) {
            baseColor = vColor;
        } else {
            // Mapeamento UV para paredes e chão
            vec2 uv = (abs(N.y) > 0.5) ? vWorldPos.xz : vWorldPos.xy;
            baseColor = texture(uStoneTexture, uv * 1.5).rgb;

            if (uIsGrass == 1) {
                // Multiplica a textura por um verde escuro de floresta
                baseColor *= vec3(0.2, 0.5, 0.2); 
            }
        }

        // 2. COR DA LUZ (Tom amarelado/quente de lanterna)
        vec3 lightColor = vec3(1.0, 0.9, 0.6); // Luz levemente âmbar

        // 3. ILUMINAÇÃO DE PHONG
        float theta = dot(normalize(vWorldPos), vec3(0.0, 0.0, -1.0));
        
        // Ambient (Azulado bem escuro para simular a noite nas sombras)
        vec3 ambient = vec3(0.01, 0.01, 0.02) * baseColor;
        vec3 diffuse = vec3(0.0);

        if(theta > uCutOff) {
            float diffFactor = max(dot(N, L), 0.0);
            
            float dist = length(vWorldPos);
            // Atenuação ajustada para o clima de terror
            float attenuation = 1.0 / (1.0 + 0.8 * dist + 1.0 * (dist * dist));
            
            float spotIntensity = clamp((theta - uCutOff) / 0.1, 0.0, 1.0);
            
            // Multiplicamos pela cor da luz (lightColor)
            diffuse = baseColor * lightColor * diffFactor * attenuation * spotIntensity * 3.0 * uLightIntensity;
        }

        // 4. RESULTADO FINAL + FOG (Nevoeiro)
        vec3 finalColor = ambient + diffuse;
        
        // Nevoeiro escuro
        float fog = exp(-0.8 * length(vWorldPos));
        
        fragColor = vec4(finalColor * fog, 1.0);
    }
`;