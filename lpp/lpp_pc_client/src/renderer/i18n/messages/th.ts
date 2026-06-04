import type { MessageDictionary } from './zh-CN';

export const th: MessageDictionary = {
  app: {
    loading: 'กำลังโหลด...',
    title: 'LPP',
  },
  common: {
    cancel: 'ยกเลิก',
    close: 'ปิด',
    confirm: 'ยืนยัน',
    copy: 'คัดลอก',
    loading: 'กำลังโหลด...',
    retry: 'ลองอีกครั้ง',
    save: 'บันทึก',
  },
  customerService: {
    status: {
      closed: 'สิ้นสุดแล้ว',
      queueing: 'ลูกค้ากำลังรอ',
      serving: 'เจ้าหน้าที่กำลังให้บริการ',
      unknown: 'กำลังซิงค์สถานะ',
    },
  },
  error: {
    forbidden: 'บัญชีนี้ไม่มีสิทธิ์ดำเนินการนี้',
    network: 'เครือข่ายผิดปกติ โปรดตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง',
    tenantAlreadyMember: 'คุณอยู่ในองค์กรนี้แล้ว สามารถสลับเข้าใช้งานได้โดยตรง',
    unauthorized: 'เซสชันหมดอายุ โปรดเข้าสู่ระบบอีกครั้ง',
    unknown: 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ',
  },
  message: {
    fileFallback: '[ไฟล์]',
    imageFallback: '[รูปภาพ]',
    messageFallback: '[ข้อความ]',
    unreadCount: 'ยังไม่ได้อ่าน {count} รายการ',
    videoFallback: '[วิดีโอ]',
    voiceFallback: '[เสียง]',
  },
  nav: {
    contacts: 'ผู้ติดต่อ',
    messages: 'ข้อความ',
    onlineService: 'บริการลูกค้า',
    settings: 'ตั้งค่า',
  },
  settings: {
    language: 'ภาษา',
  },
};
