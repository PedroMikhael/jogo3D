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

    uniform vec3 uLightPos;   
    uniform vec3 uLightDir;   
    uniform float uCutOff;    

    out vec4 fragColor;

    void main() {
        vec3 normal = normalize(vNormal);
        vec3 color;

        // 1. COR BASE
        if (uIsKey == 1 || uUseMTLColor == 1) {
            color = (length(vColor) > 0.01) ? vColor : vec3(0.5);
        } else {
            vec2 uv = (abs(normal.x) > 0.5) ? vWorldPos.zy : vWorldPos.xz;
            color = texture(uStoneTexture, uv * 2.0).rgb;
        }

        // 2. CÁLCULO DA LANTERNA (SPOTLIGHT CORRIGIDO)
        
        // Empurramos a origem da luz um pouco para frente do 'rosto' para não sumir ao encostar na parede
        vec3 lightForward = normalize(uLightDir);
        vec3 lightOrigin = uLightPos + (lightForward * 0.1); 

        // Vetor que vai do fragmento (parede) para a luz
        vec3 dirParaLuz = normalize(lightOrigin - vWorldPos); 
        
        // Direção para onde a lanterna aponta (invertida para o cálculo de produto escalar)
        vec3 spotDir = normalize(-uLightDir);

        // Cosseno do ângulo entre a direção da lanterna e o fragmento
        float theta = dot(dirParaLuz, spotDir);
        
        float ambient = 0.10; // Um pouco mais escuro para o terror
        float spotlight = 0.0;

        if(theta > uCutOff) {
            // Iluminação difusa (Lambert)
            // Invertemos dirParaLuz para o dot product ficar positivo na face correta
            float diff = max(dot(normal, dirParaLuz), 0.0);
            
            // Atenuação (Suavizada para não apagar bruscamente)
            float dist = distance(lightOrigin, vWorldPos);
            float attenuation = 1.0 / (1.0 + 0.3 * dist + 0.1 * (dist * dist));
            
            // Efeito de suavização na borda do círculo (Penumbra)
            float intensity = clamp((theta - uCutOff) / 0.1, 0.0, 1.0);
            
            spotlight = diff * attenuation * intensity * 4.0; // Aumentei a força (4.0)
        }

        vec3 finalColor = color * (ambient + spotlight);
        
        // 3. EFEITO DE NEVOEIRO (FOG)
        // Isso impede que você veja o final do labirinto sem luz
        float fog = exp(-0.6 * distance(uLightPos, vWorldPos));
        finalColor *= clamp(fog, 0.0, 1.0);

        fragColor = vec4(finalColor, 1.0);
    }
`;