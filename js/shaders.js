/**
 * js/shaders.js
 * Versão Corrigida: Mapeamento Triplanar para evitar esticamento + Luz Ambiente Global
 */

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
    out vec3 vViewPos;
    out vec3 vWorldPos;
    out vec3 vColor;

    void main() {
        vec4 pos = aVertexPosition;
        
        if (uIsGrass == 1 && pos.y > 0.0) {
            float windX = sin(uTime * 2.0 + pos.x * 3.0) * 0.03 * pos.y;
            pos.x += windX;
        }

        vec4 viewPos = uModelViewMatrix * pos;
        vViewPos = viewPos.xyz;
        vWorldPos = aVertexPosition.xyz;
        
        vNormal = mat3(uModelViewMatrix) * aVertexNormal;
        vColor = aVertexColor;
        
        gl_Position = uProjectionMatrix * viewPos;
    }
`;

const fsSource = `#version 300 es
    precision highp float;

    in vec3 vNormal;
    in vec3 vViewPos;
    in vec3 vWorldPos;
    in vec3 vColor;
    
    uniform int uIsKey;
    uniform int uUseMTLColor;
    uniform int uIsRoomObject;
    uniform sampler2D uStoneTexture;
    uniform float uLightIntensity; 
    uniform float uCutOff;

    out vec4 fragColor;
    
    void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(-vViewPos);
        vec3 L = V; 
        
        // --- LANTERNA SUAVE (CONE) ---
        vec3 cameraDir = vec3(0.0, 0.0, -1.0);
        float theta = dot(normalize(vViewPos), cameraDir);
        float intensity = smoothstep(uCutOff - 0.12, uCutOff, theta);

        // --- ILUMINAÇÃO DE PHONG (AJUSTADA PARA NÃO SER TÃO BRANCA) ---
        float diff = max(dot(N, L), 0.0);
        
        // Luz amarelada/incandescente para não ser um branco puro "chapado"
        vec3 lightColor = vec3(1.0, 0.98, 0.9); 
        
        // Especular (reflexo) muito mais suave
        vec3 R = reflect(-L, N);
        float spec = pow(max(dot(R, V), 0.0), 8.0);
// float ks = 0.15; (Removido para usar valor dinâmico abaixo)

        // --- TEXTURA TRIPLANAR BLINDADA (CORRIGE O ESTICAMENTO) ---
        vec3 baseColor;
        if (uUseMTLColor == 1 || uIsKey == 1 || uIsRoomObject == 1) {
            baseColor = (length(vColor) < 0.01) ? vec3(0.8) : vColor;
        } else {
            // Escala da textura (Aumentado para 2.0 para melhorar a resolução percebida)
            float scale = 2.0; 
            
            // Calcula o peso de cada face baseado na inclinação
            vec3 blending = abs(N);
            blending = normalize(max(blending, 0.00001)); 
            float bSum = blending.x + blending.y + blending.z;
            blending /= bSum;

            // Projeções nos 3 eixos (ignora a UV do arquivo e usa o espaço 3D real)
            vec3 xTex = texture(uStoneTexture, vWorldPos.zy * scale).rgb;
            vec3 yTex = texture(uStoneTexture, vWorldPos.xz * scale).rgb;
            vec3 zTex = texture(uStoneTexture, vWorldPos.xy * scale).rgb;

            baseColor = xTex * blending.x + yTex * blending.y + zTex * blending.z;
            
            // Sangue
            float distPoca = length(vWorldPos.xz - vec2(0.2, -0.3)); 
            if (N.y > 0.5 && distPoca < 0.4) baseColor = vec3(0.25, 0.0, 0.0);
        }

        // --- COMPOSIÇÃO FINAL ---
        float dist = length(vViewPos);
        float attenuation = 1.0 / (1.0 + 0.25 * dist + 0.15 * (dist * dist));
        
        float ka = (uIsRoomObject == 1) ? 0.35 : 0.07; 
        vec3 ambient = baseColor * ka;
        
        // Lanterna agora aplica a cor 'lightColor' suave
        vec3 diffuse = baseColor * diff * lightColor;
        
        // [FIX] Reduz o brilho especular nas paredes para evitar o efeito "plástico/estourado"
        // Se for objeto do quarto mantém 0.15, se for parede diminui para 0.02
        float ks = (uIsRoomObject == 1) ? 0.15 : 0.02;
        vec3 specular = vec3(1.0) * spec * ks;
        
        vec3 combinedLight = ambient + (diffuse + specular) * intensity * attenuation * 3.5 * uLightIntensity;
        
        fragColor = vec4(combinedLight, 1.0);
    }
`;