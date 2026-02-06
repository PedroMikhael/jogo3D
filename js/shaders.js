// Vertex Shader: Com animação de vento para grama
const vsSource = `#version 300 es
    precision highp float;
    precision highp int;
    
    in vec4 aVertexPosition;
    in vec3 aVertexNormal;
    in vec3 aVertexColor;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float uTime;       // Tempo para animação
    uniform int uIsGrass;      // Se é grama (para animação de vento)

    out vec3 vNormal;
    out vec3 vWorldPos;
    out vec3 vColor;

    void main() {
        vec4 pos = aVertexPosition;
        
        // Animação de vento na grama
        if (uIsGrass == 1) {
            // Movimento baseado na altura (vértices mais altos movem mais)
            float height = pos.y;
            if (height > 0.0) {
                // Vento - ondulação suave
                float windStrength = 0.03;
                float windSpeed = 2.0;
                float windX = sin(uTime * windSpeed + pos.x * 3.0 + pos.z * 2.0) * windStrength * height;
                float windZ = cos(uTime * windSpeed * 0.7 + pos.x * 2.0 + pos.z * 3.0) * windStrength * height * 0.5;
                pos.x += windX;
                pos.z += windZ;
            }
        }
        
        gl_Position = uProjectionMatrix * uModelViewMatrix * pos;
        vNormal = aVertexNormal;
        vWorldPos = aVertexPosition.xyz;
        vColor = aVertexColor;
    }
`;

const fsSource = `#version 300 es
    precision highp float;
    precision highp int;    
    in vec3 vNormal;
    in vec3 vWorldPos;
    in vec3 vColor;
    
    uniform int uIsKey;
    uniform int uIsGrass;
    uniform int uUseMTLColor;
    uniform int uIsRoomObject;  // Objetos do quarto (não usar textura de pedra)
    uniform float uTime;
    uniform sampler2D uStoneTexture;
    
    out vec4 fragColor;
    
    // Função de ruído simples para variação
    float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
        vec3 normal = normalize(vNormal);
        
        // Iluminação: luz principal + luz ambiente
        vec3 lightDir = normalize(vec3(0.3, 1.0, 0.5));
        vec3 lightColor = vec3(1.0, 0.95, 0.8);  // Luz levemente amarelada (sol)
        float diffuse = max(dot(normal, lightDir), 0.0);
        float ambient = 0.35;
        float lightIntensity = ambient + diffuse * 0.65;
        
        if (uIsKey == 1) {
            // Chave com brilho
            vec3 keyColor;
            if (uUseMTLColor == 1 && length(vColor) > 0.01) {
                keyColor = vColor;
            } else {
                keyColor = vec3(1.0, 0.85, 0.2);
            }
            // Brilho especular
            float shine = pow(max(dot(normal, normalize(lightDir + vec3(0.0, 1.0, 0.0))), 0.0), 16.0);
            keyColor += vec3(shine * 0.5);
            keyColor *= lightIntensity;
            fragColor = vec4(keyColor, 1.0);
            
        } else if (uIsGrass == 1) {
            // GRAMA REALISTA
            // Cor base variada
            vec3 grassBase = vec3(0.15, 0.45, 0.08);  // Verde escuro
            vec3 grassTip = vec3(0.3, 0.6, 0.15);      // Verde claro nas pontas
            
            // Variação baseada na posição (patches de grama)
            float patchNoise = noise(vWorldPos.xz * 0.5);
            float detailNoise = noise(vWorldPos.xz * 5.0);
            
            // Mistura entre base e ponta baseado na altura
            float heightFactor = clamp(vWorldPos.y * 3.0, 0.0, 1.0);
            vec3 grassColor = mix(grassBase, grassTip, heightFactor);
            
            // Adiciona variação de patches (manchas de grama mais escura/clara)
            grassColor *= 0.8 + patchNoise * 0.4;
            
            // Detalhes finos
            grassColor += vec3(0.0, detailNoise * 0.08, 0.0);
            
            // Tons amarelados em algumas áreas (grama seca)
            float dryPatch = noise(vWorldPos.xz * 0.3 + 100.0);
            if (dryPatch > 0.7) {
                grassColor = mix(grassColor, vec3(0.5, 0.5, 0.15), (dryPatch - 0.7) * 2.0);
            }
            
            // Sombra auto-gerada (grama mais baixa é mais escura)
            float selfShadow = 0.7 + heightFactor * 0.3;
            grassColor *= selfShadow;
            
            // Aplica iluminação
            grassColor *= lightIntensity;
            
            // Brilho especular sutil (orvalho)
            float specular = pow(max(dot(normal, normalize(lightDir + vec3(0.0, 1.0, 0.0))), 0.0), 32.0);
            grassColor += vec3(specular * 0.1);
            
            fragColor = vec4(grassColor, 1.0);
            
        } else if (uIsRoomObject == 1) {
            // Objetos do quarto - cor do MTL ou cor padrão cinza claro
            vec3 roomColor;
            if (length(vColor) > 0.01) {
                roomColor = vColor;
            } else {
                roomColor = vec3(0.9, 0.9, 0.9);  // Branco/cinza claro padrão
            }
            roomColor *= lightIntensity;
            fragColor = vec4(roomColor, 1.0);
            
        } else if (uUseMTLColor == 1 && length(vColor) > 0.01) {
            vec3 mtlColor = vColor * lightIntensity;
            fragColor = vec4(mtlColor, 1.0);
            
        } else {
            // Labirinto com textura
            float isHorizontal = abs(normal.y);
            
            if (isHorizontal > 0.8) {
                if (vWorldPos.y > 0.0) {
                    vec2 topUV = vWorldPos.xz * 2.0;
                    vec3 topColor = texture(uStoneTexture, topUV).rgb;
                    topColor *= lightIntensity * 1.2;
                    fragColor = vec4(topColor, 1.0);
                } else {
                    // Chão do labirinto - textura de terra/pedra
                    vec2 floorUV = vWorldPos.xz * 3.0;
                    vec3 floorColor = texture(uStoneTexture, floorUV).rgb * 0.5;
                    floorColor = mix(floorColor, vec3(0.3, 0.25, 0.2), 0.5);
                    fragColor = vec4(floorColor * lightIntensity, 1.0);
                }
            } else {
                vec2 wallUV;
                if (abs(normal.x) > abs(normal.z)) {
                    wallUV = vWorldPos.zy * 2.0;
                } else {
                    wallUV = vWorldPos.xy * 2.0;
                }
                
                vec3 wallColor = texture(uStoneTexture, wallUV).rgb;
                wallColor *= lightIntensity;
                fragColor = vec4(wallColor, 1.0);
            }
        }
    }
`;