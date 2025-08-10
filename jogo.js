const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const largura = canvas.width;
const altura = canvas.height;

let jogador = { x: 100, y: 100, tamanho: 30, velocidade: 5, invencivel: false };
let virusDigital = [];
let projeteis = [];
let partículas = [];
let powerUps = [];
let vidas = 3;
let pontos = 0;
let tempo = 0;
let eliminados = 0;
let jogoAtivo = false;
let teclas = {};

const inicioTela = document.getElementById('inicio');
const fimTela = document.getElementById('fim');
const vitoriaTela = document.getElementById('vitoria');

function criarImagem(svg) {
  const img = new Image();
  const svgData = encodeURIComponent(svg);
  img.src = "data:image/svg+xml;charset=utf-8," + svgData;
  return img;
}

const imgJogador = criarImagem(`
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <circle cx="15" cy="15" r="15" fill="cyan"/>
  <circle cx="15" cy="10" r="3" fill="white"/>
  <line x1="10" y1="15" x2="15" y2="20" stroke="white" stroke-width="2"/>
  <line x1="20" y1="15" x2="15" y2="20" stroke="white" stroke-width="2"/>
</svg>
`);

const imgVirusComum = criarImagem(`
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <circle cx="15" cy="15" r="15" fill="red"/>
  <circle cx="15" cy="15" r="4" fill="white"/>
  <path d="M15,5 C15,7 17.5,9 19,19 C19,19 19,19 19,19" stroke="white" stroke-width="2"/>
</svg>
`);

const imgVirusRapido = criarImagem(`
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <circle cx="15" cy="15" r="15" fill="purple"/>
  <circle cx="15" cy="15" r="4" fill="white"/>
  <path d="M10,10 L20,20 M20,10 L10,20" stroke="white" stroke-width="2"/>
</svg>
`);

const imgVirusSeguidor = criarImagem(`
<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <circle cx="15" cy="15" r="15" fill="#c0392b" stroke="white" stroke-width="1"/>
  <circle cx="15" cy="15" r="4" fill="white"/>
  <circle cx="15" cy="15" r="2" fill="red"/>
  <path d="M10,15 L20,15" stroke="black" stroke-width="1" fill="none"/>
</svg>
`);
function criarPowerUp() {
  if (Math.random() < 0.02) {
    powerUps.push({
      x: Math.random() * largura,
      y: Math.random() * altura,
      tipo: ['vida', 'velocidade', 'ataque'][Math.floor(Math.random() * 3)],
      raio: 12,
      ativo: true
    });
  }
}

function aplicarPowerUp(tipo) {
  if (tipo === 'vida' && vidas < 5) {
    vidas++;
    atualizarVidas();
  } else if (tipo === 'velocidade') {
    jogador.velocidade += 2;
    setTimeout(() => jogador.velocidade = 5, 5000);
  } else if (tipo === 'ataque') {
    window.ataqueForte = true;
    setTimeout(() => window.ataqueForte = false, 5000);
  }
}

function colisaoPowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    const dx = (jogador.x + jogador.tamanho/2) - p.x;
    const dy = (jogador.y + jogador.tamanho/2) - p.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < jogador.tamanho/2 + p.raio) {
      aplicarPowerUp(p.tipo);
      powerUps.splice(i, 1);
    }
  }
}

function escanear() {
  if (projeteis.length > 0) return;

  const centroX = jogador.x + jogador.tamanho / 2;
  const centroY = jogador.y + jogador.tamanho / 2;
  const raio = window.ataqueForte ? 80 : 60;

  projeteis.push({
    x: centroX,
    y: centroY,
    raio,
    duracao: 10,
    ativo: true
  });

  let eliminadosNesteScan = 0;
  for (let i = virusDigital.length - 1; i >= 0; i--) {
    const v = virusDigital[i];
    const distX = v.x - centroX;
    const distY = v.y - centroY;
    const distancia = Math.sqrt(distX**2 + distY**2);
    if (distancia < raio + v.raio) {
      criarExplosao(v.x, v.y, 'lime');
      virusDigital.splice(i, 1);
      pontos += v.pontos || 10;
      eliminados++;
      eliminadosNesteScan++;
    }
  }

  if (eliminadosNesteScan > 0) {
    document.getElementById('pontos').textContent = pontos;
    verificarVitoria();
  }
}

