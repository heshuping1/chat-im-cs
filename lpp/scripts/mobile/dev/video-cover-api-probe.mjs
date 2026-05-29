#!/usr/bin/env node
/**
 * Probe video cover/media fields in client IM APIs.
 *
 * Real calls printed to console and report files:
 * 1. POST /api/client/v1/media/upload
 * 2. POST /api/client/v1/direct-chats/{id}/messages and/or
 *    POST /api/client/v1/groups/{id}/messages
 * 3. GET /api/client/v1/direct-chats/{id}/messages and/or
 *    GET /api/client/v1/groups/{id}/messages
 *
 * Required env or flags:
 *   LPP_BASE_URL
 *   LPP_ACCESS_TOKEN, or LPP_LOGIN_IDENTIFIER + LPP_LOGIN_PASSWORD
 *   LPP_VIDEO_PATH
 *   LPP_DIRECT_CHAT_ID or LPP_PEER_USER_ID and/or LPP_GROUP_ID
 *   If ids are omitted, the script auto-picks direct/group conversations.
 */

import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const VIDEO_RESOURCE_FIELDS = [
  'url',
  'fileName',
  'mimeType',
  'sizeBytes',
  'width',
  'height',
  'durationSeconds',
  'thumbnailUrl',
  'signedUrl',
  'downloadUrl',
]

const SENSITIVE_BODY_KEYS = new Set([
  'accessToken',
  'refreshToken',
  'platformToken',
  'platformRefreshToken',
  'password',
  'captchaAnswer',
  'verificationCode',
  'visitorToken',
])

