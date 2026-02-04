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
        
        // Passamos a normal transformada para o fragment shader
        // Usamos mat3(uModelViewMatrix) para rotacionar as normais corretamente
        vNormal = mat3(uModelViewMatrix) * aVertexNormal;
        
        // vWorldPos é a posição do vértice no "espaço da câmera" para facilitar o Phong
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

    uniform vec3 uLightPos;   // Posição da lanterna
    uniform vec3 uLightDir;   // Direção da lanterna
    uniform float uCutOff;    // Coseno do ângulo do cone

    out vec4 fragColor;

    void main() {
        vec3 N = normalize(vNormal);
        vec3 L_dir = normalize(uLightDir);
        
        // Vetor do fragmento para a luz (Posição da luz no espaço da câmera é [0,0,0] se estiver na mão)
        // Mas como passamos uLightPos, usamos a distância real:
        vec3 L = normalize(-vWorldPos); 
        
        vec3 baseColor;

        // 1. RECUPERAÇÃO DA COR ORIGINAL (Consertando o "Preto e Branco")
        if (uIsKey == 1 || uUseMTLColor == 1) {
            baseColor = (length(vColor) > 0.01) ? vColor : vec3(0.6, 0.6, 0.6);
        } else {
            vec2 uv = (abs(N.x) > 0.5) ? vWorldPos.zy : vWorldPos.xz;
            baseColor = texture(uStoneTexture, uv * 2.0).rgb;
        }

        // 2. MODELO DE PHONG (Ambient, Diffuse, Specular)
        
        // AMBIENT: Luz mínima para não ficar breu total
        vec3 ambient = 0.1 * baseColor;

        // CÁLCULO DO CONE DA LANTERNA (Spotlight)
        float theta = dot(normalize(vWorldPos), vec3(0.0, 0.0, -1.0));
        
        vec3 diffuse = vec3(0.0);
        vec3 specular = vec3(0.0);

        if(theta > uCutOff) {
            // DIFFUSE: A cor revelada pela lanterna
            float diffFactor = max(dot(N, L), 0.0);
            diffuse = diffFactor * baseColor;

            // SPECULAR: O brilho (Phong) - Essencial para Chaves e Esqueleto
            vec3 V = normalize(-vWorldPos); // Vetor para o observador
            vec3 R = reflect(-L, N);        // Vetor de reflexão
            
            float specFactor = pow(max(dot(R, V), 0.0), 32.0); // 32.0 é o brilho (shininess)
            specular = vec3(0.5) * specFactor; // Brilho branco
            
            // Atenuação e Intensidade do Foco
            float dist = length(vWorldPos);
            float attenuation = 1.0 / (1.0 + 0.2 * dist + 0.1 * (dist * dist));
            float spotIntensity = clamp((theta - uCutOff) / 0.1, 0.0, 1.0);
            
            diffuse *= attenuation * spotIntensity * 2.0;
            specular *= attenuation * spotIntensity * 2.0;
        }

        // Combinação final: Ambient + Diffuse + Specular
        vec3 finalColor = ambient + diffuse + specular;

        // FOG (Nevoeiro de distância)
        float fog = exp(-0.4 * length(vWorldPos));
        fragColor = vec4(finalColor * fog, 1.0);
    }
`;