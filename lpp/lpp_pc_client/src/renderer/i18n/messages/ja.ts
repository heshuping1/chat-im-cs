import type { MessageDictionary } from './zh-CN';

export const ja: MessageDictionary = {
  app: {
    loading: '読み込み中...',
    title: 'LPP',
  },
  common: {
    cancel: 'キャンセル',
    close: '閉じる',
    confirm: '確認',
    copy: 'コピー',
    loading: '読み込み中...',
    retry: '再試行',
    save: '保存',
  },
  customerService: {
    status: {
      closed: '終了済み',
      queueing: '顧客が待機中',
      serving: 'オペレーター対応中',
      unknown: '状態を同期中',
    },
  },
  error: {
    forbidden: 'このアカウントには操作権限がありません',
    network: 'ネットワークエラーです。接続を確認して再試行してください',
    tenantAlreadyMember: 'すでにこの企業に参加しています。直接切り替えできます',
    unauthorized: 'ログイン状態が期限切れです。再度ログインしてください',
    unknown: '不明なエラー',
  },
  message: {
    fileFallback: '[ファイル]',
    imageFallback: '[画像]',
    messageFallback: '[メッセージ]',
    unreadCount: '{count} 件の未読',
    videoFallback: '[動画]',
    voiceFallback: '[音声]',
  },
  nav: {
    contacts: '連絡先',
    messages: 'メッセージ',
    onlineService: 'カスタマーサービス',
    settings: '設定',
  },
  settings: {
    language: '言語',
  },
};
