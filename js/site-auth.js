import { SITE_CONFIG } from '../config.js';
import { getSupabaseClient } from './site-database.js';

const authButton = document.getElementById('auth-button');
const dialog = document.createElement('dialog');
dialog.className = 'sprk-auth-dialog';
dialog.setAttribute('aria-labelledby', 'auth-title');
document.body.append(dialog);

let supabase;
let currentUser = null;

function showAuth(mode = 'signin', message = '') {
  const signingUp = mode === 'signup';
  dialog.innerHTML = `
    <div class="sprk-auth-card">
      <div class="sprk-auth-heading">
        <div><p class="sprk-auth-brand">${SITE_CONFIG.name}</p>
        <h2 id="auth-title">${signingUp ? 'Create your account' : 'Welcome back'}</h2></div>
        <button type="button" id="auth-close" class="sprk-auth-close" aria-label="Close">×</button>
      </div>
      <form id="auth-form" class="sprk-auth-form">
        <label>Email
          <input class="sprk-auth-input" name="email" type="email" autocomplete="email" required>
        </label>
        <label>Password
          <input class="sprk-auth-input" name="password" type="password" autocomplete="${signingUp ? 'new-password' : 'current-password'}" minlength="6" required>
        </label>
        <p id="auth-message" class="sprk-auth-message${message ? ' sprk-auth-error' : ''}" aria-live="polite"></p>
        <button class="sprk-auth-submit" type="submit">${signingUp ? 'Create account' : 'Sign in'}</button>
      </form>
      <p class="sprk-auth-switch">
        ${signingUp ? 'Already have an account?' : 'New to SPRK-Web?'}
        <button type="button" id="auth-switch">${signingUp ? 'Sign in' : 'Create an account'}</button>
      </p>
    </div>`;
  dialog.querySelector('#auth-message').textContent = message;
  dialog.showModal();
  dialog.querySelector('#auth-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('#auth-switch').addEventListener('click', () => showAuth(signingUp ? 'signin' : 'signup'));
  dialog.querySelector('#auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    const submit = dialog.querySelector('button[type="submit"]');
    const status = dialog.querySelector('#auth-message');
    submit.disabled = true;
    status.textContent = '';
    try {
      const response = signingUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (response.error) throw response.error;
      if (signingUp && !response.data.session) {
        status.className = 'sprk-auth-message sprk-auth-success';
        status.textContent = 'Check your email to confirm your account, then sign in.';
        return;
      }
      dialog.close();
    } catch (error) {
      status.className = 'sprk-auth-message sprk-auth-error';
      status.textContent = error.message || 'Authentication failed. Please try again.';
    } finally {
      submit.disabled = false;
    }
  });
}

function updateAuthButton(user) {
  currentUser = user;
  authButton.textContent = user ? 'Sign out' : 'Sign in';
  authButton.title = user?.email || 'Sign in or create an account';
  authButton.setAttribute('aria-label', user ? `Sign out ${user.email}` : 'Sign in or create an account');
}

authButton.addEventListener('click', async () => {
  if (!supabase) {
    showAuth('signin', 'Authentication is unavailable. Check your connection and reload the page.');
    return;
  }
  if (!currentUser) {
    showAuth();
    return;
  }
  try {
    const { error } = await supabase.auth.signOut();
    if (error) showAuth('signin', error.message);
  } catch (error) {
    showAuth('signin', error.message || 'Unable to sign out. Please try again.');
  }
});

authButton.disabled = true;
getSupabaseClient().then(async client => {
  supabase = client;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  updateAuthButton(data?.session?.user || null);
  authButton.disabled = false;
  supabase.auth.onAuthStateChange((_event, session) => updateAuthButton(session?.user || null));
}).catch(error => {
  console.error('Unable to initialize Supabase authentication:', error);
  authButton.disabled = true;
  authButton.title = error.message || 'Unable to load Supabase authentication';
});
