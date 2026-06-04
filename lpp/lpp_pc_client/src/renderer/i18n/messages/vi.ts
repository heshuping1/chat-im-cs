import type { MessageDictionary } from './zh-CN';

export const vi: MessageDictionary = {
  app: {
    loading: 'Đang tải...',
    title: 'LPP',
  },
  common: {
    cancel: 'Hủy',
    close: 'Đóng',
    confirm: 'Xác nhận',
    copy: 'Sao chép',
    loading: 'Đang tải...',
    retry: 'Thử lại',
    save: 'Lưu',
  },
  customerService: {
    status: {
      closed: 'Đã kết thúc',
      queueing: 'Khách đang chờ',
      serving: 'Nhân viên đang hỗ trợ',
      unknown: 'Đang đồng bộ trạng thái',
    },
  },
  error: {
    forbidden: 'Tài khoản hiện tại không có quyền thực hiện thao tác này.',
    network: 'Lỗi mạng. Vui lòng kiểm tra kết nối rồi thử lại.',
    tenantAlreadyMember: 'Bạn đã ở trong doanh nghiệp này. Có thể chuyển vào trực tiếp.',
    unauthorized: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    unknown: 'Lỗi không xác định',
  },
  message: {
    fileFallback: '[Tệp]',
    imageFallback: '[Hình ảnh]',
    messageFallback: '[Tin nhắn]',
    unreadCount: '{count} chưa đọc',
    videoFallback: '[Video]',
    voiceFallback: '[Thoại]',
  },
  nav: {
    contacts: 'Danh bạ',
    messages: 'Tin nhắn',
    onlineService: 'CSKH',
    settings: 'Cài đặt',
  },
  settings: {
    language: 'Ngôn ngữ',
  },
};
