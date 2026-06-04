import type { MessageDictionary } from './zh-CN';

export const zhTW: MessageDictionary = {
  app: {
    loading: '正在載入...',
    title: '綠泡泡',
  },
  common: {
    cancel: '取消',
    close: '關閉',
    confirm: '確定',
    copy: '複製',
    loading: '正在載入...',
    retry: '重試',
    save: '儲存',
  },
  customerService: {
    status: {
      closed: '已結束',
      queueing: '客戶排隊中',
      serving: '人工服務中',
      unknown: '狀態待同步',
    },
  },
  error: {
    forbidden: '目前帳號沒有權限執行此操作',
    network: '網路連線異常，請檢查網路後重試',
    tenantAlreadyMember: '你已在該企業中，可直接切換進入',
    unauthorized: '登入狀態已失效，請重新登入',
    unknown: '未知錯誤',
  },
  message: {
    fileFallback: '[檔案]',
    imageFallback: '[圖片]',
    messageFallback: '[訊息]',
    unreadCount: '{count} 則未讀',
    videoFallback: '[影片]',
    voiceFallback: '[語音]',
  },
  nav: {
    contacts: '通訊錄',
    messages: '訊息',
    onlineService: '線上客服',
    settings: '設定',
  },
  settings: {
    language: '語言',
  },
};
