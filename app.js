// 1. IMPORTAÇÕES NECESSÁRIA
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, getDocs, query, where, updateDoc, arrayUnion, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. COLE AS CHAVES DO SEU FIREBASE AQUI
const firebaseConfig = {
    apiKey: "AIzaSyBIN87Yq5lv9DJUyBHsOg5ROvEQtLdI1rU",
    authDomain: "voleigigantes.firebaseapp.com",
    projectId: "voleigigantes",
    storageBucket: "voleigigantes.firebasestorage.app",
    messagingSenderId: "475993807159",
    appId: "1:475993807159:web:1a8a231ac7b191e5c7e2b2",
    measurementId: "G-BZCME88JPN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variáveis Globais de Navegação e Dados
let usuarioAtual = null;
let perfilUsuario = null;
let timeAtualId = null;
let jogoAtualId = null;
const urlParams = new URLSearchParams(window.location.search);
const conviteId = urlParams.get('convite');
const amigoId = urlParams.get('amigo');
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

// 3. CÉREBRO DA NAVEGAÇÃO (Atualizado)
onAuthStateChanged(auth, async (user) => {
    esconderTudo();
    
    if (user) {
        usuarioAtual = user;
        
        const userSnap = await getDoc(doc(db, "usuarios", user.uid));
        
        // Se o usuário já tem perfil salvo no banco, segue o jogo
        if (userSnap.exists()) {
            perfilUsuario = userSnap.data();
            document.getElementById('nome-usuario-lobby').innerText = perfilUsuario.nome.split(" ")[0];

            if (conviteId) {
                verificarConvite();
            } else if (amigoId) {
                // Lógica para lidar com o ID do amigo
                verificarConviteAmizade();
            } else {
                abrirLobby();
            }
        } else {
            // Se NÃO tem perfil (acabou de logar com Google/Apple pela primeira vez)
            // Mostra a TELA 1.5 para pegar o WhatsApp
            document.getElementById('perfil-section').classList.remove('hidden');
            document.getElementById('perfil-nome').value = user.displayName || "";
            document.getElementById('perfil-section').classList.remove('hidden');
        }
    } else {
        usuarioAtual = null;
        perfilUsuario = null;
        document.getElementById('login-section').classList.remove('hidden');
    }
});

// NOVA FUNÇÃO: Salvar o telefone do usuário recém-chegado do Google
window.salvarPerfil = async () => {
    const nome = document.getElementById('perfil-nome').value;
    const tel = document.getElementById('perfil-telefone').value;
    
    if(!nome) return alert("Por favor, preencha seu nome.");
    if(!tel || tel.length < 14) return alert("Por favor, digite um telefone válido com DDD.");
    

    try {
        // Salva os dados na coleção "usuarios" com o nome escolhido
        await setDoc(doc(db, "usuarios", usuarioAtual.uid), { 
            nome: nome, 
            telefone: tel 
        });

        // Recarrega os dados e manda pro Lobby
        perfilUsuario = { nome: nome, telefone: tel };
        document.getElementById('nome-usuario-lobby').innerText = perfilUsuario.nome.split(" ")[0];
        
        esconderTudo();

        if (conviteId) {
            verificarConvite();
        } else {
            abrirLobby();
        }

    } catch (e) {
        alert("Erro ao salvar perfil: " + e.message);
    }
};

function esconderTudo() {
    ['login-section', 'perfil-section', 'register-section', 'invite-section', 'lobby-section', 'team-section', 'game-section', 'modal-criar-time', 'modal-chamar-jogo', 'meu-perfil-screen', 'amigos-section'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
}

// 4. SISTEMA DE CONTAS (MÁSCARAS E LOGIN)
window.mostrarTelaCadastro = () => { esconderTudo(); document.getElementById('register-section').classList.remove('hidden'); };
window.mostrarTelaLogin = () => { esconderTudo(); document.getElementById('login-section').classList.remove('hidden'); };

window.loginComGoogle = async () => {
    try {
        await setPersistence(auth, browserLocalPersistence);
        // Voltamos a usar o Popup (janelinha) que puxa a conta do celular
        await signInWithPopup(auth, googleProvider);
    } catch (e) {
        alert("Erro no login com Google: " + e.message);
    }
};

window.loginComApple = async () => {
    try {
        await setPersistence(auth, browserLocalPersistence);
        // Voltamos a usar o Popup (janelinha) para Apple
        await signInWithPopup(auth, appleProvider);
    } catch (e) {
        alert("Erro no login com Apple: " + e.message);
    }
};

window.mascaraTelefone = (campo) => {
    let v = campo.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.substring(0,2)}) ${v.substring(2)}`;
    if (v.length > 10) v = `${v.substring(0,10)}-${v.substring(10)}`;
    campo.value = v;
};

// ==== LÓGICA DE LOGIN COM E-MAIL E SENHA ====

window.fazerLoginEmail = async () => {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const manter = document.getElementById('manter-login').checked;
    
    if(!email || !senha) return alert("Preencha seu e-mail e senha!");
    
    try {
        const persistencia = manter ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistencia);
        await signInWithEmailAndPassword(auth, email, senha);
    } catch(e) { 
        alert("E-mail ou senha incorretos."); 
    }
};

window.criarContaEmail = async () => {
    const nome = document.getElementById('cadastro-nome').value;
    const email = document.getElementById('cadastro-email').value;
    const tel = document.getElementById('cadastro-telefone').value;
    const senha = document.getElementById('cadastro-senha').value;

    if(!nome || !email || !tel || !senha) return alert("Preencha todos os campos!");
    if(senha.length < 6) return alert("A senha precisa ter no mínimo 6 caracteres.");

    try {
        // Cria a conta com e-mail e senha
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        // Salva o perfil no banco de dados
        await setDoc(doc(db, "usuarios", cred.user.uid), { 
            nome: nome, 
            telefone: tel, 
            email: email 
        });
    } catch(e) {
        if(e.code === 'auth/email-already-in-use') alert("Este e-mail já está cadastrado!");
        else alert("Erro ao criar conta: " + e.message);
    }
};

window.recuperarSenha = async () => {
    const email = document.getElementById('login-email').value;
    
    if(!email) {
        return alert("Por favor, digite seu E-mail no campo acima e clique em 'Esqueci a senha' novamente.");
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Enviamos um link de recuperação para o seu e-mail! Verifique também a pasta de Spam.");
    } catch(e) { 
        alert("Erro ao enviar e-mail. Verifique se digitou corretamente."); 
    }
};

const formatarTelParaEmail = (tel) => tel.replace(/\D/g, '') + "@inimigos.com";

window.criarConta = async () => {
    const nome = document.getElementById('cadastro-nome').value;
    const tel = document.getElementById('cadastro-telefone').value;
    const senha = document.getElementById('cadastro-senha').value;
    const senha2 = document.getElementById('cadastro-senha2').value;
    
    if(!nome || !tel || !senha) return alert("Preencha todos os campos!");
    if(senha !== senha2) return alert("As senhas não coincidem!");
    if(senha.length < 6) return alert("A senha deve ter no mínimo 6 caracteres.");
    
    try {
        const cred = await createUserWithEmailAndPassword(auth, formatarTelParaEmail(tel), senha);
        // Salva o nome e telefone na coleção "usuarios"
        await setDoc(doc(db, "usuarios", cred.user.uid), { nome: nome, telefone: tel });
    } catch (e) { 
        if (e.code === 'auth/email-already-in-use') alert("Telefone já cadastrado!");
        else alert("Erro: " + e.message); 
    }
};

window.fazerLogin = async () => {
    const tel = document.getElementById('login-telefone').value;
    const senha = document.getElementById('login-senha').value;
    const manterLogin = document.getElementById('manter-login').checked;
    
    if(!tel || !senha) return alert("Preencha telefone e senha.");
    
    try {
        const persistencia = manterLogin ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistencia);
        await signInWithEmailAndPassword(auth, formatarTelParaEmail(tel), senha);
    } catch (e) { alert("Senha ou telefone incorretos"); }
};

window.fazerLogout = () => { signOut(auth); };


// 5. LOBBY (MEUS TIMES)
window.abrirLobby = async () => {
    esconderTudo();
    document.getElementById('lobby-section').classList.remove('hidden');
    
    // Atualiza o nome do usuário no novo Header do Lobby
    if(perfilUsuario) {
        document.getElementById('nome-usuario-lobby').innerText = perfilUsuario.nome.split(" ")[0];
    }

    const listaDiv = document.getElementById('lista-times'); // Novo ID do contêiner de times
    const contadorTimes = document.getElementById('contador-times'); // Novo contador
    listaDiv.innerHTML = "<p style='text-align: center; color: #888;'>Buscando times...</p>";

    try {
        const q = query(collection(db, "times"), where("membros", "array-contains", usuarioAtual.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            contadorTimes.innerText = "0 Ativos";
            listaDiv.innerHTML = `
                <div class="team-card p-6 rounded-2xl flex flex-col items-center justify-center text-center opacity-70">
                    <div class="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
                        <i class="fa-solid fa-volleyball text-2xl text-zinc-600"></i>
                    </div>
                    <h4 class="font-bold text-lg text-white mb-1">Nenhum time ainda</h4>
                    <p class="text-zinc-500 text-sm">Crie um time ou peça um convite.</p>
                </div>`;
            return;
        }

        contadorTimes.innerText = `${querySnapshot.size} Ativos`;
        listaDiv.innerHTML = "";
        
        querySnapshot.forEach((docSnap) => {
            const time = docSnap.data();
            const timeId = docSnap.id;
            const qntMembros = time.membros ? time.membros.length : 0;
            const cargo = (time.adminUid === usuarioAtual.uid) ? " • Admin" : "";
            
            // Desenha o CARD NOVO do UX Copilot
            listaDiv.innerHTML += `
                <div onclick="entrarNoVestiario('${timeId}', '${time.nome}', '${time.adminUid}')" class="team-card p-4 rounded-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-transform">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                            <i class="fa-solid fa-fire text-2xl text-orange-500"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-lg text-white">${time.nome}</h4>
                            <p class="text-zinc-500 text-sm">${qntMembros} Jogadores${cargo}</p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-zinc-700"></i>
                </div>
            `;
        });
    } catch (e) { 
        console.error("Erro Lobby:", e); 
        listaDiv.innerHTML = "<p class='text-red-500 text-center'>Erro ao carregar times.</p>";
    }
};

window.mostrarCriacaoTime = () => {
    document.getElementById('modal-criar-time').classList.remove('hidden');
};

// Fecha o modal limpando a tela
window.fecharModalTime = () => {
    document.getElementById('modal-criar-time').classList.add('hidden');
    document.getElementById('nome-time').value = '';
};

window.criarTime = async () => {
    // Vai buscar o texto digitado no input do modal
    const inputNome = document.getElementById('nome-time');
    const nome = inputNome.value;
    
    if(!nome || nome.trim() === "") return alert("Digite o nome do time!");
    
    try {
        await addDoc(collection(db, "times"), {
            nome: nome,
            adminUid: usuarioAtual.uid,
            membros: [usuarioAtual.uid]
        });
        
        inputNome.value = ""; // Limpa o campo depois de criar
        document.getElementById('modal-criar-time').classList.add('hidden');
        abrirLobby(); 
    } catch (e) { 
        alert("Erro ao criar: " + e.message); 
    }
};

// ==========================================
// CORREÇÃO DO SISTEMA DE CONVITES
// ==========================================

window.verificarConvite = async () => {
    // Primeiro, abre o lobby normalmente para o usuário não ficar olhando pro vazio
    await abrirLobby();
    
    try {
        // Vai no banco de dados buscar as informações desse time
        const timeSnap = await getDoc(doc(db, "times", conviteId));
        
        if (timeSnap.exists()) {
            const timeData = timeSnap.data();
            
            // Verifica se o usuário JÁ ESTÁ no time para não dar erro
            if (timeData.membros && timeData.membros.includes(usuarioAtual.uid)) {
                alert("Você já faz parte do time: " + timeData.nome);
                recusarConvite(); // Limpa a URL
                return;
            }

            // Exibe a caixinha laranja de convite pendente
            const areaConvite = document.getElementById('convite-pendente-section');
            if(areaConvite) {
                areaConvite.classList.remove('hidden');
                document.getElementById('nome-time-convite').innerText = timeData.nome;
            }
        } else {
            alert("Este convite é inválido ou o time foi apagado.");
            recusarConvite();
        }
    } catch (erro) {
        console.error("Erro ao ler convite:", erro);
        alert("Erro ao abrir convite: " + erro.message);
        recusarConvite();
    }
};

// SUBSTITUA A SUA recusarConvite() ATUAL POR ESTA AQUI:
window.recusarConvite = () => {
    // Esconde a área de convite para sumir da tela
    const areaConvite = document.getElementById('convite-pendente-section');
    if(areaConvite) areaConvite.classList.add('hidden');
    
    // Limpa o ?convite=ID da barra de endereços (URL)
    window.history.replaceState(null, null, window.location.pathname);
    
    // Atualiza o lobby com os times
    abrirLobby();
};

// E PARA GARANTIR, SUBSTITUA SUA aceitarConvite() POR ESTA:
window.aceitarConvite = async () => {
    try {
        await updateDoc(doc(db, "times", conviteId), {
            membros: arrayUnion(usuarioAtual.uid)
        });
        alert("Show! Você entrou no time.");
        
        // A função recusarConvite já limpa a tela e a URL, reaproveitamos ela:
        recusarConvite(); 
    } catch(e) { 
        alert("Erro ao entrar: " + e.message); 
    }
};


// 7. VESTIÁRIO E MODAIS
window.voltarParaLobby = () => {
    timeAtualId = null;
    abrirLobby();
};

window.abrirModalJogo = () => { 
    document.getElementById('modal-chamar-jogo').classList.remove('hidden'); 
    
    // 1. Já preenche com a data atual automaticamente
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    document.getElementById('jogo-data').value = dataFormatada;
    
    // 2. Preenche com um horário padrão inicial (ex: 20:00)
    document.getElementById('jogo-inicio').value = "20:00";
    
    // 3. Força o cálculo inicial para a tela não ficar vazia
    calcularFimJogo();
};

window.fecharModalJogo = () => { document.getElementById('modal-chamar-jogo').classList.add('hidden'); };

// NOVA FUNÇÃO: Calcula automaticamente a hora final
window.calcularFimJogo = () => {
    const inicio = document.getElementById('jogo-inicio').value;
    const duracao = parseFloat(document.getElementById('jogo-duracao').value);
    
    if (!inicio) return;

    // Quebra a string "20:00" em horas e minutos
    const [horas, minutos] = inicio.split(':').map(Number);
    
    // Usa o Date do JS para calcular os minutos
    let tempo = new Date();
    tempo.setHours(horas);
    tempo.setMinutes(minutos);
    
    // Adiciona a duração convertida em minutos
    tempo.setMinutes(tempo.getMinutes() + (duracao * 60));
    
    // Formata o resultado para "HH:MM" com dois dígitos sempre
    const horaFim = String(tempo.getHours()).padStart(2, '0');
    const minFim = String(tempo.getMinutes()).padStart(2, '0');
    
    const tempoFinal = `${horaFim}:${minFim}`;
    
    // Mostra na tela
    document.getElementById('jogo-fim-display').innerText = tempoFinal;
    // Salva escondido para o banco de dados puxar depois
    document.getElementById('jogo-fim-display').setAttribute('data-fim', tempoFinal);
};

window.copiarLinkTime = () => {
    const link = `${window.location.origin}${window.location.pathname}?convite=${timeAtualId}`;
    navigator.clipboard.writeText(link).then(() => alert("Link copiado! Mande no WhatsApp."));
};

// ATUALIZAÇÃO 1: Entrar no vestiário e mostrar/esconder painel admin
window.entrarNoVestiario = async (timeId, nomeTime, adminUid) => {
    esconderTudo();
    timeAtualId = timeId;
    
    document.getElementById('team-section').classList.remove('hidden');
    document.getElementById('titulo-time').innerText = nomeTime;

    // Se for Admin, mostra o painel bonito de convocar/convite
    const adminPanel = document.getElementById('admin-panel');
    if (usuarioAtual.uid === adminUid) {
        adminPanel.classList.remove('hidden');
    } else {
        adminPanel.classList.add('hidden');
    }

    carregarJogos();
};


// 8. LOGICA DE JOGOS, RATEIO E QUADRA
window.mascaraMoeda = (campo) => {
    let v = campo.value.replace(/\D/g, '');
    if (!v) { campo.value = ""; return; }
    v = (parseInt(v, 10) / 100).toFixed(2) + '';
    campo.value = "R$ " + v.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
};

window.criarJogo = async () => {
    const local = document.getElementById('jogo-local').value;
    const quadra = document.getElementById('jogo-quadra').value;
    const data = document.getElementById('jogo-data').value;
    const inicio = document.getElementById('jogo-inicio').value;
    const valorSujo = document.getElementById('jogo-valor').value;
    
    // Puxa o valor calculado pela função que fizemos acima
    const fim = document.getElementById('jogo-fim-display').getAttribute('data-fim');

    if(!local || !data || !valorSujo) return alert("Preencha local, data e valor!");
    const valorLimpo = parseFloat(valorSujo.replace("R$ ", "").replace(/\./g, "").replace(",", "."));

    try {
        await addDoc(collection(db, "times", timeAtualId, "jogos"), {
            local: local, quadra: quadra, data: data, horarioInicio: inicio, horarioFim: fim, valorTotal: valorLimpo, dataCriacao: new Date().toISOString()
        });
        
        alert("📢 Convocação enviada com sucesso!");
        
        document.getElementById('jogo-local').value = "";
        document.getElementById('jogo-quadra').value = "";
        document.getElementById('jogo-valor').value = "";
        fecharModalJogo();
        carregarJogos();
    } catch (e) { alert("Erro ao agendar a partida."); }
};

// Variáveis globais para os "olheiros" de tempo real
let listenersAtivos = [];
let unsubJogoAtual = null;
let unsubConfirmadosAtual = null;

// ATUALIZAÇÃO 2: Desenhar os Cards de Jogo na Horizontal
window.carregarJogos = () => { 
    const divJogos = document.getElementById('lista-jogos');
    divJogos.innerHTML = "<p class='text-zinc-500 text-sm'>Buscando partidas...</p>";

    listenersAtivos.forEach(unsub => unsub());
    listenersAtivos = [];

    const unsubJogos = onSnapshot(collection(db, "times", timeAtualId, "jogos"), (snapJogos) => {
        if (snapJogos.empty) {
            divJogos.innerHTML = `
                <div class="game-card p-5 rounded-2xl w-full border border-zinc-800 border-dashed opacity-50 flex items-center justify-center">
                    <p class="text-zinc-500 text-sm font-bold">Nenhuma convocação ativa.</p>
                </div>`;
            carregarMembros(); 
            return;
        }
        
        divJogos.innerHTML = ""; 

        snapJogos.forEach((docSnap) => {
            const jogo = docSnap.data();
            const jogoId = docSnap.id;
            
            const dataF = jogo.data ? jogo.data.split('-').reverse().join('/') : "A definir";
            const local = jogo.local || "Quadra";
            const inicio = jogo.horarioInicio || "--:--";
            
            // CARD DE JOGO NOVO (Tailwind)
            divJogos.innerHTML += `
                <div onclick="abrirJogo('${jogoId}')" class="game-card p-5 rounded-2xl space-y-4 cursor-pointer active:scale-95 transition-transform shrink-0">
                    <div class="flex justify-between items-start">
                        <span class="bg-neon-orange/10 text-neon-orange text-[10px] font-black px-2 py-1 rounded uppercase">Convocado</span>
                        <p class="text-zinc-500 text-xs font-bold">📅 ${dataF}</p>
                    </div>
                    <div>
                        <h4 class="font-bold text-lg text-white truncate max-w-[180px]">${local}</h4>
                        <div class="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                            <i class="fa-regular fa-clock"></i>
                            <span>${inicio}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        carregarMembros();
    });
    
    listenersAtivos.push(unsubJogos);
};