const MIME_BY_EXT = new Map([
  ['.mp4', 'video/mp4'],
  ['.mov', 'video/quicktime'],
  ['.m4v', 'video/x-m4v'],
  ['.webm', 'video/webm'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
])

class ApiFailure extends Error {
  constructor(message, result = null) {
    super(message)
    this.name = 'ApiFailure'
    this.result = result
  }
}

class EvidenceLogger {
  constructor(reportPath, jsonlPath) {
    this.reportPath = reportPath
    this.jsonlPath = jsonlPath
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    this.report = fs.createWriteStream(reportPath, { encoding: 'utf8' })
    this.jsonl = fs.createWriteStream(jsonlPath, { encoding: 'utf8' })
  }

  close() {
    this.report.end()
    this.jsonl.end()
  }

  section(title) {
    this.write(`\n## ${title}`)
  }

  write(text = '') {
    console.log(text)
    this.report.write(`${text}\n`)
  }

  event(value) {
    this.jsonl.write(`${JSON.stringify(value)}\n`)
  }

  requestResponse({ label, method, url, headers, requestBody, curl, result }) {
    const event = {
      label,
      request: {
        method,
        url,
        headers: redactHeaders(headers),
        body: redactBody(requestBody),
        curl,
      },
      response: {
        status: result.status,
        headers: result.headers,
        body: redactBody(result.body),
      },
    }
    this.event(event)
    this.section(label)
    this.write(`METHOD: ${method}`)
    this.write(`URL: ${url}`)
    this.write('REQUEST HEADERS:')
    this.write(JSON.stringify(redactHeaders(headers), null, 2))
    this.write('REQUEST BODY:')
    this.write(JSON.stringify(redactBody(requestBody ?? {}), null, 2))
    this.write('REPRO CURL:')
    this.write('```bash')
    this.write(curl)
    this.write('```')
    this.write(`RESPONSE STATUS: ${result.status}`)
    this.write('RESPONSE BODY:')
    this.write('```json')
    this.write(JSON.stringify(redactBody(result.body), null, 2))
    this.write('```')
  }
}

function usage() {
  return `Usage:
  node scripts/mobile/dev/video-cover-api-probe.mjs --video-path ./sample.mp4 --direct-chat-id <id>

Environment variables:
  LPP_BASE_URL                  default: https://chat.hearteasechat.com
  LPP_ACCESS_TOKEN              optional if login credentials are provided
  LPP_LOGIN_IDENTIFIER          quick-login account identifier
  LPP_LOGIN_PASSWORD            quick-login password
  LPP_LOGIN_TYPE                email | mobile | lpp_id | login_name, auto-detected by default
  LPP_TENANT_CODE               tenantCode/tenantId to select, default mouse-corp
  LPP_VIDEO_PATH                required unless --video-path is passed
  LPP_DIRECT_CHAT_ID            direct chat id, or use LPP_PEER_USER_ID to create/reuse one
  LPP_PEER_USER_ID              peer user id for POST /api/client/v1/direct-chats
  LPP_GROUP_ID                  group id
  LPP_VIDEO_THUMBNAIL_URL       optional value forced into body.video.thumbnailUrl
  LPP_VIDEO_THUMBNAIL_PATH      optional local jpeg/png poster uploaded separately; response data.url is used as thumbnailUrl.
                                  If omitted, the script captures one with <video> + <canvas> via Playwright.
  LPP_VIDEO_WIDTH               optional value forced into body.video.width
  LPP_VIDEO_HEIGHT              optional value forced into body.video.height
  LPP_VIDEO_DURATION_SECONDS    optional value forced into body.video.durationSeconds
  LPP_VIDEO_PROBE_MODE          direct | group | both, default both
  LPP_VIDEO_PROBE_OUTPUT_DIR    default reports/mobile/api-probes

Examples:
  node scripts/mobile/dev/video-cover-api-probe.mjs --login-identifier lpp_owner_1776587541@test.com --login-password 123123123 --video-path C:\\tmp\\cover.mp4 --mode both

  $env:LPP_GROUP_ID="..."
  node scripts/mobile/dev/video-cover-api-probe.mjs --video-path C:\\tmp\\cover.mp4 --mode group
`
}

function parseArgs(argv) {
  const values = new Map()
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      values.set('help', 'true')
      continue
    }
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      values.set(key, 'true')
    } else {
      values.set(key, next)
      i += 1
    }
  }

  const get = (flag, envName, fallback = '') =>
    values.get(flag) ?? process.env[envName] ?? fallback
  const intValue = (flag, envName) => {
    const raw = get(flag, envName, '')
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return {
    help: values.has('help'),
    baseUrl: get('base-url', 'LPP_BASE_URL', 'https://chat.hearteasechat.com'),
    accessToken: get('access-token', 'LPP_ACCESS_TOKEN'),
    loginIdentifier: get('login-identifier', 'LPP_LOGIN_IDENTIFIER'),
    loginPassword: get('login-password', 'LPP_LOGIN_PASSWORD'),
    loginType: get('login-type', 'LPP_LOGIN_TYPE'),
    tenantCode: get('tenant-code', 'LPP_TENANT_CODE', 'mouse-corp'),
    videoPath: get('video-path', 'LPP_VIDEO_PATH'),
    directChatId: get('direct-chat-id', 'LPP_DIRECT_CHAT_ID'),
    peerUserId: get('peer-user-id', 'LPP_PEER_USER_ID'),
    groupId: get('group-id', 'LPP_GROUP_ID'),
    thumbnailUrl: get('thumbnail-url', 'LPP_VIDEO_THUMBNAIL_URL'),
    thumbnailPath: get('thumbnail-path', 'LPP_VIDEO_THUMBNAIL_PATH'),
    width: intValue('width', 'LPP_VIDEO_WIDTH'),
    height: intValue('height', 'LPP_VIDEO_HEIGHT'),
    durationSeconds: intValue('duration-seconds', 'LPP_VIDEO_DURATION_SECONDS'),
    outputDir: get(
      'output-dir',
      'LPP_VIDEO_PROBE_OUTPUT_DIR',
      'reports/mobile/api-probes',
    ),
    mode: get('mode', 'LPP_VIDEO_PROBE_MODE', 'both'),
    limit: intValue('limit', 'LPP_VIDEO_GET_LIMIT') || 20,
  }
}

