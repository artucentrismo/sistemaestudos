import { signUp, signIn, signOut, getCurrentSession, getSupabase } from './supabase-client.js';
import { loadCloudState, saveCloudState } from './cloud-sync.js';

const SITE_URL = 'https://artucentrismo.github.io/sistemaestudos/';
let session = null;
let saveTimer = null;
let busy = false;

const $ = (id) => document.getElementById(id);
const localSnapshot = () => {
  try { return JSON.parse(localStorage.getItem('ciclo-v3') || localStorage.getItem('ciclo-v2') || 'null'); }
  catch { return null; }
};
const hasLocalData = (s) => !!(s && ((s.log || []).length || (s.cards || []).length || (s.red || []).length || (s.laps || 0)));
const stableStringify = (value) => {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
  return JSON.stringify(value);
};

function accountShell() {
  const header = document.createElement('header');
  header.id = 'accountbar';
  header.innerHTML = '<div class="account-brand">Ciclo</div><div class="account-actions"><span id="account-status">Modo neste aparelho</span><button id="account-open" type="button">Entrar / Criar conta</button></div>';
  document.body.insertBefore(header, document.body.firstChild);

  const modal = document.createElement('section');
  modal.id = 'account-modal';
  modal.innerHTML = `
    <div class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
      <button class="account-close" id="account-close" aria-label="Fechar">×</button>
      <h2 id="account-title">Sua conta do Ciclo</h2>
      <p class="account-muted">Seus estudos e baralhos ficam privados na sua conta.</p>
      <div class="account-tabs"><button id="tab-login" class="selected">Entrar</button><button id="tab-signup">Criar conta</button></div>
      <form id="account-form">
        <label id="name-wrap" hidden>Seu nome<input id="account-name" autocomplete="name" maxlength="80"></label>
        <label>E-mail<input id="account-email" type="email" autocomplete="email" required></label>
        <label>Senha<input id="account-password" type="password" autocomplete="current-password" minlength="8" required></label>
        <button class="account-primary" id="account-submit" type="submit">Entrar</button>
      </form>
      <button class="account-link" id="account-forgot">Esqueci minha senha</button>
      <div id="account-message" role="status" aria-live="polite"></div>
      <div id="account-conflict" hidden>
        <p>A nuvem já tem dados para esta conta e este aparelho também tem dados locais. Qual versão deseja manter?</p>
        <button class="account-primary" id="use-cloud">Usar os dados da nuvem</button>
        <button class="account-secondary" id="use-device">Enviar os dados deste aparelho para a nuvem</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  $('account-open').addEventListener('click', () => openModal());
  $('account-close').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  $('tab-login').addEventListener('click', () => setMode('login'));
  $('tab-signup').addEventListener('click', () => setMode('signup'));
  $('account-forgot').addEventListener('click', sendReset);
  $('account-form').addEventListener('submit', submitAuth);
  $('use-cloud').addEventListener('click', () => resolveConflict('cloud'));
  $('use-device').addEventListener('click', () => resolveConflict('device'));
}

let mode = 'login';
let pendingConflict = null;
function setMode(next) {
  mode = next;
  $('tab-login').classList.toggle('selected', mode === 'login');
  $('tab-signup').classList.toggle('selected', mode === 'signup');
  $('name-wrap').hidden = mode !== 'signup';
  $('account-password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
  $('account-submit').textContent = mode === 'signup' ? 'Criar conta' : 'Entrar';
  $('account-forgot').hidden = mode !== 'login';
  $('account-message').textContent = '';
}
function openModal() { $('account-modal').classList.add('visible'); $('account-email').focus(); }
function closeModal() { $('account-modal').classList.remove('visible'); }
function message(text, error = false) {
  $('account-message').textContent = text;
  $('account-message').style.color = error ? 'var(--rd)' : 'var(--g)';
}
function setBusy(value) {
  busy = value;
  $('account-submit').disabled = value;
  $('account-submit').textContent = value ? 'Aguarde…' : mode === 'signup' ? 'Criar conta' : 'Entrar';
}
async function submitAuth(event) {
  event.preventDefault();
  if (busy) return;
  const email = $('account-email').value.trim();
  const password = $('account-password').value;
  setBusy(true);
  try {
    if (mode === 'signup') {
      const { data, error } = await signUp({ email, password, displayName: $('account-name').value });
      if (error) throw error;
      if (!data.session) {
        message('Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre.');
        return;
      }
      session = data.session;
    } else {
      const { data, error } = await signIn({ email, password });
      if (error) throw error;
      session = data.session;
    }
    await syncAfterLogin();
  } catch (error) {
    message(error.message || 'Não foi possível autenticar.', true);
  } finally { setBusy(false); }
}
async function sendReset() {
  const email = $('account-email').value.trim();
  if (!email) return message('Informe seu e-mail primeiro.', true);
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL });
    if (error) throw error;
    message('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
  } catch (error) { message(error.message || 'Falha ao enviar o e-mail.', true); }
}
async function syncAfterLogin() {
  const remote = await loadCloudState();
  const local = localSnapshot();
  const owner = localStorage.getItem('ciclo-owner');
  const sameOwner = !owner || owner === session.user.id;
  if (remote.state && sameOwner && hasLocalData(local) && stableStringify(remote.state) !== stableStringify(local)) {
    pendingConflict = { remote: remote.state, local };
    $('account-conflict').hidden = false;
    $('account-form').hidden = true;
    $('account-forgot').hidden = true;
    message('Escolha como resolver os dados deste aparelho e da nuvem.');
    return;
  }
  if (remote.state) applyState(remote.state);
  else if (local && (!owner || owner === session.user.id)) await saveCloudState(local);
  finishLogin();
}
function applyState(state) {
  window.S = state;
  localStorage.setItem('ciclo-v3', JSON.stringify(state));
  window.applyTheme?.();
  window.render?.();
}
async function resolveConflict(choice) {
  if (!pendingConflict) return;
  try {
    if (choice === 'cloud') applyState(pendingConflict.remote);
    else { applyState(pendingConflict.local); await saveCloudState(pendingConflict.local); }
    pendingConflict = null;
    finishLogin();
  } catch (error) { message(error.message || 'Falha ao sincronizar.', true); }
}
function finishLogin() {
  if (session?.user?.id) localStorage.setItem('ciclo-owner', session.user.id);
  $('account-conflict').hidden = true;
  $('account-form').hidden = false;
  $('account-message').textContent = '';
  closeModal();
  paintAccount();
}
function paintAccount() {
  $('account-status').textContent = session?.user?.email || 'Modo neste aparelho';
  $('account-open').textContent = session ? 'Sair da conta' : 'Entrar / Criar conta';
  $('account-open').onclick = async () => {
    if (!session) return openModal();
    if (!confirm('Deseja sair da sua conta neste aparelho?')) return;
    try {
      await signOut();
      session = null;
      localStorage.removeItem('ciclo-v3');
      window.location.reload();
    } catch (error) { alert(error.message || 'Não foi possível sair.'); }
  };
}
function scheduleCloudSave() {
  if (!session) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const state = JSON.parse(localStorage.getItem('ciclo-v3') || 'null');
      if (state) await saveCloudState(state);
      $('account-status').textContent = session.user.email + ' · sincronizado';
    } catch (error) {
      $('account-status').textContent = 'Falha na sincronização';
      console.error('Ciclo cloud sync:', error);
    }
  }, 900);
}

async function boot() {
  accountShell();
  const originalSave = window.save;
  window.save = function (...args) {
    const result = originalSave.apply(this, args);
    scheduleCloudSave();
    return result;
  };
  try {
    session = await getCurrentSession();
    if (session) {
      const remote = await loadCloudState();
      const local = localSnapshot();
      const owner = localStorage.getItem('ciclo-owner');
      const sameOwner = !owner || owner === session.user.id;
      if (remote.state && sameOwner && hasLocalData(local) && stableStringify(remote.state) !== stableStringify(local)) {
        pendingConflict = { remote: remote.state, local };
        openModal();
        $('account-conflict').hidden = false;
        $('account-form').hidden = true;
        $('account-forgot').hidden = true;
        message('Há dados locais e na nuvem. Escolha qual versão manter.');
      } else if (remote.state) applyState(remote.state);
      else if (local && (!owner || owner === session.user.id)) await saveCloudState(local);
      if (!pendingConflict) localStorage.setItem('ciclo-owner', session.user.id);
    }
  } catch (error) {
    console.warn('Ciclo account initialization:', error);
  }
  paintAccount();
  if (window.location.hash.includes('type=recovery')) {
    openModal();
    $('account-title').textContent = 'Definir nova senha';
    $('account-password').autocomplete = 'new-password';
    $('account-form').onsubmit = async (event) => {
      event.preventDefault();
      try {
        const supabase = await getSupabase();
        const { error } = await supabase.auth.updateUser({ password: $('account-password').value });
        if (error) throw error;
        message('Senha atualizada. Você já pode continuar.');
        history.replaceState(null, '', SITE_URL);
        session = await getCurrentSession();
        finishLogin();
      } catch (error) { message(error.message || 'Não foi possível atualizar a senha.', true); }
    };
  }
}

boot();
