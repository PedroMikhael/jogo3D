// Script para extrair colliders do modelo OBJ
// Executa no Node.js para gerar os colliders

const fs = require('fs');

// Ler o arquivo OBJ
const objContent = fs.readFileSync('./modelos/Maze.0/model.obj', 'utf8');
const lines = objContent.split('\n');

// Extrair todos os vértices
const vertices = [];
for (const line of lines) {
    if (line.startsWith('v ')) {
        const parts = line.trim().split(/\s+/);
        vertices.push({
            x: parseFloat(parts[1]),
            y: parseFloat(parts[2]),
            z: parseFloat(parts[3])
        });
    }
}

// Agrupar vértices por posição Y (paredes têm Y similar)
// Filtrar apenas vértices que fazem parte das paredes (Y > -0.1)
const wallVertices = vertices.filter(v => v.y > -0.1);

// Encontrar segmentos de parede únicos
// Uma parede é definida por vértices com X ou Z similar (parede vertical ou horizontal)

const tolerance = 0.05;
const segments = new Set();

// Agrupar por linhas (mesmo Z, X diferente = parede horizontal)
const byZ = {};
for (const v of wallVertices) {
    const zKey = Math.round(v.z * 10) / 10;
    if (!byZ[zKey]) byZ[zKey] = [];
    byZ[zKey].push(v.x);
}

// Agrupar por colunas (mesmo X, Z diferente = parede vertical)
const byX = {};
for (const v of wallVertices) {
    const xKey = Math.round(v.x * 10) / 10;
    if (!byX[xKey]) byX[xKey] = [];
    byX[xKey].push(v.z);
}

console.log('// ===== PAREDES HORIZONTAIS (mesmo Z) =====');
for (const [z, xValues] of Object.entries(byZ)) {
    if (xValues.length >= 2) {
        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);
        if (maxX - minX > 0.05) {
            console.log(`createHWall(${minX.toFixed(2)}, ${maxX.toFixed(2)}, ${z}),`);
        }
    }
}

console.log('\n// ===== PAREDES VERTICAIS (mesmo X) =====');
for (const [x, zValues] of Object.entries(byX)) {
    if (zValues.length >= 2) {
        const minZ = Math.min(...zValues);
        const maxZ = Math.max(...zValues);
        if (maxZ - minZ > 0.05) {
            console.log(`createVWall(${x}, ${minZ.toFixed(2)}, ${maxZ.toFixed(2)}),`);
        }
    }
}