function validateArgs(args) {
  if (!['direct', 'group', 'both'].includes(args.mode)) {
    throw new ApiFailure('--mode must be direct, group, or both')
  }
  if (!args.accessToken && (!args.loginIdentifier || !args.loginPassword)) {
    throw new ApiFailure(
      'missing --access-token/LPP_ACCESS_TOKEN or --login-identifier + --login-password',
    )
  }
  if (!args.videoPath) {
    throw new ApiFailure('missing --video-path or LPP_VIDEO_PATH')
  }
  if (!fs.existsSync(args.videoPath) || !fs.statSync(args.videoPath).isFile()) {
    throw new ApiFailure(`video file does not exist: ${args.videoPath}`)
  }
  if (
    args.thumbnailPath &&
    (!fs.existsSync(args.thumbnailPath) || !fs.statSync(args.thumbnailPath).isFile())
  ) {
    throw new ApiFailure(`thumbnail file does not exist: ${args.thumbnailPath}`)
  }
}

function requireFromWorkspace(packageName) {
  const require = createRequire(import.meta.url)
  const candidates = [
    packageName,
    path.resolve('node_modules', packageName),
    path.resolve('lpp_pc_client', 'node_modules', packageName),
  ]
  for (const candidate of candidates) {
    try {
      return require(candidate)
    } catch {
      // Try the next local install location.
    }
  }
  throw new ApiFailure(
    `missing ${packageName}; pass --thumbnail-path with a jpeg/png cover or install ${packageName}`,
  )
}

function redactHeaders(headers) {
  const redacted = {}
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase()
    redacted[key] =
      lower === 'authorization'
        ? 'Bearer <redacted>'
        : lower === 'cookie'
          ? '<redacted>'
          : value
  }
  return redacted
}

function redactBody(value) {
  if (Array.isArray(value)) return value.map((item) => redactBody(item))
  if (!value || typeof value !== 'object') return value
  const redacted = {}
  for (const [key, item] of Object.entries(value)) {
    redacted[key] = SENSITIVE_BODY_KEYS.has(key) ? '<redacted>' : redactBody(item)
  }
  return redacted
}

function buildUrl(baseUrl, apiPath, query = null) {
  const url = new URL(apiPath, `${baseUrl.replace(/\/+$/, '')}/`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\"'\"'")}'`
}

function curlFor(method, url, headers, { jsonBody = null, filePath = null, formFields = null } = {}) {
  const parts = ['curl', '-i', '-X', method, shellQuote(url)]
  for (const [key, value] of Object.entries(redactHeaders(headers))) {
    const headerValue = key.toLowerCase() === 'authorization' ? 'Bearer $LPP_ACCESS_TOKEN' : value
    parts.push('-H', shellQuote(`${key}: ${headerValue}`))
  }
  if (jsonBody) {
    parts.push('--data', shellQuote(JSON.stringify(redactBody(jsonBody))))
  }
  if (filePath) {
    parts.push('-F', shellQuote(`file=@${filePath}`))
  }
  for (const [key, value] of Object.entries(formFields ?? {})) {
    parts.push('-F', shellQuote(`${key}=${value}`))
  }
  return parts.join(' ')
}

async function parseResponse(response) {
  const text = await response.text()
  let body = text
  if (text.trim()) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  }
}

function ensureSuccess(method, apiPath, result) {
  if (result.status < 200 || result.status >= 300) {
    throw new ApiFailure(`${method} ${apiPath} returned HTTP ${result.status}`, result)
  }
  if (result.body && typeof result.body === 'object' && !Array.isArray(result.body)) {
    const code = result.body.code
    if (code && code !== 'OK') {
      throw new ApiFailure(`${method} ${apiPath} returned server code ${code}`, result)
    }
  }
}

