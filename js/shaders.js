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
        vNormal = normalize(mat3(uModelMatrix) * aVertexNormal); // Normal deve usar Model Matrix para rotação correta no mundo
        
        vec4 viewPos = uModelViewMatrix * aVertexPosition;
        vViewPos = viewPos.xyz; 
        
        // Calcula a posição absoluta no mundo (independente da câmera)
        vWorldPos = (uModelMatrix * aVertexPosition).xyz; 

        gl_Position = uProjectionMatrix * viewPos;
    }
`;

const fsSource = `#version 300 es
    precision highp float;
    precision highp int;

    in vec3 vNormal;
    in vec3 vViewPos;
    in vec3 vWorldPos;
    in vec3 vColor;
    
    uniform highp int uUseMTLColor;
    uniform sampler2D uStoneTexture;
    uniform float uLightIntensity;
    uniform float uCutOff; // Controlado pelo Math.cos no main.js
    uniform float uTime;

    out vec4 fragColor;

    void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(-vViewPos); 
        vec3 V = normalize(-vViewPos);
        
        vec3 baseColor;
        bool isObject = (uUseMTLColor == 1);

        // 1. COR BASE
        if (isObject) {
            // Se a cor do MTL falhar, usa amarelo, senão usa a vColor
            baseColor = (length(vColor) < 0.1) ? vec3(0.8, 0.7, 0.2) : vColor;
        } else {
            // Triplanar Mapping Simplificado (Escolhe o plano dominante)
            vec3 absN = abs(N);
            vec2 uv;
            
            if (absN.y > absN.x && absN.y > absN.z) {
                // CHÃO / TETO (Y dominante) -> Usa XZ
                uv = vWorldPos.xz;
            } else if (absN.x > absN.z) {
                // PAREDES LATERAIS (X dominante) -> Usa ZY
                uv = vWorldPos.zy;
            } else {
                // PAREDES FRENTE/TRÁS (Z dominante) -> Usa XY
                uv = vWorldPos.xy;
            }
            
            baseColor = texture(uStoneTexture, uv * 1.5).rgb;
        }

        // 2. POÇA DE SANGUE (Fixa e discreta)
        float distPoca = length(vWorldPos.xz - vec2(0.2, -0.3)); 
        if (!isObject && N.y > 0.8 && distPoca < 0.5) {
            baseColor = vec3(0.2, 0.0, 0.0);
        }

        // 3. ILUMINAÇÃO DE TERROR
        vec3 lightColor = vec3(1.0, 0.9, 0.7);
        
        // AMBIENTE: Quase zero para manter o terror
        vec3 ambient = 0.05 * baseColor; 

        // DIFUSA E ESPECULAR
        float diff = max(dot(N, L), 0.0);
        vec3 diffuse = baseColor * lightColor * diff;
        
        vec3 R = reflect(-L, N);
        float spec = pow(max(dot(R, V), 0.0), 32.0);
        vec3 specular = lightColor * spec * (isObject ? 0.8 : 0.2);

        // 4. FOCO DA LANTERNA (O "CORTE" SECO)
        float dist = length(vViewPos);
        // Atenuação: a luz some rápido no escuro
        float attenuation = 1.0 / (1.0 + 0.8 * dist + 1.5 * (dist * dist));
        
        float theta = dot(normalize(vViewPos), vec3(0.0, 0.0, -1.0));
        
        // Intensity: Se theta for menor que uCutOff, fica escuro. 
        // Reduzi o epsilon para 0.05 para a borda ficar mais nítida
        float intensity = clamp((theta - uCutOff) / 0.05, 0.0, 1.0);

        // 5. COMBINAÇÃO FINAL
        // Aumentamos o brilho da DIFUSA apenas no foco da lanterna
        vec3 lighting = (diffuse + specular) * intensity * attenuation * 7.0 * uLightIntensity;
        
        // O Ambiente agora é afetado pela lanterna também (OPCIONAL)
        // Se quiser breu total fora do círculo, multiplique ambient por intensity:
        vec3 finalColor = (ambient * 0.5) + lighting;
        
        // FOG: Essencial para o clima de terror
        float fogFactor = exp(-1.2 * dist); // Fog mais denso
        
        fragColor = vec4(finalColor * fogFactor, 1.0);
    }
`;

