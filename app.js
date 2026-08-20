// 1. IMPORTAÇÕES NECESSÁRIAS
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
            document.getElementById('saudacao').innerText = "Olá, " + perfilUsuario.nome.split(" ")[0];
            
            if (conviteId) {
                verificarConvite();
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
        document.getElementById('saudacao').innerText = "Olá, " + perfilUsuario.nome.split(" ")[0];
        
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

// Utilitário para limpar a tela
function esconderTudo() {
    ['login-section', 'perfil-section', 'register-section', 'invite-section', 'lobby-section', 'team-section', 'game-section', 'modal-criar-time', 'modal-chamar-jogo'].forEach(id => {
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
    
    const listaDiv = document.getElementById('lista-meus-times');
    listaDiv.innerHTML = "<p style='text-align: center;'>Buscando times...</p>";

    try {
        const q = query(collection(db, "times"), where("membros", "array-contains", usuarioAtual.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            listaDiv.innerHTML = "<p style='color: #888; text-align: center;'>Você ainda não está em nenhum time.</p>";
            return;
        }

        listaDiv.innerHTML = "";
        querySnapshot.forEach((docSnap) => {
            const time = docSnap.data();
            listaDiv.innerHTML += `
                <div class="time-item" onclick="entrarNoVestiario('${docSnap.id}', '${time.nome}', '${time.adminUid}')">
                    <span style="font-weight: bold; color: white;">🏐 ${time.nome}</span>
                    <span style="color: #ff6600;">➔</span>
                </div>
            `;
        });
    } catch (e) { 
        console.error("Erro Lobby:", e); 
        listaDiv.innerHTML = "<p>Erro ao carregar times.</p>";
    }
};

window.criarTime = async () => {
    const nome = document.getElementById('nome-time').value;
    if(!nome) return alert("Digite o nome!");
    try {
        await addDoc(collection(db, "times"), {
            nome: nome,
            adminUid: usuarioAtual.uid,
            membros: [usuarioAtual.uid]
        });
        document.getElementById('nome-time').value = "";
        document.getElementById('modal-criar-time').classList.add('hidden');
        abrirLobby(); 
    } catch (e) { alert("Erro ao criar: " + e.message); }
};


// 6. SISTEMA DE CONVITES
window.verificarConvite = async () => {
    esconderTudo();
    try {
        const docSnap = await getDoc(doc(db, "times", conviteId));
        if (docSnap.exists()) {
            document.getElementById('nome-time-convite').innerText = docSnap.data().nome;
            document.getElementById('invite-section').classList.remove('hidden');
        } else {
            alert("Esse convite é inválido.");
            recusarConvite();
        }
    } catch (e) { recusarConvite(); }
};

window.aceitarConvite = async () => {
    try {
        await updateDoc(doc(db, "times", conviteId), {
            membros: arrayUnion(usuarioAtual.uid)
        });
        alert("Você entrou no time!");
        recusarConvite(); // Reaproveitando função para limpar URL e ir pro lobby
    } catch(e) { alert("Erro ao entrar: " + e.message); }
};

window.recusarConvite = () => {
    window.history.replaceState(null, null, window.location.pathname);
    abrirLobby();
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

window.entrarNoVestiario = async (timeId, nomeTime, adminUid) => {
    esconderTudo();
    timeAtualId = timeId;
    
    document.getElementById('team-section').classList.remove('hidden');
    document.getElementById('titulo-time').innerText = nomeTime;

    // Controle de botões de Admin
    if (usuarioAtual.uid === adminUid) {
        document.getElementById('btn-chamar-jogo').classList.remove('hidden');
        document.getElementById('btn-convite-time').classList.remove('hidden');
    } else {
        document.getElementById('btn-chamar-jogo').classList.add('hidden');
        document.getElementById('btn-convite-time').classList.add('hidden');
    }

    // Puxa o nome do Organizador
    document.getElementById('nome-admin-time').innerText = "Buscando...";
    const adminSnap = await getDoc(doc(db, "usuarios", adminUid));
    if(adminSnap.exists()) {
        document.getElementById('nome-admin-time').innerText = adminSnap.data().nome;
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
    const data = document.getElementById('jogo-data').value;
    const inicio = document.getElementById('jogo-inicio').value;
    const valorSujo = document.getElementById('jogo-valor').value;
    
    // Puxa o valor calculado pela função que fizemos acima
    const fim = document.getElementById('jogo-fim-display').getAttribute('data-fim');

    if(!local || !data || !valorSujo) return alert("Preencha local, data e valor!");
    const valorLimpo = parseFloat(valorSujo.replace("R$ ", "").replace(/\./g, "").replace(",", "."));

    try {
        await addDoc(collection(db, "times", timeAtualId, "jogos"), {
            local: local, data: data, horarioInicio: inicio, horarioFim: fim, valorTotal: valorLimpo, dataCriacao: new Date().toISOString()
        });
        
        alert("📢 Convocação enviada com sucesso!");
        
        document.getElementById('jogo-local').value = "";
        document.getElementById('jogo-valor').value = "";
        fecharModalJogo();
        carregarJogos();
    } catch (e) { alert("Erro ao agendar a partida."); }
};

// Variáveis globais para os "olheiros" de tempo real
let listenersAtivos = [];
let unsubJogoAtual = null;
let unsubConfirmadosAtual = null;

// 1. CARREGA OS MINI-CARDS NO DASHBOARD DO TIME
window.carregarJogos = () => { 
    const divJogos = document.getElementById('lista-jogos');
    divJogos.innerHTML = "<p style='text-align: center; color: #888;'>Buscando partidas...</p>";

    // Limpa os olheiros do vestiário antigo para não sobrecarregar
    listenersAtivos.forEach(unsub => unsub());
    listenersAtivos = [];

    // Olheiro 1: Vigiando a lista de jogos para criar os mini-cards
    const unsubJogos = onSnapshot(collection(db, "times", timeAtualId, "jogos"), (snapJogos) => {
        if (snapJogos.empty) {
            divJogos.innerHTML = "<div class='card' style='text-align:center;'><p style='margin:0; color:#888;'>Nenhuma convocação ativa.</p></div>";
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
            
            // Cria o MINI-CARD clicável
            divJogos.innerHTML += `
                <div class="time-item" onclick="abrirJogo('${jogoId}')" style="border-left: 4px solid #0099ff;">
                    <div>
                        <span style="font-weight: bold; color: white; display:block; font-size: 16px;">🏐 ${local}</span>
                        <span style="color: #888; font-size: 12px;">📅 ${dataF} | ⏰ ${inicio}</span>
                    </div>
                    <span style="color: #0099ff; font-size: 20px;">➔</span>
                </div>
            `;
        });
        
        carregarMembros();
    });
    
    listenersAtivos.push(unsubJogos);
};

// 2. ABRIR A TELA DO JOGO ESPECÍFICO E DESENHAR A QUADRA
window.abrirJogo = async (jogoId) => {
    try {
        esconderTudo();
        jogoAtualId = jogoId;
        
        // Verifica se o HTML da tela do jogo realmente existe
        const telaJogo = document.getElementById('game-section');
        if (!telaJogo) {
            alert("ERRO: A tela 'game-section' sumiu do seu index.html!");
            document.getElementById('team-section').classList.remove('hidden');
            return;
        }
        
        telaJogo.classList.remove('hidden');
        
        const divDetalhes = document.getElementById('detalhes-jogo-ativo');
        divDetalhes.innerHTML = "<p style='text-align: center; color: #aaa;'>Montando a quadra...</p>";

        // Busca quem é o admin
        const timeSnap = await getDoc(doc(db, "times", timeAtualId));
        if(timeSnap.exists() && timeSnap.data().adminUid === usuarioAtual.uid) {
            const btnCancelar = document.getElementById('btn-cancelar-jogo');
            if(btnCancelar) {
                btnCancelar.classList.remove('hidden');
                btnCancelar.onclick = () => cancelarJogo(jogoId);
            }
        } else {
            const btnCancelar = document.getElementById('btn-cancelar-jogo');
            if(btnCancelar) btnCancelar.classList.add('hidden');
        }

        if (unsubJogoAtual) unsubJogoAtual();
        if (unsubConfirmadosAtual) unsubConfirmadosAtual();

        unsubJogoAtual = onSnapshot(doc(db, "times", timeAtualId, "jogos", jogoId), (jogoSnap) => {
            if(!jogoSnap.exists()) {
                divDetalhes.innerHTML = "<p style='text-align:center; color: #ff4444;'>Esta partida foi encerrada ou cancelada.</p>";
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
                    chipsJogadores += `<div class="jogador-chip">${primeiroNome}</div>`;
                });

                const dataF = jogo.data ? jogo.data.split('-').reverse().join('/') : "A definir";
                const valorQuadra = jogo.valorTotal || 0;
                const localJogo = jogo.local || "Arena";
                const inicio = jogo.horarioInicio || "--:--";
                const fim = jogo.horarioFim || "--:--";
                
                let textoRateio = "";
                if (quantidadeConfirmados > 0) {
                    const valorPorPessoa = valorQuadra / quantidadeConfirmados;
                    const valorF = valorPorPessoa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    textoRateio = `<div class="valor-destaque">${valorF}</div><p style="margin:0; font-size: 12px; color: #888;">por pessoa (${quantidadeConfirmados} confirmados)</p>`;
                } else {
                    const valorTotalF = valorQuadra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    textoRateio = `<p style="margin:0; color: #aaa;">Valor total: ${valorTotalF}<br><span style="font-size: 12px;">(Ninguém confirmou ainda)</span></p>`;
                }

                let botaoAcao = euJaConfirmei 
                    ? `<button class="btn-secondary" style="color: #00cc66; cursor: default; width: 100%;">✅ Presença Confirmada!</button>`
                    : `<button class="btn-success" onclick="confirmarPresenca('${jogoId}')" style="width: 100%;">🙋‍♂️ Eu Vou!</button>`;

                divDetalhes.innerHTML = `
                    <div class="card" style="padding: 0; overflow: hidden; border: 1px solid #333; margin-top: 20px;">
                        <div style="padding: 15px; border-bottom: 1px solid #333;">
                            <h4 style="margin: 0 0 5px 0; color: #0099ff; font-size: 20px;">🏐 ${localJogo}</h4>
                            <p style="margin: 0; color: #ccc;">📅 ${dataF} | ⏰ ${inicio} às ${fim}</p>
                        </div>
                        <div style="padding: 15px;">
                            <div class="quadra-container">
                                <div class="quadra-meio"></div>
                                <div class="linha-ataque-cima"></div>
                                <div class="linha-ataque-baixo"></div>
                                <div class="jogadores-quadra">
                                    ${chipsJogadores}
                                </div>
                            </div>
                        </div>
                        <div style="padding: 15px; background: #1a1a1a;">
                            <div class="painel-rateio">
                                <p style="margin: 0 0 5px 0; font-weight: bold; color: white;">Rateio da Quadra</p>
                                ${textoRateio}
                            </div>
                            ${botaoAcao}
                        </div>
                    </div>
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


// 9. ELENCO DO TIME (Membros)
window.carregarMembros = async () => {
    const divMembros = document.getElementById('lista-membros');
    divMembros.innerHTML = "<p style='text-align: center;'>Buscando elenco...</p>";

    try {
        const docSnap = await getDoc(doc(db, "times", timeAtualId));
        if (!docSnap.exists()) return;
        
        const membrosIds = docSnap.data().membros || [];
        divMembros.innerHTML = "";

        for (const uid of membrosIds) {
            const userSnap = await getDoc(doc(db, "usuarios", uid));
            if (userSnap.exists()) {
                const u = userSnap.data();
                
                let badgeAdmin = (uid === docSnap.data().adminUid) 
                    ? `<span style="background: #ff6600; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">ADMIN</span>` 
                    : "";

                const letraInicial = u.nome ? u.nome.charAt(0).toUpperCase() : "?";
                const pontuacaoGeral = "5.0"; 

                divMembros.innerHTML += `
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #333; padding: 10px 0;">
                        <div style="display: flex; align-items: center;">
                            <div style="width: 40px; height: 40px; border-radius: 20px; background: #333; color: #ff6600; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; margin-right: 15px;">
                                ${letraInicial}
                            </div>
                            <div>
                                <p style="margin: 0; font-weight: bold; color: #fff;">${u.nome} ${badgeAdmin}</p>
                                <p style="margin: 0; font-size: 12px; color: #888;">Nível Básico</p>
                            </div>
                        </div>
                        
                        <div style="background: #1a1a1a; border: 1px solid #444; padding: 5px 10px; border-radius: 8px; text-align: center;">
                            <p style="margin: 0; font-size: 10px; color: #aaa;">Nota</p>
                            <p style="margin: 0; font-weight: bold; color: #00cc66;">⭐ ${pontuacaoGeral}</p>
                        </div>
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error("Erro Elenco:", e);
        divMembros.innerHTML = "<p>Erro ao listar elenco.</p>";
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