async function requestJson(logger, { label, method, baseUrl, apiPath, token, query, body }) {
  const url = buildUrl(baseUrl, apiPath, query)
  const headers = {
    Accept: 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const init = { method, headers }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const result = await parseResponse(await fetch(url, init))
  logger.requestResponse({
    label,
    method,
    url,
    headers,
    requestBody: body ?? {},
    curl: curlFor(method, url, headers, { jsonBody: body }),
    result,
  })
  ensureSuccess(method, apiPath, result)
  return result
}

async function requestJsonSilent({ method, baseUrl, apiPath, token, query, body }) {
  const url = buildUrl(baseUrl, apiPath, query)
  const headers = {
    Accept: 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const init = { method, headers }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const result = await parseResponse(await fetch(url, init))
  ensureSuccess(method, apiPath, result)
  return result
}

function detectLoginType(identifier, explicitType) {
  if (explicitType) return explicitType
  if (identifier.includes('@')) return 'email'
  if (/^\+?\d{6,}$/.test(identifier)) return 'mobile'
  return 'lpp_id'
}

function solveCaptcha(question) {
  const nums = Array.from(String(question).matchAll(/-?\d+/g)).map((m) => Number(m[0]))
  if (nums.length < 2) return '0'
  if (question.includes('+') || question.includes('加')) return String(nums[0] + nums[1])
  if (question.includes('-') || question.includes('减')) return String(nums[0] - nums[1])
  if (question.includes('*') || question.includes('×') || question.toLowerCase().includes('x')) {
    return String(nums[0] * nums[1])
  }
  if (question.includes('/') || question.includes('÷')) return String(Math.trunc(nums[0] / nums[1]))
  return '0'
}

async function loginForAccessToken(logger, args) {
  const loginType = detectLoginType(args.loginIdentifier, args.loginType)
  const body = {
    identifier: args.loginIdentifier,
    password: args.loginPassword,
    loginType,
  }
  let result = await requestJsonSilent({
    method: 'POST',
    baseUrl: args.baseUrl,
    apiPath: '/api/platform/v1/auth/login',
    token: '',
    body,
  }).catch(async (error) => {
    const code = error?.result?.body?.code
    if (!String(code).includes('CAPTCHA')) throw error
    const captcha = await requestJsonSilent({
      method: 'POST',
      baseUrl: args.baseUrl,
      apiPath: '/api/client/v1/auth/captcha/generate',
      token: '',
      body: {},
    })
    const data = apiData(captcha)
    const token = data?.token ?? data?.captchaToken
    const question = data?.question ?? data?.captchaQuestion ?? ''
    return requestJsonSilent({
      method: 'POST',
      baseUrl: args.baseUrl,
      apiPath: '/api/platform/v1/auth/login',
      token: '',
      body: {
        ...body,
        captchaToken: token,
        captchaAnswer: solveCaptcha(question),
      },
    })
  })

  const loginData = apiData(result)
  if (loginData?.accessToken) return loginData.accessToken
  const platformToken = loginData?.platformToken
  if (!platformToken) {
    throw new ApiFailure('login response missing platformToken/accessToken', result)
  }

  let tenantId = ''
  const tenants = Array.isArray(loginData?.tenants) ? loginData.tenants : []
  const suggestedTenantId = loginData?.spaceContext?.tenantId
  if (args.tenantCode) {
    const matched = tenants.find(
      (tenant) =>
        tenant?.tenantCode === args.tenantCode ||
        tenant?.tenantId === args.tenantCode,
    )
    tenantId = matched?.tenantId ?? ''
  }
  tenantId ||= suggestedTenantId ?? tenants[0]?.tenantId ?? ''
  if (!tenantId) {
    throw new ApiFailure(`login found no selectable tenant for ${args.tenantCode}`, result)
  }

  result = await requestJsonSilent({
    method: 'POST',
    baseUrl: args.baseUrl,
    apiPath: '/api/platform/v1/auth/select-tenant',
    token: platformToken,
    body: { tenantId },
  })
  const tenantData = apiData(result)
  if (!tenantData?.accessToken) {
    throw new ApiFailure('select tenant response missing accessToken', result)
  }
  return tenantData.accessToken
}

async function getConversations(logger, { baseUrl, token, limit }) {
  const result = await requestJson(logger, {
    label: 'get conversations: GET /api/client/v1/conversations',
    method: 'GET',
    baseUrl,
    apiPath: '/api/client/v1/conversations',
    token,
    query: { limit },
  })
  const data = apiData(result)
  const items = Array.isArray(data) ? data : data?.items ?? []
  return Array.isArray(items) ? items.filter((item) => item && typeof item === 'object') : []
}

async function uploadMedia(logger, { baseUrl, token, filePath, mediaKind, label }) {
  const url = buildUrl(baseUrl, '/api/client/v1/media/upload')
  const buffer = fs.readFileSync(filePath)
  const mimeType = MIME_BY_EXT.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream'
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mimeType }), path.basename(filePath))
  if (mediaKind) form.append('mediaKind', mediaKind)
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
  const result = await parseResponse(await fetch(url, { method: 'POST', headers, body: form }))
  logger.requestResponse({
    label,
    method: 'POST',
    url,
    headers,
    requestBody: {
      multipart: {
        file: {
          path: filePath,
          fileName: path.basename(filePath),
          mimeType,
          sizeBytes: buffer.byteLength,
        },
        ...(mediaKind ? { mediaKind } : {}),
      },
    },
    curl: curlFor('POST', url, headers, {
      filePath,
      formFields: mediaKind ? { mediaKind } : null,
    }),
    result,
  })
  ensureSuccess('POST', '/api/client/v1/media/upload', result)
  return result
}

