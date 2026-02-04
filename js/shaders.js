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
    uniform float uLightIntensity;  

    out vec4 fragColor;

    void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(-vWorldPos); // Vetor em direção à câmera/lanterna
        
        vec3 baseColor;

        // 1. RECUPERAÇÃO DA COR ORIGINAL
        if (uIsKey == 1 || uUseMTLColor == 1) {
            baseColor = (length(vColor) > 0.01) ? vColor : vec3(0.6, 0.6, 0.6);
        } else {
            // Mapeamento de textura baseado na normal (Triplanar simplificado)
            vec2 uv = (abs(N.x) > 0.5) ? vWorldPos.zy : vWorldPos.xz;
            baseColor = texture(uStoneTexture, uv * 2.0).rgb;
        }

        // 2. MODELO DE PHONG COM AJUSTES DE TERROR
        
        // AMBIENT: Reduzido drasticamente (de 0.1 para 0.02)
        // Isso faz com que as áreas não iluminadas fiquem quase pretas.
        vec3 ambient = 0.02 * baseColor;

        // CÁLCULO DO CONE DA LANTERNA
        float theta = dot(normalize(vWorldPos), vec3(0.0, 0.0, -1.0));
        
        vec3 diffuse = vec3(0.0);
        vec3 specular = vec3(0.0);

        if(theta > uCutOff) {
            // DIFFUSE
            float diffFactor = max(dot(N, L), 0.0);
            diffuse = diffFactor * baseColor;

            // SPECULAR (O brilho que seu professor pediu)
            vec3 V = normalize(-vWorldPos); 
            vec3 R = reflect(-L, N);
            float specFactor = pow(max(dot(R, V), 0.0), 16.0); // Brilho mais "espalhado"
            specular = vec3(0.4) * specFactor; 
            
            // ATENUAÇÃO DE TERROR: Luz morre muito mais rápido
            // Aumentamos os coeficientes para a luz não ir longe
            float dist = length(vWorldPos);
            float attenuation = 1.0 / (1.0 + 0.8 * dist + 1.2 * (dist * dist));
            
            // Suavização da borda do círculo
            float spotIntensity = clamp((theta - uCutOff) / 0.05, 0.0, 1.0);
            
            // Multiplicador final de brilho reduzido (de 2.0 para 1.3)
            diffuse *= attenuation * spotIntensity * 1.5 * uLightIntensity;
            specular *= attenuation * spotIntensity * 1.5 * uLightIntensity;
        }

        // Combinação final
        vec3 finalColor = ambient + diffuse + specular;

        // 3. NEVOEIRO (FOG) DENSO: A escuridão "engole" a luz a curta distância
        // Mudamos de -0.4 para -0.9 para encurtar a visão
        float fog = exp(-0.9 * length(vWorldPos));
        
        fragColor = vec4(finalColor * fog, 1.0);
    }
`;