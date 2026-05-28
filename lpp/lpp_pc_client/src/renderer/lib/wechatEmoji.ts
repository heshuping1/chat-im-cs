export type WechatEmojiItem = {
  id: string;
  label: string;
  value: string;
};

export const wechatEmojiItems: WechatEmojiItem[] = [
  ["微笑", "🙂"],
  ["难过", "🙁"],
  ["色", "😍"],
  ["发怒", "😠"],
  ["酷", "😎"],
  ["大哭", "😭"],
  ["害羞", "☺️"],
  ["闭嘴", "🤐"],
  ["睡", "😴"],
  ["大笑", "😆"],
  ["流汗", "😓"],
  ["生气", "😡"],
  ["调皮", "😛"],
  ["呲牙", "😁"],
  ["惊讶", "😯"],
  ["失望", "☹️"],
  ["委屈", "🥺"],
  ["抓狂", "😫"],
  ["裂开", "🥲"],
  ["偷笑", "🤭"],
  ["愉快", "😊"],
  ["白眼", "🙄"],
  ["疑问", "🤔"],
  ["嘘", "🤫"],
  ["晕", "😵"],
  ["恐惧", "😱"],
  ["骷髅", "💀"],
  ["敲打", "🔨"],
  ["再见", "👋"],
  ["擦汗", "😅"],
  ["抠鼻", "🤧"],
  ["鼓掌", "👏"],
  ["坏笑", "😏"],
  ["左哼哼", "😤"],
  ["右哼哼", "😤"],
  ["哈欠", "🥱"],
  ["鄙视", "😒"],
  ["快哭了", "😢"],
  ["阴险", "😼"],
  ["亲亲", "😘"],
  ["可怜", "🥹"],
  ["笑脸", "😃"],
  ["生病", "🤒"],
  ["脸红", "😳"],
  ["破涕为笑", "😂"],
  ["捂脸", "🤦"],
  ["奸笑", "😏"],
  ["机智", "🧐"],
  ["皱眉", "😟"],
  ["耶", "✌️"],
  ["吃瓜", "🍉"],
  ["加油", "💪"],
  ["汗", "😰"],
  ["天啊", "😲"],
  ["旺柴", "🐶"],
  ["好的", "👌"],
  ["加油加油", "🙌"],
  ["哇", "🤩"],
  ["翻白眼", "🙄"],
].map(([label, value]) => ({
  id: label,
  label,
  value,
}));

const emojiCodeMap = new Map(
  wechatEmojiItems.map((item) => [`[${item.label}]`, item.value] as const),
);

export function renderWechatEmojiText(text: string) {
  let result = text;
  emojiCodeMap.forEach((emoji, code) => {
    result = result.split(code).join(emoji);
  });
  return result;
}