async function uploadVideo(logger, { baseUrl, token, videoPath }) {
  return uploadMedia(logger, {
    baseUrl,
    token,
    filePath: videoPath,
    mediaKind: 'video',
    label: 'upload video: POST /api/client/v1/media/upload',
  })
}

async function uploadThumbnail(logger, { baseUrl, token, thumbnailPath }) {
  return uploadMedia(logger, {
    baseUrl,
    token,
    filePath: thumbnailPath,
    mediaKind: 'image',
    label: 'upload video thumbnail image: POST /api/client/v1/media/upload',
  })
}

async function generateThumbnailWithCanvas(logger, { videoPath, outputDir, runId }) {
  const { chromium } = requireFromWorkspace('playwright')
  const thumbnailPath = path.resolve(outputDir, `video-cover-thumbnail-${runId}.jpg`)
  fs.mkdirSync(path.dirname(thumbnailPath), { recursive: true })
  const browser = await launchChromiumWithLocalFallback(chromium)
  try {
    const page = await browser.newPage()
    await page.setContent('<input id="video-file" type="file" />')
    await page.setInputFiles('#video-file', path.resolve(videoPath))
    const result = await page.evaluate(async () => {
      const file = document.querySelector('#video-file')?.files?.[0]
      if (!file) throw new Error('video file input is empty')
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.preload = 'auto'
      const objectUrl = URL.createObjectURL(file)
      video.src = objectUrl
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('video metadata timeout')), 10000)
        video.addEventListener(
          'loadedmetadata',
          () => {
            window.clearTimeout(timeout)
            resolve()
          },
          { once: true },
        )
        video.addEventListener('error', () => reject(new Error('video load failed')), { once: true })
        video.load()
      })
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const targetTime = duration > 0 ? Math.min(Math.max(duration * 0.025, 0.16), Math.max(0.08, duration - 0.08), 0.65) : 0.18
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('video seek timeout')), 10000)
        video.addEventListener(
          'seeked',
          () => {
            window.clearTimeout(timeout)
            resolve()
          },
          { once: true },
        )
        video.currentTime = targetTime
      })
      const maxWidth = 720
      const scale = Math.min(1, maxWidth / video.videoWidth)
      const width = Math.max(1, Math.round(video.videoWidth * scale))
      const height = Math.max(1, Math.round(video.videoHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas context unavailable')
      context.drawImage(video, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.84)
      URL.revokeObjectURL(objectUrl)
      return {
        dataUrl,
        width: video.videoWidth,
        height: video.videoHeight,
        durationSeconds: duration || null,
        captureTimeSeconds: targetTime,
      }
    })
    const base64 = result.dataUrl.split(',')[1]
    fs.writeFileSync(thumbnailPath, Buffer.from(base64, 'base64'))
    const sizeBytes = fs.statSync(thumbnailPath).size
    logger.section('generate thumbnail locally: <video> + <canvas>')
    logger.write(
      JSON.stringify(
        {
          sourceVideoPath: videoPath,
          thumbnailPath,
          mimeType: 'image/jpeg',
          sizeBytes,
          width: result.width,
          height: result.height,
          durationSeconds: result.durationSeconds,
          captureTimeSeconds: result.captureTimeSeconds,
        },
        null,
        2,
      ),
    )
    return {
      thumbnailPath,
      width: result.width,
      height: result.height,
      durationSeconds: result.durationSeconds,
    }
  } finally {
    await browser.close()
  }
}

