export const zhCN = {
  app: {
    loading: '正在加载...',
    title: '绿泡泡',
  },
  common: {
    cancel: '取消',
    close: '关闭',
    confirm: '确定',
    copy: '复制',
    loading: '正在加载...',
    retry: '重试',
    save: '保存',
  },
  customerService: {
    status: {
      closed: '已结束',
      queueing: '客户排队中',
      serving: '人工服务中',
      unknown: '状态待同步',
    },
  },
  error: {
    forbidden: '当前账号没有权限执行此操作',
    network: '网络连接异常，请检查网络后重试',
    tenantAlreadyMember: '你已在该企业中，可直接切换进入',
    unauthorized: '登录状态已失效，请重新登录',
    unknown: '未知错误',
  },
  message: {
    fileFallback: '[文件]',
    imageFallback: '[图片]',
    messageFallback: '[消息]',
    unreadCount: '{count} 条未读',
    videoFallback: '[视频]',
    voiceFallback: '[语音]',
  },
  nav: {
    contacts: '通讯录',
    messages: '消息',
    onlineService: '在线客服',
    settings: '设置',
  },
  settings: {
    language: '语言',
  },
} as const;

type WidenMessageLeaves<T> = {
  [Key in keyof T]: T[Key] extends string ? string : WidenMessageLeaves<T[Key]>;
};

export type MessageDictionary = WidenMessageLeaves<typeof zhCN>;