// ATUALIZAÇÃO 4: ABRIR JOGO E MONTAR A NOVA QUADRA
window.abrirJogo = async (jogoId) => {
    try {
        esconderTudo();
        jogoAtualId = jogoId;
        
        const telaJogo = document.getElementById('game-section');
        if (!telaJogo) return alert("Erro: tela de jogo não encontrada.");
        
        telaJogo.classList.remove('hidden');
        const divDetalhes = document.getElementById('detalhes-jogo-ativo');
        divDetalhes.innerHTML = "<p class='text-zinc-500 text-center mt-20'>Montando a quadra...</p>";

        // Verifica se é o Admin (para mostrar o botão de cancelar)
        let ehAdmin = false;
        const timeSnap = await getDoc(doc(db, "times", timeAtualId));
        if(timeSnap.exists() && timeSnap.data().adminUid === usuarioAtual.uid) {
            ehAdmin = true;
        }

        if (unsubJogoAtual) unsubJogoAtual();
        if (unsubConfirmadosAtual) unsubConfirmadosAtual();

        unsubJogoAtual = onSnapshot(doc(db, "times", timeAtualId, "jogos", jogoId), (jogoSnap) => {
            if(!jogoSnap.exists()) {
                divDetalhes.innerHTML = "<p class='text-red-500 text-center mt-20 font-bold'>Esta partida foi encerrada ou cancelada.</p>";
                return;
            }
            
            const jogo = jogoSnap.data();
            
            unsubConfirmadosAtual = onSnapshot(collection(db, "times", timeAtualId, "jogos", jogoId, "confirmados"), (snapConfirmados) => {
                let quantidadeConfirmados = snapConfirmados.size;
                let chipsJogadores = "";
                let euJaConfirmei = false;

                snapConfirmados.forEach((conf) => {
                    const jogador = conf.data();
                    if (conf.id === usuarioAtual.uid) euJaConfirmei = true;
                    const primeiroNome = jogador.nome ? jogador.nome.split(" ")[0] : "Player";
                    
                    // Chip novo do jogador na quadra
                    chipsJogadores += `<div class="player-chip px-3 py-1 rounded-full text-[10px] font-bold text-white">${primeiroNome}</div>`;
                });

                // Dados da Partida
                const dataF = jogo.data ? jogo.data.split('-').reverse().join('/') : "A definir";
                const valorQuadra = jogo.valorTotal || 0;
                const localJogo = jogo.local || "Arena";
                const inicio = jogo.horarioInicio || "--:--";
                const fim = jogo.horarioFim || "--:--";
                
                // Lógica de Rateio
                let rateioHtml = "";
                if (quantidadeConfirmados > 0) {
                    const valorPorPessoa = valorQuadra / quantidadeConfirmados;
                    const valorF = valorPorPessoa.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    const totalF = valorQuadra.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    
                    rateioHtml = `
                        <div class="space-y-1">
                            <p class="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Total Quadra</p>
                            <p class="text-xl font-extrabold tracking-tight">R$ ${totalF}</p>
                        </div>
                        <div class="space-y-1">
                            <p class="neon-orange text-[10px] font-black uppercase tracking-widest">Por Pessoa</p>
                            <p class="text-2xl font-black tracking-tight text-white">R$ ${valorF}</p>
                        </div>
                    `;
                } else {
                    const totalF = valorQuadra.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    rateioHtml = `
                        <div class="col-span-2 text-center py-2 border border-dashed border-zinc-800 rounded-xl">
                            <p class="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Valor Total (Ninguém confirmou)</p>
                            <p class="text-xl font-extrabold tracking-tight text-white">R$ ${totalF}</p>
                        </div>
                    `;
                }

                // Botão de Confirmação
                let botaoAcao = euJaConfirmei 
                    ? `<button class="w-full bg-zinc-900 border border-zinc-800 text-green-500 font-black py-5 rounded-2xl text-lg flex items-center justify-center gap-3 cursor-default">
                           <i class="fa-solid fa-circle-check"></i> PRESENÇA CONFIRMADA
                       </button>`
                    : `<button onclick="confirmarPresenca('${jogoId}')" class="action-button-main w-full bg-neon-orange text-white font-black py-5 rounded-2xl text-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
                           <i class="fa-solid fa-hand-raised"></i> EU VOU!
                       </button>`;
                       
                // Botão Cancelar (Apenas Admin)
                let areaAdmin = ehAdmin 
                    ? `<section class="px-6 pt-8 border-t border-zinc-900/50">
                           <div class="text-center space-y-4">
                               <p class="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Área do Organizador</p>
                               <button onclick="cancelarJogo('${jogoId}')" class="text-red-500/50 font-bold text-sm py-3 px-6 rounded-xl border border-red-500/10 active:bg-red-500/5 active:text-red-500 transition-all">
                                   <i class="fa-solid fa-circle-xmark mr-2"></i> Cancelar Partida
                               </button>
                           </div>
                       </section>`
                    : "";

                // MONTAGEM DO HTML FINAL
                divDetalhes.innerHTML = `
                    <header class="p-6 space-y-2">
                        <button onclick="voltarParaVestiario()" class="mb-4 text-zinc-500 flex items-center gap-2 font-bold text-sm active:scale-95 transition-all">
                            <i class="fa-solid fa-chevron-left"></i> Voltar
                        </button>
                        <h1 class="text-2xl font-black tracking-tight">${localJogo}</h1>
                        <div class="flex items-center gap-4 text-zinc-400 text-sm font-medium">
                            <div class="flex items-center gap-1.5">
                                <i class="fa-regular fa-calendar neon-orange"></i> <span>${dataF}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <i class="fa-regular fa-clock neon-orange"></i> <span>${inicio} - ${fim}</span>
                            </div>
                        </div>
                    </header>

                    <main class="space-y-8">
                        <section id="court-view" class="px-6">
                            <div class="court-bg rounded-3xl p-6 border border-zinc-800 shadow-2xl">
                                <div class="text-center mb-6">
                                    <span class="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Visualização da Quadra</span>
                                </div>
                                <div class="court-lines aspect-[3/4] rounded-lg flex flex-col justify-around p-4">
                                    <div class="court-net"></div>
                                    <div class="flex flex-wrap justify-center gap-2 z-10">
                                        ${chipsJogadores}
                                    </div>
                                </div>
                                <div class="mt-6 flex justify-center items-center gap-2">
                                    <div class="flex -space-x-1">
                                        <div class="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] font-bold text-white">${quantidadeConfirmados}</div>
                                    </div>
                                    <p class="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Jogadores Confirmados</p>
                                </div>
                            </div>
                        </section>

                        <section id="finance" class="px-6">
                            <div class="financial-card rounded-2xl p-6 space-y-6">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                        <i class="fa-solid fa-wallet text-green-500"></i>
                                    </div>
                                    <h3 class="font-bold text-zinc-300">Rateio da Partida</h3>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    ${rateioHtml}
                                </div>
                            </div>
                        </section>

                        <section class="px-6 pb-4">
                            ${botaoAcao}
                        </section>
                        
                        ${areaAdmin}
                    </main>
                `;
            });
        });
    } catch (erro) {
        alert("Ops, aconteceu um erro: " + erro.message);
        console.error(erro);
    }
};