async function launchChromiumWithLocalFallback(chromium) {
  const attempts = [
    () => chromium.launch({ headless: true }),
    () => chromium.launch({ headless: true, channel: 'msedge' }),
    () => chromium.launch({ headless: true, channel: 'chrome' }),
  ]
  let lastError = null
  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function apiData(result) {
  if (result.body && typeof result.body === 'object' && 'data' in result.body) {
    return result.body.data
  }
  return result.body
}

function firstString(data, keys) {
  for (const key of keys) {
    const value = data?.[key]
    if (value !== undefined && value !== null) return String(value)
  }
  return ''
}

async function createDirectChat(logger, { baseUrl, token, peerUserId }) {
  const result = await requestJson(logger, {
    label: 'create/reuse direct chat: POST /api/client/v1/direct-chats',
    method: 'POST',
    baseUrl,
    apiPath: '/api/client/v1/direct-chats',
    token,
    body: { peerUserId },
  })
  const data = apiData(result)
  const chatId = firstString(data, ['chatId', 'conversationId', 'id', 'directChatId'])
  if (!chatId) {
    throw new ApiFailure('direct chat response missing chatId/conversationId', result)
  }
  return chatId
}

function mediaResourceFromUpload(data, args) {
  const video = {
    url: firstString(data, ['url', 'mediaUrl', 'signedUrl']),
    fileName: firstString(data, ['fileName', 'filename', 'name']),
    mimeType: firstString(data, ['mimeType', 'contentType']),
    sizeBytes: data?.sizeBytes ?? data?.size ?? data?.fileSize ?? null,
    width: args.width || data?.width || null,
    height: args.height || data?.height || null,
    durationSeconds: args.durationSeconds || data?.durationSeconds || null,
    thumbnailUrl: args.thumbnailUrl || null,
  }
  if (!video.url) {
    throw new ApiFailure('upload response missing media url')
  }
  return video
}

function mediaUrlFromUpload(data) {
  const url = firstString(data, ['url', 'mediaUrl', 'signedUrl'])
  if (!url) {
    throw new ApiFailure('thumbnail upload response missing media url')
  }
  return url
}

async function sendVideo(logger, { baseUrl, token, targetType, targetId, video }) {
  const clientMsgId = `video-cover-probe-${crypto.randomUUID()}`
  const apiPath =
    targetType === 'direct'
      ? `/api/client/v1/direct-chats/${targetId}/messages`
      : `/api/client/v1/groups/${targetId}/messages`
  const body = {
    clientMsgId,
    messageType: 'video',
    body: {
      text: null,
      image: null,
      video,
      voice: null,
      file: null,
    },
    replyToMessageId: null,
    mentions: [],
  }
  const result = await requestJson(logger, {
    label: `send ${targetType} video: POST ${apiPath}`,
    method: 'POST',
    baseUrl,
    apiPath,
    token,
    body,
  })
  const data = apiData(result)
  const messageId = firstString(data, ['messageId', 'id'])
  return { clientMsgId, messageId }
}

async function getMessages(logger, { baseUrl, token, targetType, targetId, limit }) {
  const apiPath =
    targetType === 'direct'
      ? `/api/client/v1/direct-chats/${targetId}/messages`
      : `/api/client/v1/groups/${targetId}/messages`
  const result = await requestJson(logger, {
    label: `get ${targetType} messages DTO: GET ${apiPath}`,
    method: 'GET',
    baseUrl,
    apiPath,
    token,
    query: { limit },
  })
  const data = apiData(result)
  if (Array.isArray(data)) return data.filter((item) => item && typeof item === 'object')
  const items = data?.items ?? data?.messages ?? []
  return Array.isArray(items) ? items.filter((item) => item && typeof item === 'object') : []
}

function findSentMessage(messages, { messageId, clientMsgId }) {
  return (
    messages.find((message) => messageId && String(message.messageId ?? message.id) === messageId) ??
    messages.find((message) => clientMsgId && String(message.clientMsgId ?? '') === clientMsgId) ??
    messages.find((message) => String(message.messageType ?? message.type ?? '').toLowerCase() === 'video') ??
    null
  )
}

function extractVideo(message) {
  if (!message) return {}
  let body = message.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  if (body?.video && typeof body.video === 'object') return body.video
  if (message.video && typeof message.video === 'object') return message.video
  return {}
}

function summarizeDtoFields(logger, { targetType, targetId, messages, messageId, clientMsgId }) {
  const matchedMessage = findSentMessage(messages, { messageId, clientMsgId })
  const returnedVideoFields = extractVideo(matchedMessage)
  const missingVideoFields = VIDEO_RESOURCE_FIELDS.filter(
    (field) => !(field in returnedVideoFields),
  )
  const nullVideoFields = VIDEO_RESOURCE_FIELDS.filter(
    (field) => field in returnedVideoFields && returnedVideoFields[field] === null,
  )
  const summary = {
    targetType,
    targetId,
    messageId,
    clientMsgId,
    matchedMessage,
    returnedVideoFields,
    missingVideoFields,
    nullVideoFields,
    messageCountInGetResponse: messages.length,
  }
  logger.section(`DTO field check: ${targetType} ${targetId}`)
  logger.write('```json')
  logger.write(JSON.stringify(summary, null, 2))
  logger.write('```')
  logger.event({ label: `dto-field-check:${targetType}`, summary })
  return summary
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(usage())
    return
  }
  validateArgs(args)

  const runId = new Date().toISOString().replaceAll(':', '').replace(/\.\d+Z$/, 'Z')
  const reportPath = path.resolve(args.outputDir, `video-cover-api-probe-${runId}.md`)
  const jsonlPath = path.resolve(args.outputDir, `video-cover-api-probe-${runId}.jsonl`)
  const logger = new EvidenceLogger(reportPath, jsonlPath)

  try {
    logger.section('Run inputs')
    logger.write(
      JSON.stringify(
        {
          baseUrl: args.baseUrl,
          mode: args.mode,
          videoPath: args.videoPath,
          directChatId: args.directChatId || null,
          peerUserId: args.peerUserId || null,
          groupId: args.groupId || null,
          thumbnailUrl: args.thumbnailUrl || null,
          thumbnailPath: args.thumbnailPath || null,
          width: args.width || null,
          height: args.height || null,
          durationSeconds: args.durationSeconds || null,
          accessToken: '<redacted>',
          loginIdentifier: args.loginIdentifier || null,
          tenantCode: args.tenantCode || null,
        },
        null,
        2,
      ),
    )

    logger.section('Contract')
    logger.write('- The server does not generate video covers in POST /api/client/v1/media/upload.')
    logger.write('- media/upload response data.thumbnailUrl may be null for both image and video uploads.')
    logger.write('- The client must generate a jpeg poster locally, upload it as an image, and write that image upload data.url into body.video.thumbnailUrl.')
    logger.write('- DTO validation only checks whether a non-empty sent body.video.thumbnailUrl is returned by message GET APIs.')

    logger.section('Test steps')
    logger.write('1. Use login/access token only as auth setup; login and tenant-selection calls are not report conclusions.')
    logger.write('2. Load conversations and choose direct/group targets when ids are not supplied.')
    logger.write('3. Capture a local jpeg poster with <video> + <canvas>, unless --thumbnail-path or --thumbnail-url is supplied.')
    logger.write('4. Upload the jpeg poster with POST /api/client/v1/media/upload and use only response data.url as body.video.thumbnailUrl.')
    logger.write('5. Upload the video with POST /api/client/v1/media/upload; do not use its data.thumbnailUrl as the cover source.')
    logger.write('6. Send video messages to selected direct/group conversations.')
    logger.write('7. GET direct/group messages and inspect the returned target message body.video DTO.')
    const accessToken =
      args.accessToken || (await loginForAccessToken(logger, args))

    const conversations = await getConversations(logger, {
      baseUrl: args.baseUrl,
      token: accessToken,
      limit: 50,
    })

    let generatedThumbnail = null
    if (!args.thumbnailUrl && !args.thumbnailPath) {
      generatedThumbnail = await generateThumbnailWithCanvas(logger, {
        videoPath: args.videoPath,
        outputDir: args.outputDir,
        runId,
      })
      args.thumbnailPath = generatedThumbnail.thumbnailPath
    }
    if (!args.thumbnailUrl && args.thumbnailPath) {
      const thumbnailUploadResult = await uploadThumbnail(logger, {
        baseUrl: args.baseUrl,
        token: accessToken,
        thumbnailPath: args.thumbnailPath,
      })
      args.thumbnailUrl = mediaUrlFromUpload(apiData(thumbnailUploadResult))
    }
    if (generatedThumbnail) {
      args.width ||= generatedThumbnail.width
      args.height ||= generatedThumbnail.height
      args.durationSeconds ||= Math.round(generatedThumbnail.durationSeconds || 0)
    }
    const uploadResult = await uploadVideo(logger, {
      baseUrl: args.baseUrl,
      token: accessToken,
      videoPath: args.videoPath,
    })
    const uploadData = apiData(uploadResult)
    const video = mediaResourceFromUpload(uploadData, args)
    if (!video.thumbnailUrl) {
      logger.section('Conclusion')
      logger.write('INVALID TEST INPUT: body.video.thumbnailUrl is empty before sending.')
      logger.write('This means local poster generation/upload was skipped or failed. Do not classify this run as a server DTO issue.')
      throw new ApiFailure('invalid test input: body.video.thumbnailUrl is empty before send')
    }
    logger.section('Video body used for send')
    logger.write('```json')
    logger.write(JSON.stringify(video, null, 2))
    logger.write('```')

    const targets = []
    if (['direct', 'both'].includes(args.mode)) {
      const directChatId =
        args.directChatId ||
        (args.peerUserId
          ? await createDirectChat(logger, {
              baseUrl: args.baseUrl,
              token: accessToken,
              peerUserId: args.peerUserId,
            })
          : conversations.find((item) =>
              String(item.conversationType ?? item.type ?? '').toLowerCase().includes('direct'),
            )?.conversationId)
      if (directChatId) targets.push(['direct', directChatId])
    }
    if (['group', 'both'].includes(args.mode)) {
      const groupId =
        args.groupId ||
        conversations.find((item) =>
          String(item.conversationType ?? item.type ?? '').toLowerCase().includes('group'),
        )?.conversationId
      if (groupId) targets.push(['group', groupId])
    }
    if (targets.length === 0) {
      throw new ApiFailure(
        'no direct/group target found; pass --direct-chat-id, --peer-user-id, or --group-id',
      )
    }

    const dtoSummaries = []
    for (const [targetType, targetId] of targets) {
      const sent = await sendVideo(logger, {
        baseUrl: args.baseUrl,
        token: accessToken,
        targetType,
        targetId,
        video,
      })
      const messages = await getMessages(logger, {
        baseUrl: args.baseUrl,
        token: accessToken,
        targetType,
        targetId,
        limit: args.limit,
      })
      const summary = summarizeDtoFields(logger, {
        targetType,
        targetId,
        messages,
        messageId: sent.messageId,
        clientMsgId: sent.clientMsgId,
      })
      dtoSummaries.push(summary)
    }

    logger.section('Conclusion')
    const failedTargets = dtoSummaries.filter(
      (summary) => summary.returnedVideoFields?.thumbnailUrl == null,
    )
    if (failedTargets.length === 0) {
      logger.write('PASS: every target message GET response returned body.video.thumbnailUrl from the client-submitted poster image url.')
    } else {
      logger.write('FAIL: at least one target message GET response did not return the client-submitted body.video.thumbnailUrl.')
      logger.write(JSON.stringify(failedTargets.map((item) => ({
        targetType: item.targetType,
        targetId: item.targetId,
        messageId: item.messageId,
        clientMsgId: item.clientMsgId,
        returnedThumbnailUrl: item.returnedVideoFields?.thumbnailUrl ?? null,
      })), null, 2))
    }

    logger.section('Report files')
    logger.write(reportPath)
    logger.write(jsonlPath)
  } finally {
    logger.close()
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`)
  if (error instanceof ApiFailure && error.result) {
    console.error(JSON.stringify(error.result.body, null, 2))
  }
  process.exitCode = 1
})
