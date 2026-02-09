# Shadow Maze: Desafio Procedural 3D

Shadow Maze é um jogo de exploração e suspense em primeira pessoa desenvolvido integralmente em WebGL Puro. O projeto utiliza algoritmos de geração procedural para criar labirintos únicos a cada execução, desafiando o jogador a coletar chaves e encontrar a saída sob a iluminação limitada de uma lanterna.

## Funcionalidades Técnicas

Este projeto foi desenvolvido como requisito para a disciplina de Computação Gráfica, focando na implementação de baixo nível sem o uso de bibliotecas gráficas de alto nível.

* **Leitor de OBJ Próprio**: Implementação de um parser para arquivos .obj e .mtl, realizando a leitura assíncrona de geometria e materiais.
* **Geração Procedural**: Labirinto gerado via algoritmo DFS (Recursive Backtracker), garantindo que todos os caminhos sejam alcançáveis.
* **Iluminação Dinâmica (Phong)**: Sistema de iluminação fragmento a fragmento utilizando o modelo de reflexão de Phong, simulando um feixe de luz de lanterna (Spotlight) com atenuação por distância.
* **Mapeamento Triplanar**: Técnica utilizada para evitar o esticamento de texturas em superfícies procedurais, combinando projeções nos eixos X, Y e Z.
* **Normalização de Modelos**: Algoritmo que centraliza e redimensiona modelos externos para um cubo unitário, garantindo consistência visual independente da escala original do Blender.



## Comandos

* **W, A, S, D**: Movimentação do jogador.
* **Mouse ou setas**: Controle de visão (Câmera em primeira pessoa).
* **F**: Ligar/Desligar lanterna.
* **Espaço**: Interagir com a porta de saída (após coletar as chaves).

## Requisitos de Sistema

O projeto utiliza exclusivamente:
* **WebGL Puro** para renderização.
* **Álgebra Linear Própria** para transformações de matrizes (MVP).
* **Canvas HTML5** para criação do contexto gráfico.

## Como Executar

Devido ao uso de requisições assíncronas para carregar modelos e texturas, os arquivos devem ser servidos por um servidor web para evitar restrições de segurança do navegador (CORS).

### Windows

1. Certifique-se de ter o Node.js instalado.
2. Abra o terminal na pasta do projeto.
3. Instale um servidor simples: `npm install -g http-server`
4. Inicie o servidor: `http-server`
5. Acesse `http://localhost:8080` no seu navegador.

Alternativa via Python:
1. No terminal da pasta do projeto: `python -m http.server 8000`
2. Acesse `http://localhost:8000`.

### Linux

1. Abra o terminal na pasta do projeto.
2. Utilize o Python para criar um servidor instantâneo: `python3 -m http.server 8000`
3. Acesse `http://localhost:8000` no seu navegador.

Caso prefira usar o Node.js:
1. `sudo npm install -g http-server`
2. `http-server`
3. Acesse `http://localhost:8080`.

## Equipe

* Fabio Azevedo 
* Pedro Mikhael 
* Rian Vilanova 
* João Victor 
* Bianca Leão 