// 3. SAIR DA TELA DE JOGO E VOLTAR PRO DASHBOARD
window.voltarParaVestiario = () => {
    jogoAtualId = null;
    
    // Desliga os olheiros da quadra para economizar dados de internet
    if (unsubJogoAtual) unsubJogoAtual();
    if (unsubConfirmadosAtual) unsubConfirmadosAtual();
    
    esconderTudo();
    document.getElementById('team-section').classList.remove('hidden');
};

window.confirmarPresenca = async (jogoIdParam) => {
    // Se o ID não veio direto, usa a variável global jogoAtualId
    const idDoJogo = jogoIdParam || jogoAtualId;
    
    try {
        await setDoc(doc(db, "times", timeAtualId, "jogos", idDoJogo, "confirmados", usuarioAtual.uid), {
            nome: perfilUsuario.nome,
            dataConfirmacao: new Date().toISOString()
        });
        // Como estamos usando o onSnapshot, a tela vai atualizar sozinha!
    } catch (e) { 
        alert("Erro ao confirmar presença: " + e.message); 
    }
};


// ATUALIZAÇÃO 3: Desenhar os cards do Elenco e atualizar o contador
window.carregarMembros = async () => {
    const divMembros = document.getElementById('lista-membros');
    const contadorMembros = document.getElementById('contador-membros');
    divMembros.innerHTML = "<p class='text-zinc-500 text-center text-sm'>Buscando elenco...</p>";

    try {
        const docSnap = await getDoc(doc(db, "times", timeAtualId));
        if (!docSnap.exists()) return;
        
        const membrosIds = docSnap.data().membros || [];
        contadorMembros.innerText = membrosIds.length; // Atualiza o número no HTML
        divMembros.innerHTML = "";

        for (const uid of membrosIds) {
            const userSnap = await getDoc(doc(db, "usuarios", uid));
            if (userSnap.exists()) {
                const u = userSnap.data();
                
                const ehAdmin = (uid === docSnap.data().adminUid);
                const badgeAdmin = ehAdmin ? `<span class="bg-zinc-800 text-zinc-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Admin</span>` : "";
                const borderAvatar = ehAdmin ? "border-neon-orange" : "border-zinc-800";
                const corTextoAvatar = ehAdmin ? "text-neon-orange" : "text-zinc-500";
                
                const letraInicial = u.nome ? u.nome.charAt(0).toUpperCase() : "?";
                const primeiroNome = u.nome ? u.nome.split(" ")[0] : "Jogador";

                // CARD DO ELENCO NOVO (Tailwind)
                divMembros.innerHTML += `
                    <div class="player-card p-3 rounded-2xl flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full border-2 ${borderAvatar} flex items-center justify-center bg-zinc-900 ${corTextoAvatar} font-bold text-xl">
                                ${letraInicial}
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h4 class="font-bold text-white">${primeiroNome}</h4>
                                    ${badgeAdmin}
                                </div>
                                <p class="text-zinc-500 text-xs">Jogador(a)</p>
                            </div>
                        </div>
                        <div class="bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 flex items-center gap-1">
                            <i class="fa-solid fa-star text-[10px] text-zinc-500"></i>
                            <span class="text-sm font-black text-zinc-400">5.0</span>
                        </div>
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error("Erro Elenco:", e);
        divMembros.innerHTML = "<p class='text-red-500 text-center'>Erro ao listar elenco.</p>";
    }
};

// NOVA FUNÇÃO: Atualiza os dados do vestiário manualmente
window.atualizarVestiario = async () => {
    const btn = document.getElementById('btn-atualizar');
    
    // Muda o visual do botão para mostrar que está carregando
    btn.innerText = "⏳ Buscando...";
    btn.style.opacity = "0.7";
    btn.disabled = true;

    try {
        // Como a função carregarJogos() já chama a carregarMembros() no final, 
        // chamar ela já atualiza a quadra, o rateio e o elenco de uma vez só!
        await carregarJogos();
    } catch (e) {
        console.error("Erro ao atualizar:", e);
    } finally {
        // Volta o botão ao estado normal
        btn.innerText = "🔄 Atualizar";
        btn.style.opacity = "1";
        btn.disabled = false;
    }
};

// 3.5 CANCELAR JOGO (Excluir do Banco)
window.cancelarJogo = async (jogoId) => {
    // Pede uma confirmação antes de apagar para evitar cliques acidentais
    const confirmacao = confirm("Tem certeza que deseja cancelar e apagar esta partida? Essa ação não pode ser desfeita.");
    
    if (confirmacao) {
        try {
            // Apaga o documento do jogo na coleção do Firestore
            await deleteDoc(doc(db, "times", timeAtualId, "jogos", jogoId));
            
            alert("Partida cancelada com sucesso!");
            
            // Volta para a tela principal do time (o vestiário vai atualizar sozinho)
            voltarParaVestiario();
        } catch (erro) {
            alert("Erro ao cancelar o jogo: " + erro.message);
            console.error(erro);
        }
    }
};

// ==========================================
// NAVEGAÇÃO INTERNA DO VESTIÁRIO (TABS)
// ==========================================

window.mudarAbaVestiario = (abaDesejada) => {
    // 1. Esconde todas as abas
    const abas = ['time', 'jogos', 'stats', 'ajustes'];
    abas.forEach(aba => {
        document.getElementById(`aba-${aba}`).classList.add('hidden');
    });

    // 2. Mostra a aba que o usuário clicou
    document.getElementById(`aba-${abaDesejada}`).classList.remove('hidden');

    // 3. Reseta a cor de todos os botões do menu de baixo para cinza (zinc-600)
    const botoes = document.querySelectorAll('.nav-btn');
    botoes.forEach(btn => {
        btn.classList.remove('neon-orange');
        btn.classList.add('text-zinc-600');
    });

    // 4. Pinta o botão clicado de laranja (neon-orange)
    const btnAtivo = document.getElementById(`btn-nav-${abaDesejada}`);
    btnAtivo.classList.remove('text-zinc-600');
    btnAtivo.classList.add('neon-orange');
};

// ==========================================
// TELA MEU PERFIL (FUT CARD)
// ==========================================
window.abrirMeuPerfil = () => {
    esconderTudo();
    document.getElementById('meu-perfil-screen').classList.remove('hidden');

    if (perfilUsuario) {
        const nomeCompleto = perfilUsuario.nome || "Jogador";
        
        // 1. Lógica da Foto de Perfil
        const avatarDiv = document.getElementById('perfil-avatar-letra');
        if (perfilUsuario.foto) {
            // Se tem foto, coloca a imagem
            avatarDiv.innerHTML = `<img src="${perfilUsuario.foto}" class="w-full h-full object-cover rounded-full">`;
            avatarDiv.classList.remove('text-neon-orange', 'font-black', 'text-4xl'); // Tira o estilo da letra
        } else {
            // Se não tem foto, mostra a 1ª letra do nome
            const letra = nomeCompleto.charAt(0).toUpperCase();
            avatarDiv.innerHTML = letra;
            avatarDiv.classList.add('text-neon-orange', 'font-black', 'text-4xl');
        }

        // 2. Atualiza o Nome
        const primeiroNome = nomeCompleto.split(" ")[0].toUpperCase();
        document.getElementById('perfil-nome-fut').innerText = primeiroNome;

        // 3. Atualiza a Posição na Carta
        const siglaPosicao = perfilUsuario.posicao || "JOG";
        document.getElementById('perfil-posicao').innerText = siglaPosicao;
    }
};

// ==========================================
// CONFIGURAÇÕES DO PERFIL (FOTO, NOME, POSIÇÃO)
// ==========================================

window.abrirConfigPerfil = () => {
    document.getElementById('modal-config-perfil').classList.remove('hidden');
    
    // Preenche os campos com os dados que já temos
    if (perfilUsuario) {
        document.getElementById('edit-nome').value = perfilUsuario.nome || '';
        document.getElementById('edit-telefone').value = perfilUsuario.telefone || '';
        document.getElementById('edit-posicao').value = perfilUsuario.posicao || 'JOG';
    }
};

window.fecharConfigPerfil = () => {
    document.getElementById('modal-config-perfil').classList.add('hidden');
};

window.salvarConfigPerfil = async () => {
    const nome = document.getElementById('edit-nome').value;
    const telefone = document.getElementById('edit-telefone').value;
    const posicao = document.getElementById('edit-posicao').value;
    const fotoInput = document.getElementById('edit-foto');

    if(!nome) return alert("O nome não pode ficar vazio!");

    const btnSalvar = document.querySelector('#modal-config-perfil button[onclick="salvarConfigPerfil()"]');
    btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    btnSalvar.disabled = true;

    try {
        let dadosAtualizados = { nome, telefone, posicao };

        // Se o usuário selecionou uma foto, vamos redimensionar e comprimir
        if (fotoInput.files && fotoInput.files[0]) {
            const file = fotoInput.files[0];
            
            // Função interna para redimensionar a imagem em um Canvas do navegador
            const comprimirImagem = (arquivoParaComprimir) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(arquivoParaComprimir);
                    reader.onload = (event) => {
                        const img = new Image();
                        img.src = event.target.result;
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 300; // Largura máxima ideal para foto de perfil
                            const MAX_HEIGHT = 300; // Altura máxima
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                                if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                }
                            } else {
                                if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            // Converte para JPEG com qualidade de 70% (fica leve e com ótima qualidade)
                            resolve(canvas.toDataURL('image/jpeg', 0.7));
                        };
                    };
                });
            };

            // Executa a compressão da imagem pesada
            dadosAtualizados.foto = await comprimirImagem(file);
        }

        // Salva os dados otimizados no Firestore
        await updateDoc(doc(db, "usuarios", usuarioAtual.uid), dadosAtualizados);
        
        perfilUsuario = { ...perfilUsuario, ...dadosAtualizados };
        alert("Perfil atualizado com sucesso!");
        
        fecharConfigPerfil();
        abrirMeuPerfil();

    } catch (erro) {
        alert("Erro ao salvar: " + erro.message);
        console.error(erro);
    } finally {
        btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações';
        btnSalvar.disabled = false;
    }
};

// ==========================================
// SISTEMA DE AMIGOS
// ==========================================

// ==========================================
// SISTEMA DE AMIGOS
// ==========================================
let unsubSolicitacoes = null;
let unsubAmigos = null;

window.abrirAmigos = () => {
    esconderTudo();
    document.getElementById('amigos-section').classList.remove('hidden');
    // Limpa a busca ao abrir
    document.getElementById('input-busca-amigo').value = "";
    document.getElementById('resultados-busca-section').classList.add('hidden');
    
    // Dispara os "olheiros" em tempo real
    carregarSolicitacoes();
    carregarMeusAmigos();
};

// Gera o link de amizade e copia para o celular
window.copiarLinkAmizade = () => {
    const link = `${window.location.origin}${window.location.pathname}?amigo=${usuarioAtual.uid}`;
    navigator.clipboard.writeText(link).then(() => alert("Link de amizade copiado! Cole no WhatsApp da galera."));
};

const limparUrlAmigo = () => {
    window.history.replaceState(null, null, window.location.pathname);
};

// ==========================================
// BUSCA E ENVIO DE SOLICITAÇÃO
// ==========================================
window.buscarUsuarios = async () => {
    const termoBusca = document.getElementById('input-busca-amigo').value.trim();
    const areaResultados = document.getElementById('resultados-busca-section');
    const divResultados = document.getElementById('lista-resultados-busca');
    
    if (termoBusca.length < 3) {
        areaResultados.classList.add('hidden');
        return;
    }

    areaResultados.classList.remove('hidden');
    divResultados.innerHTML = `<p class="text-zinc-500 text-sm text-center py-4">Buscando <i class="fa-solid fa-spinner fa-spin"></i></p>`;

    try {
        let resultados = [];
        const isTelefone = /^[0-9\-\(\)\s]+$/.test(termoBusca) && termoBusca.replace(/\D/g, '').length >= 8;

        if (isTelefone) {
            const qTel = query(collection(db, "usuarios"), where("telefone", "==", termoBusca));
            const snapTel = await getDocs(qTel);
            snapTel.forEach(doc => resultados.push({ id: doc.id, ...doc.data() }));
        } else {
            const qNome = query(collection(db, "usuarios"), 
                              where("nome", ">=", termoBusca),
                              where("nome", "<=", termoBusca + '\uf8ff'));
            const snapNome = await getDocs(qNome);
            snapNome.forEach(doc => resultados.push({ id: doc.id, ...doc.data() }));
        }

        divResultados.innerHTML = "";

        if (resultados.length === 0) {
            divResultados.innerHTML = `<p class="text-zinc-500 text-sm text-center">Ninguém encontrado.<br><span class="text-[10px]">Dica: para telefone, digite com DDD e traço, ex: (16) 99999-9999</span></p>`;
            return;
        }

        resultados.forEach((userBuscado) => {
            const uidBuscado = userBuscado.id;
            // Não mostra a si mesmo e não mostra quem já é amigo
            if(uidBuscado === usuarioAtual.uid) return;
            if(perfilUsuario.amigos && perfilUsuario.amigos.includes(uidBuscado)) return;

            const primeiraLetra = userBuscado.nome ? userBuscado.nome.charAt(0).toUpperCase() : "?";

            divResultados.innerHTML += `
                <div class="friend-card rounded-2xl p-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-900 text-zinc-500 font-bold">
                            ${primeiraLetra}
                        </div>
                        <div>
                            <h4 class="font-bold text-sm text-white">${userBuscado.nome}</h4>
                            <p class="text-[10px] text-zinc-500 uppercase font-black">${userBuscado.telefone || "Jogador"}</p>
                        </div>
                    </div>
                    <button onclick="enviarSolicitacao('${uidBuscado}')" class="w-8 h-8 rounded-lg bg-neon-orange/10 text-neon-orange flex items-center justify-center active:scale-95 transition-all">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>
            `;
        });
    } catch (erro) {
        divResultados.innerHTML = `<p class="text-red-500 text-sm text-center">Erro ao buscar.</p>`;
    }
};

window.enviarSolicitacao = async (uidDestino) => {
    try {
        // Grava na subcoleção "solicitacoes" do destino
        const docRef = doc(db, "usuarios", uidDestino, "solicitacoes", usuarioAtual.uid);
        await setDoc(docRef, {
            uid: usuarioAtual.uid,
            nome: perfilUsuario.nome,
            data: new Date().toISOString()
        });
        
        alert("Solicitação enviada com sucesso!");
        
        // Limpa a busca
        document.getElementById('input-busca-amigo').value = "";
        document.getElementById('resultados-busca-section').classList.add('hidden');
    } catch (e) {
        alert("Erro ao enviar: " + e.message);
    }
};

window.verificarConviteAmizade = async () => {
    await abrirLobby(); // Abre o lobby no fundo para não bugar a tela
    
    if(amigoId === usuarioAtual.uid) {
        alert("Você não pode adicionar a si mesmo!");
        limparUrlAmigo();
        return;
    }
    
    try {
        const amigoSnap = await getDoc(doc(db, "usuarios", amigoId));
        if (amigoSnap.exists()) {
            const nomeAmigo = amigoSnap.data().nome;
            const confirmacao = confirm(`Você recebeu um pedido de amizade de ${nomeAmigo}. Deseja enviar uma solicitação de volta?`);
            
            if (confirmacao) {
                await enviarSolicitacao(amigoId);
            }
        } else {
            alert("Este link de amizade é inválido ou expirou.");
        }
    } catch(e) {
        alert("Erro ao buscar convite: " + e.message);
    }
    limparUrlAmigo();
};

// ==========================================
// LISTAGEM E AÇÕES DE SOLICITAÇÕES
// ==========================================
window.carregarSolicitacoes = () => {
    const divSol = document.getElementById('lista-solicitacoes');
    if (unsubSolicitacoes) unsubSolicitacoes();
    
    unsubSolicitacoes = onSnapshot(collection(db, "usuarios", usuarioAtual.uid, "solicitacoes"), (snap) => {
        if (snap.empty) {
            divSol.innerHTML = `<p class="text-zinc-500 text-xs italic">Nenhuma solicitação no momento.</p>`;
            return;
        }
        
        divSol.innerHTML = "";
        snap.forEach((docSnap) => {
            const sol = docSnap.data();
            const uidRemetente = docSnap.id;
            const letra = sol.nome ? sol.nome.charAt(0).toUpperCase() : "?";
            
            divSol.innerHTML += `
                <div class="friend-card rounded-2xl p-4 flex items-center justify-between border-l-2 border-l-neon-orange">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-900 text-neon-orange font-black">
                            ${letra}
                        </div>
                        <div>
                            <h4 class="font-bold text-sm text-white">${sol.nome}</h4>
                            <p class="text-[10px] text-zinc-500 uppercase font-black">Quer conectar</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="recusarAmizade('${uidRemetente}')" class="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center active:scale-95 transition-all">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                        <button onclick="aceitarAmizade('${uidRemetente}')" class="w-8 h-8 rounded-lg bg-neon-orange text-white flex items-center justify-center active:scale-95 transition-all shadow-neon">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    });
};

window.aceitarAmizade = async (uidAmigo) => {
    try {
        // 1. Adiciona o amigo na MINHA lista
        await updateDoc(doc(db, "usuarios", usuarioAtual.uid), {
            amigos: arrayUnion(uidAmigo)
        });
        
        // 2. Me adiciona na lista do AMIGO
        await updateDoc(doc(db, "usuarios", uidAmigo), {
            amigos: arrayUnion(usuarioAtual.uid)
        });
        
        // 3. Deleta a notificação
        await deleteDoc(doc(db, "usuarios", usuarioAtual.uid, "solicitacoes", uidAmigo));
        
    } catch(e) {
        alert("Erro ao aceitar amizade: " + e.message);
    }
};

window.recusarAmizade = async (uidAmigo) => {
    try {
        await deleteDoc(doc(db, "usuarios", usuarioAtual.uid, "solicitacoes", uidAmigo));
    } catch(e) {
        console.error("Erro ao recusar: ", e);
    }
};

// ==========================================
// LISTAGEM DOS AMIGOS CONFIRMADOS
// ==========================================
window.carregarMeusAmigos = () => {
    const divAmigos = document.getElementById('lista-amigos');
    if (unsubAmigos) unsubAmigos();
    
    // Fica de olho no documento do usuário atual para ver se o array 'amigos' muda
    unsubAmigos = onSnapshot(doc(db, "usuarios", usuarioAtual.uid), async (docSnap) => {
        if (!docSnap.exists()) return;
        
        perfilUsuario = docSnap.data(); // Atualiza a global por garantia
        const amigosIds = perfilUsuario.amigos || [];
        
        if (amigosIds.length === 0) {
            divAmigos.innerHTML = `<p class="text-zinc-500 text-xs italic">Você ainda não adicionou amigos.</p>`;
            return;
        }
        
        divAmigos.innerHTML = `<p class="text-zinc-500 text-xs text-center"><i class="fa-solid fa-spinner fa-spin"></i> Carregando rede...</p>`;
        
        let htmlAmigos = "";
        
        // Faz a busca do nome e dados reais de cada amigo do array
        for (const uidAmigo of amigosIds) {
            try {
                const amigoSnap = await getDoc(doc(db, "usuarios", uidAmigo));
                if (amigoSnap.exists()) {
                    const amg = amigoSnap.data();
                    const letra = amg.nome ? amg.nome.charAt(0).toUpperCase() : "?";
                    const pos = amg.posicao || "JOG";
                    
                    htmlAmigos += `
                        <div class="friend-card rounded-2xl p-4 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="relative">
                                    <div class="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-900 text-zinc-500 font-bold">
                                        ${letra}
                                    </div>
                                    <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#18181b]"></div>
                                </div>
                                <div>
                                    <h4 class="font-bold text-sm text-white">${amg.nome}</h4>
                                    <p class="text-[10px] text-zinc-500 uppercase font-black">Posição: ${pos}</p>
                                </div>
                            </div>
                            <button class="text-zinc-500 hover:text-neon-orange transition-colors p-2">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </button>
                        </div>
                    `;
                }
            } catch(err) {
                console.error("Erro ao buscar amigo:", err);
            }
        }
        divAmigos.innerHTML = htmlAmigos;
    });
};