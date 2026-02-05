const vsSource = `#version 300 es
    precision highp float;

    in vec4 aVertexPosition;
    in vec3 aVertexNormal;
    in vec3 aVertexColor;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float uTime;
    uniform highp int uIsGrass;

    out vec3 vNormal;
    out vec3 vWorldPos;
    out vec3 vColor;

    void main() {
        vec4 pos = aVertexPosition;
        
        if (uIsGrass == 1) {
            float height = pos.y;
            if (height > 0.0) {
                pos.x += sin(uTime * 2.0 + pos.x * 3.0) * 0.03 * height;
            }
        }
        
        vNormal = mat3(uModelViewMatrix) * aVertexNormal;
        vec4 viewPos = uModelViewMatrix * aVertexPosition;
        vWorldPos = viewPos.xyz; 
        vColor = aVertexColor;
        
        gl_Position = uProjectionMatrix * viewPos;
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
    uniform float uTime;

    out vec4 fragColor;

    void main() {
        vec3 N = normalize(vNormal);
        vec3 viewDir = normalize(vWorldPos); 
        
        vec3 baseColor;

        // 1. COR BASE
        if (uUseMTLColor == 1) {
            baseColor = vColor;
        } else {
            vec2 uv = (abs(N.y) > 0.5) ? vWorldPos.xz : vWorldPos.xy;
            baseColor = texture(uStoneTexture, uv * 1.5).rgb;
            if (uIsGrass == 1) baseColor *= vec3(0.2, 0.5, 0.2); 
        }

        // 2. LÓGICA DA POÇA DE SANGUE (RAY TRACING)
        // Detecta se o pixel está no chão e em uma área circular
        float distCentroPoca = length(vWorldPos.xz - vec2(0.2, -0.3));
        
        if (N.y > 0.9 && distCentroPoca < 0.6) {
            // Ondulações viscosas usando uTime
            float wave = sin(vWorldPos.x * 30.0 + uTime * 2.0) * cos(vWorldPos.z * 30.0 + uTime * 2.0) * 0.01;
            vec3 waveNormal = normalize(N + vec3(wave, 0.0, wave));
            
            // Direção do reflexo (Ray Tracing)
            vec3 reflDir = reflect(viewDir, waveNormal);
            
            // Cor do reflexo: Gradiente de vermelho escuro (vinho)
            vec3 darkBlood = vec3(0.1, 0.0, 0.0);
            vec3 reflectionColor = mix(darkBlood, vec3(0.5, 0.05, 0.05), reflDir.y * 0.5 + 0.5);
            
            // Fresnel: Reflexo mais forte em ângulos rasos
            float fresnel = pow(1.0 - max(dot(waveNormal, -viewDir), 0.0), 5.0);
            
            // Mistura final: Base preta/vermelha + Reflexo calculado
            baseColor = mix(vec3(0.08, 0.0, 0.0), reflectionColor, 0.1 + fresnel * 0.9);
            
            // Brilho especular (aspecto molhado da lanterna)
            float spec = pow(max(dot(reflDir, normalize(-vWorldPos)), 0.0), 64.0);
            baseColor += spec * vec3(0.8, 0.4, 0.4) * uLightIntensity;
        }

        // 3. ILUMINAÇÃO (Lanterna)
        vec3 lightColor = vec3(1.0, 0.9, 0.6);
        float theta = dot(viewDir, vec3(0.0, 0.0, -1.0));
        vec3 ambient = vec3(0.02) * baseColor;
        vec3 diffuse = vec3(0.0);

        if(theta > uCutOff) {
            float dist = length(vWorldPos);
            float attenuation = 1.0 / (1.0 + 0.8 * dist + 1.2 * (dist * dist));
            float spot = clamp((theta - uCutOff) / 0.1, 0.0, 1.0);
            diffuse = baseColor * lightColor * max(dot(N, -viewDir), 0.0) * attenuation * spot * 4.0 * uLightIntensity;
        }

        vec3 finalColor = ambient + diffuse;
        float fog = exp(-0.8 * length(vWorldPos));
        fragColor = vec4(finalColor * fog, 1.0);
    }
`;
