/**
 * setup-firebase.mjs
 * Configura Firebase para Calipso Concón:
 *  1. Activa Email/Password en Authentication
 *  2. Crea el usuario administrador
 *  3. Habilita Storage (via Management API)
 *  4. Despliega reglas de Storage
 */

import { readFileSync, existsSync } from 'fs'
import { homedir }                   from 'os'
import { join, resolve }             from 'path'
import { execSync }                  from 'child_process'

// ── Load .env.local ───────────────────────────────────────────────────────────

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return {}
  const vars = {}
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const idx = trimmed.indexOf('=')
    if (idx === -1) return
    vars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  })
  return vars
}

const env = loadEnvLocal()

// ── Config ────────────────────────────────────────────────────────────────────

const PROJECT_ID  = env.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
const API_KEY     = env.VITE_FIREBASE_API_KEY    || process.env.VITE_FIREBASE_API_KEY
const ADMIN_EMAIL = env.ADMIN_EMAIL               || process.env.ADMIN_EMAIL || 'admin@calipso.cl'
const ADMIN_PASS  = env.ADMIN_PASS                || process.env.ADMIN_PASS

if (!PROJECT_ID) { console.error('❌  VITE_FIREBASE_PROJECT_ID no encontrado en .env.local'); process.exit(1) }
if (!API_KEY)    { console.error('❌  VITE_FIREBASE_API_KEY no encontrado en .env.local'); process.exit(1) }
if (!ADMIN_PASS) { console.error('❌  ADMIN_PASS no encontrado en .env.local\n   Agrega: ADMIN_PASS=tu-contraseña'); process.exit(1) }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFirebaseToken() {
  const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json')
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'))
  return cfg?.tokens?.access_token
}

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  return { ok: res.ok, status: res.status, json }
}

function step(msg) { console.log(`\n▸ ${msg}`) }
function ok(msg)   { console.log(`  ✅ ${msg}`) }
function warn(msg) { console.log(`  ⚠️  ${msg}`) }
function fail(msg) { console.log(`  ❌ ${msg}`) }

// ── 1. Activar Email/Password Authentication ──────────────────────────────────

async function enableEmailAuth(token) {
  step('Habilitando Identity Toolkit API…')

  // Paso A: Habilitar la API de Identity Toolkit via Service Usage
  const enableApiUrl = `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/identitytoolkit.googleapis.com:enable`
  const enableRes = await apiFetch(enableApiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: '{}',
  })
  if (enableRes.ok || enableRes.json?.error?.status === 'ALREADY_EXISTS') {
    ok('Identity Toolkit API habilitada')
  } else {
    warn(`Identity Toolkit API: ${enableRes.status} — ${JSON.stringify(enableRes.json).slice(0,100)}`)
  }

  // Pequeña pausa para propagación
  await new Promise(r => setTimeout(r, 4000))

  // Paso B: Inicializar Firebase Auth (crea la config por primera vez)
  step('Inicializando Firebase Authentication…')
  const initUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`
  const initRes = await apiFetch(initUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (initRes.ok) {
    ok('Firebase Auth ya inicializado')
  } else {
    // Intentar crear la config inicial
    const createRes = await apiFetch(initUrl, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
    if (createRes.ok) ok('Firebase Auth inicializado')
    else warn(`Init: ${createRes.status} — ${JSON.stringify(createRes.json).slice(0,100)}`)
  }

  // Paso C: Activar Email/Password
  step('Activando Email/Password sign-in…')
  const patchUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn`
  const { ok: success, status, json } = await apiFetch(patchUrl, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      signIn: {
        email: { enabled: true, passwordRequired: true },
      },
    }),
  })
  if (success) {
    ok('Email/Password activado correctamente')
  } else {
    warn(`Patch signIn: ${status} — ${JSON.stringify(json).slice(0, 150)}`)
  }
}

// ── 2. Crear usuario administrador ────────────────────────────────────────────

async function createAdminUser() {
  step(`Creando usuario administrador: ${ADMIN_EMAIL}`)

  // Intenta con la API de sign-up
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`
  const { ok: success, status, json } = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
      returnSecureToken: true,
    }),
  })

  if (success) {
    ok(`Usuario creado: ${ADMIN_EMAIL}`)
    ok(`Contraseña temporal: ${ADMIN_PASS}`)
    console.log(`  UID: ${json.localId}`)
    return json.localId
  }

  if (json?.error?.message === 'EMAIL_EXISTS') {
    ok(`El usuario ${ADMIN_EMAIL} ya existe`)
    return null
  }

  if (json?.error?.message === 'OPERATION_NOT_ALLOWED') {
    fail('Email/Password aún no está habilitado. Espera 30 segundos y vuelve a correr el script.')
    fail('O actívalo manualmente: https://console.firebase.google.com/project/calipso-a7266/authentication/providers')
    return null
  }

  warn(`Respuesta ${status}: ${JSON.stringify(json?.error ?? json).slice(0, 200)}`)
  return null
}

// ── 3. Habilitar Firebase Storage ─────────────────────────────────────────────

async function enableStorage(token) {
  step('Habilitando Firebase Storage…')

  // Activar la API de Storage via Cloud Resource Manager
  const enableUrl = `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/firebasestorage.googleapis.com:enable`
  const { ok: success, status, json } = await apiFetch(enableUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: '{}',
  })

  if (success || json?.error?.status === 'ALREADY_EXISTS') {
    ok('Storage API habilitada')
    return true
  }

  warn(`Storage API: ${status} — ${JSON.stringify(json?.error ?? json).slice(0, 150)}`)
  warn('Si falla, actívalo en: https://console.firebase.google.com/project/calipso-a7266/storage')
  return false
}

// ── 4. Desplegar reglas de Storage ────────────────────────────────────────────

async function deployStorageRules() {
  step('Desplegando reglas de Storage…')
  try {
    execSync(
      'npx firebase-tools deploy --only storage --project calipso-a7266',
      { cwd: process.cwd(), stdio: 'pipe' }
    )
    ok('Reglas de Storage desplegadas')
  } catch (e) {
    const out = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '')
    if (out.includes('set up')) {
      warn('Storage no está activado aún en la consola.')
      warn('Abre: https://console.firebase.google.com/project/calipso-a7266/storage')
      warn('Haz clic en "Get Started", acepta y luego corre: npm run firebase:deploy-storage')
    } else {
      warn('Error al desplegar storage rules: ' + out.slice(0, 200))
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   Calipso Concón — Firebase Setup        ║')
  console.log('╚══════════════════════════════════════════╝')

  const token = getFirebaseToken()
  if (!token) { fail('No se encontró token de Firebase CLI. Corre: npx firebase-tools login'); process.exit(1) }
  ok(`Token de CLI encontrado`)

  await enableEmailAuth(token)

  // Pequeña pausa para que el cambio se propague
  await new Promise(r => setTimeout(r, 3000))

  await createAdminUser()
  await enableStorage(token)
  await deployStorageRules()

  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   Setup completado                       ║')
  console.log('╠══════════════════════════════════════════╣')
  console.log(`║   URL Admin:  /admin/login               ║`)
  console.log(`║   Email:      ${ADMIN_EMAIL}      ║`)
  console.log(`║   Password:   ${ADMIN_PASS}            ║`)
  console.log('╚══════════════════════════════════════════╝')
  console.log('\n⚠️  Cambia la contraseña después del primer login.')
}

main().catch(err => { console.error('Error fatal:', err); process.exit(1) })
