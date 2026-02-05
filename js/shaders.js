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
        vec3 L = normalize(-vWorldPos); // Direção para a lanterna (na câmera)
        
        vec3 baseColor;

        // 1. DEFINIÇÃO DA COR (Aqui corrigimos o Preto e Branco)
        if (uUseMTLColor == 1) {
            // Usa a cor vinda do arquivo .obj/.mtl (Chaves, Lanterna, Esqueleto)
            baseColor = vColor;
        } else {
            // Mapeamento de Textura para Parede e Grama
            // Criamos coordenadas UV baseadas na posição do mundo
            vec2 uv = (abs(N.y) > 0.5) ? vWorldPos.xz : vWorldPos.xy;
            
            // Lemos a imagem 'stoneTexture' enviada pelo main.js
            vec4 texColor = texture(uStoneTexture, uv * 1.5); 
            baseColor = texColor.rgb;

            // Ajuste específico para a Grama: Se for grama, damos um tom esverdeado
            if (uIsGrass == 1) {
                baseColor *= vec3(0.4, 0.8, 0.4); // Força um tom verde sobre a textura
            }
        }

        // 2. ILUMINAÇÃO DE PHONG
        float theta = dot(normalize(vWorldPos), vec3(0.0, 0.0, -1.0));
        
        // Luz ambiente (mínimo para não ser breu total)
        vec3 ambient = 0.03 * baseColor;
        vec3 diffuse = vec3(0.0);

        if(theta > uCutOff) {
            float diffFactor = max(dot(N, L), 0.0);
            
            // Atenuação (Luz enfraquece com a distância)
            float dist = length(vWorldPos);
            float attenuation = 1.0 / (1.0 + 0.7 * dist + 0.5 * (dist * dist));
            
            // Intensidade do Spot + Flicker
            float spotIntensity = clamp((theta - uCutOff) / 0.1, 0.0, 1.0);
            
            diffuse = baseColor * diffFactor * attenuation * spotIntensity * 2.5 * uLightIntensity;
        }

        // 3. RESULTADO FINAL + FOG
        vec3 finalColor = ambient + diffuse;
        float fog = exp(-0.7 * length(vWorldPos));
        
        fragColor = vec4(finalColor * fog, 1.0);
    }
`;