function criarExplosao(x, y, cor) {
  for (let i = 0; i < 12; i++) {
    partículas.push({
      x, y,
      dx: (Math.random() - 0.5) * 10,
      dy: (Math.random() - 0.5) * 10,
      vida: 30,
      cor
    });
  }
}

function atualizarParticulas() {
  for (let i = partículas.length - 1; i >= 0; i--) {
    const p = partículas[i];
    p.x += p.dx;
    p.y += p.dy;
    p.vida--;
    if (p.vida <= 0) partículas.splice(i, 1);
  }
}

function desenharParticulas() {
  for (const p of partículas) {
    ctx.globalAlpha = p.vida / 30;
    ctx.fillStyle = p.cor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
  ctx.globalAlpha = 1;
}

function atualizarProjetil() {
  for (let i = projeteis.length - 1; i >= 0; i--) {
    const p = projeteis[i];
    p.duracao--;
    if (p.duracao <= 0) projeteis.splice(i, 1);
  }
}

function desenharAtaque() {
  for (const p of projeteis) {
    const alpha = p.duracao / 10;
    ctx.globalAlpha = alpha * 0.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.fill();
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.closePath();
  }
  ctx.globalAlpha = 1;
}

function moverJogador() {
  if (teclas['ArrowUp']) jogador.y -= jogador.velocidade;
  if (teclas['ArrowDown']) jogador.y += jogador.velocidade;
  if (teclas['ArrowLeft']) jogador.x -= jogador.velocidade;
  if (teclas['ArrowRight']) jogador.x += jogador.velocidade;

  if (teclas[' '] && projeteis.length === 0) {
    escanear();
    teclas[' '] = false;
  }

  if (jogador.x < 0) jogador.x = 0;
  if (jogador.y < 0) jogador.y = 0;
  if (jogador.x + jogador.tamanho > largura) jogador.x = largura - jogador.tamanho;
  if (jogador.y + jogador.tamanho > altura) jogador.y = altura - jogador.tamanho;
}

function criarVirus(tipo) {
  const x = Math.random() * (largura - 60) + 30;
  const y = Math.random() * (altura - 60) + 30;

  let dx, dy, img, velocidade, pontos;

  if (tipo === 'rapido') {
    velocidade = 3.5 + tempo / 20;
    dx = (Math.random() * 2 - 1) * velocidade;
    dy = (Math.random() * 2 - 1) * velocidade;
    img = imgVirusRapido;
    pontos = 15;
  } else if (tipo === 'seguir') {
    velocidade = 1.8 + tempo / 30;
    dx = 0;
    dy = 0;
    img = imgVirusSeguidor;
    pontos = 20;
  } else {
    velocidade = 2 + tempo / 30;
    dx = (Math.random() * 2 - 1) * velocidade;
    dy = (Math.random() * 2 - 1) * velocidade;
    img = imgVirusComum;
    pontos = 10;
  }

  virusDigital.push({
    x, y, raio: 15, dx, dy, img, tipo, velocidade, pontos,
    id: Date.now() + Math.random()
  });
}

function moverVirusDigital() {
  const jx = jogador.x + jogador.tamanho / 2;
  const jy = jogador.y + jogador.tamanho / 2;

  for (let v of virusDigital) {
    if (v.tipo === 'seguir') {
      const angulo = Math.atan2(jy - v.y, jx - v.x);
      v.dx = Math.cos(angulo) * v.velocidade;
      v.dy = Math.sin(angulo) * v.velocidade;
      v.x += v.dx;
      v.y += v.dy;
    } else {
      v.x += v.dx;
      v.y += v.dy;

      if (v.x < 0 || v.x > largura) v.dx *= -1;
      if (v.y < 0 || v.y > altura) v.dy *= -1;
    }
  }
}

function detectarInfeccao() {
  if (jogador.invencivel) return;

  for (let v of virusDigital) {
    const distX = v.x - (jogador.x + jogador.tamanho / 2);
    const distY = v.y - (jogador.y + jogador.tamanho / 2);
    const distancia = Math.sqrt(distX * distX + distY * distY);

    if (distancia < v.raio + jogador.tamanho / 2) {
      vidas--;
      atualizarVidas();
      if (vidas <= 0) {
        sistemaComprometido();
      } else {
        jogador.invencivel = true;
        setTimeout(() => jogador.invencivel = false, 2000);
      }
      const index = virusDigital.indexOf(v);
      if (index !== -1) virusDigital.splice(index, 1);
    }
  }
}

function atualizarVidas() {
  document.getElementById('vidas').textContent = '❤️'.repeat(vidas);
}

function verificarVitoria() {
  if (virusDigital.length === 0 && jogoAtivo) {
    jogoAtivo = false;
    document.getElementById('tempoVitoria').textContent = tempo;
    document.getElementById('pontosVitoria').textContent = pontos;
    vitoriaTela.style.display = 'flex';
  }
}

function desenhar() {
  ctx.clearRect(0, 0, largura, altura);

  ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
  for (let i = 0; i < 50; i++) {
    ctx.beginPath();
    ctx.arc(i * 17, (i * 13) % altura, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.drawImage(imgJogador, jogador.x, jogador.y, jogador.tamanho, jogador.tamanho);

  for (let v of virusDigital) {
    ctx.drawImage(v.img, v.x - 15, v.y - 15, 30, 30);
  }

  for (const p of powerUps) {
    ctx.font = '20px Arial';
    ctx.fillText(p.tipo === 'vida' ? '🛡️' : p.tipo === 'velocidade' ? '⚡' : '💣', p.x, p.y);
  }

  desenharAtaque();
  desenharParticulas();
}

function gameLoop() {
  if (!jogoAtivo) return;
  moverJogador();
  moverVirusDigital();
  atualizarProjetil();
  atualizarParticulas();
  colisaoPowerUps();
  criarPowerUp();
  detectarInfeccao();
  desenhar();
  requestAnimationFrame(gameLoop);
}

function contarTempo() {
  if (!jogoAtivo) return;
  tempo++;
  document.getElementById('tempo').textContent = tempo;

  if (tempo % 3 === 0) {
    const tipos = ['comum', 'comum', 'comum', 'rapido', 'seguir'];
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];
    criarVirus(tipo);
  }
}

function sistemaComprometido() {
  jogoAtivo = false;
  fimTela.style.display = 'flex';
  document.getElementById('tempoFinal').textContent = tempo;
  document.getElementById('pontosFinais').textContent = pontos;
  document.getElementById('eliminadosFinais').textContent = eliminados;
}

function comecarJogo() {
  inicioTela.style.display = 'none';
  fimTela.style.display = 'none';
  vitoriaTela.style.display = 'none';

  jogador = { x: 100, y: 100, tamanho: 30, velocidade: 5, invencivel: false };
  virusDigital = [];
  projeteis = [];
  partículas = [];
  powerUps = [];
  vidas = 3;
  pontos = 0;
  tempo = 0;
  eliminados = 0;
  jogoAtivo = true;

  document.getElementById('tempo').textContent = '0';
  document.getElementById('pontos').textContent = '0';
  atualizarVidas();

  for (let i = 0; i < 10; i++) {
    const tipo = Math.random() < 0.6 ? 'comum' : Math.random() < 0.9 ? 'rapido' : 'seguir';
    criarVirus(tipo);
  }

  setInterval(() => { if (jogoAtivo) contarTempo(); }, 1000);
  gameLoop();
}

function reiniciar() {
  fimTela.style.display = 'none';
  vitoriaTela.style.display = 'none';
  comecarJogo();
}

document.addEventListener('keydown', e => teclas[e.key] = true);
document.addEventListener('keyup', e => teclas[e.key] = false);

inicioTela.style.display = 'flex';
