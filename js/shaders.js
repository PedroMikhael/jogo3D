const vsSource = `#version 300 es
    precision highp float;

    in vec4 aVertexPosition;
    in vec3 aVertexNormal;
    in vec3 aVertexColor;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelMatrix; // <--- NOVA UNIFORM: Posição do objeto no mundo

    out vec3 vNormal;
    out vec3 vViewPos;
    out vec3 vWorldPos; // <--- NOVA OUT: Posição real no mapa
    out vec3 vColor;

    void main() {
        vColor = aVertexColor;
        vNormal = normalize(mat3(uModelViewMatrix) * aVertexNormal);
        
        vec4 viewPos = uModelViewMatrix * aVertexPosition;
        vViewPos = viewPos.xyz; 
        
        // Calcula a posição absoluta no mundo (independente da câmera)
        // Se você não tiver uModelMatrix, usaremos uma alternativa no JS
        vWorldPos = aVertexPosition.xyz; 

        gl_Position = uProjectionMatrix * viewPos;
    }
`;

const fsSource = `#version 300 es
    precision highp float;
    precision highp int;

    in vec3 vNormal;
    in vec3 vViewPos;
    in vec3 vWorldPos; // Recebe a posição fixa do mapa
    in vec3 vColor;
    
    uniform highp int uUseMTLColor;
    uniform sampler2D uStoneTexture;
    uniform float uLightIntensity;
    uniform float uCutOff;
    uniform float uTime;

    out vec4 fragColor;

    void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(-vViewPos); 
        vec3 V = normalize(-vViewPos);
        
        vec3 baseColor;
        if (uUseMTLColor == 1) {
            baseColor = vColor;
        } else {
            // Textura baseada na posição do mundo para não "deslizar"
            vec2 uv = (abs(N.y) > 0.5) ? vWorldPos.xz : vWorldPos.xy;
            baseColor = texture(uStoneTexture, uv * 1.5).rgb;
        }

        // --- POÇA DE SANGUE FIXA NO MAPA ---
        // Agora usamos vWorldPos. Se as coordenadas do seu mapa forem pequenas,
        // ajuste os valores (0.2, -0.3) para onde você quer que a poça fique.
        float distPoca = length(vWorldPos.xz - vec2(0.2, -0.3)); 
        
        if (uUseMTLColor == 0 && N.y > 0.8 && distPoca < 0.5) {
            // Efeito de movimento suave no sangue
            float wave = sin(vWorldPos.x * 15.0 + uTime * 2.0) * 0.01;
            baseColor = vec3(0.2, 0.0, 0.0); // Vermelho escuro fixo
        }

        // --- ILUMINAÇÃO ---
        vec3 lightColor = vec3(1.0, 0.9, 0.6);
        vec3 ambient = 0.15 * baseColor;
        float diff = max(dot(N, L), 0.0);
        vec3 diffuse = baseColor * lightColor * diff;

        // Lanterna
        float dist = length(vViewPos);
        float attenuation = 1.0 / (1.0 + 0.4 * dist + 0.6 * (dist * dist));
        float theta = dot(normalize(vViewPos), vec3(0.0, 0.0, -1.0));
        float intensity = smoothstep(uCutOff - 0.05, uCutOff + 0.05, theta);

        vec3 finalColor = ambient + (diffuse * intensity * attenuation * 5.0 * uLightIntensity);
        
        float fogFactor = exp(-0.8 * dist);
        fragColor = vec4(finalColor * fogFactor, 1.0);
    }
`;