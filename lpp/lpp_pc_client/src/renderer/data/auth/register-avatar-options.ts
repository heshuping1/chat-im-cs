export type RegisterAvatarCategory = "ai_beauty" | "cartoon" | "green_bubble";

export type RegisterAvatarOption = {
  avatarUrl: string;
  category: RegisterAvatarCategory;
  id: string;
  label: string;
};

type AvatarPreset = {
  accessory?: "bubble" | "chat" | "glasses" | "glow" | "headset" | "ribbon";
  background: string;
  category: RegisterAvatarCategory;
  expression: "bright" | "calm" | "cute" | "soft";
  hair: "bob" | "curly" | "long" | "short" | "side" | "wave";
  hairColor: string;
  id: string;
  jacket: string;
  label: string;
  skin: string;
  tint: string;
};

const avatarPresets: AvatarPreset[] = [
  {
    accessory: "glow",
    background: "#fff7ed",
    category: "ai_beauty",
    expression: "soft",
    hair: "long",
    hairColor: "#4a251c",
    id: "ai-beauty-warm",
    jacket: "#ef7c45",
    label: "AI暖光美女头像",
    skin: "#f3c6aa",
    tint: "#fed7aa",
  },
  {
    accessory: "glow",
    background: "#fdf2f8",
    category: "ai_beauty",
    expression: "bright",
    hair: "wave",
    hairColor: "#5b2a43",
    id: "ai-beauty-rose",
    jacket: "#db2777",
    label: "AI玫瑰美女头像",
    skin: "#f0bea0",
    tint: "#fbcfe8",
  },
  {
    background: "#eef2ff",
    category: "ai_beauty",
    expression: "calm",
    hair: "side",
    hairColor: "#312e81",
    id: "ai-beauty-clear",
    jacket: "#4f46e5",
    label: "AI清透美女头像",
    skin: "#efc4a5",
    tint: "#c7d2fe",
  },
  {
    accessory: "glasses",
    background: "#ecfeff",
    category: "ai_beauty",
    expression: "soft",
    hair: "bob",
    hairColor: "#203040",
    id: "ai-beauty-smart",
    jacket: "#0891b2",
    label: "AI知性美女头像",
    skin: "#edc2a4",
    tint: "#a5f3fc",
  },
  {
    accessory: "ribbon",
    background: "#fff1f2",
    category: "ai_beauty",
    expression: "bright",
    hair: "curly",
    hairColor: "#7f1d1d",
    id: "ai-beauty-sweet",
    jacket: "#e11d48",
    label: "AI甜美美女头像",
    skin: "#f1b999",
    tint: "#fecdd3",
  },
  {
    accessory: "glow",
    background: "#f5f3ff",
    category: "ai_beauty",
    expression: "calm",
    hair: "long",
    hairColor: "#2f255d",
    id: "ai-beauty-purple",
    jacket: "#7c3aed",
    label: "AI梦紫美女头像",
    skin: "#f2c6ad",
    tint: "#ddd6fe",
  },
  {
    accessory: "ribbon",
    background: "#ecfdf5",
    category: "cartoon",
    expression: "cute",
    hair: "bob",
    hairColor: "#164e63",
    id: "cartoon-mint",
    jacket: "#14b8a6",
    label: "卡通薄荷头像",
    skin: "#f3c7a6",
    tint: "#a7f3d0",
  },
  {
    background: "#eff6ff",
    category: "cartoon",
    expression: "cute",
    hair: "short",
    hairColor: "#1e3a8a",
    id: "cartoon-blue",
    jacket: "#2563eb",
    label: "卡通蓝莓头像",
    skin: "#f1b995",
    tint: "#bfdbfe",
  },
  {
    accessory: "bubble",
    background: "#fff7ed",
    category: "cartoon",
    expression: "bright",
    hair: "curly",
    hairColor: "#6b3f2a",
    id: "cartoon-orange",
    jacket: "#f97316",
    label: "卡通元气头像",
    skin: "#e8b08d",
    tint: "#fed7aa",
  },
  {
    accessory: "ribbon",
    background: "#fdf2f8",
    category: "cartoon",
    expression: "cute",
    hair: "side",
    hairColor: "#831843",
    id: "cartoon-pink",
    jacket: "#ec4899",
    label: "卡通粉桃头像",
    skin: "#f0bea0",
    tint: "#fbcfe8",
  },
  {
    accessory: "bubble",
    background: "#fefce8",
    category: "cartoon",
    expression: "bright",
    hair: "wave",
    hairColor: "#713f12",
    id: "cartoon-lemon",
    jacket: "#ca8a04",
    label: "卡通柠檬头像",
    skin: "#f0c29f",
    tint: "#fde68a",
  },
  {
    background: "#f8fafc",
    category: "cartoon",
    expression: "calm",
    hair: "long",
    hairColor: "#111827",
    id: "cartoon-gray",
    jacket: "#64748b",
    label: "卡通灰调头像",
    skin: "#dca47f",
    tint: "#cbd5e1",
  },
  {
    accessory: "chat",
    background: "#ecfdf5",
    category: "green_bubble",
    expression: "soft",
    hair: "bob",
    hairColor: "#224035",
    id: "bubble-service",
    jacket: "#00a572",
    label: "绿泡泡客服头像",
    skin: "#f0bea0",
    tint: "#99f6e4",
  },
  {
    accessory: "headset",
    background: "#f0fdfa",
    category: "green_bubble",
    expression: "bright",
    hair: "long",
    hairColor: "#14532d",
    id: "bubble-headset",
    jacket: "#059669",
    label: "绿泡泡耳麦头像",
    skin: "#f3c6aa",
    tint: "#a7f3d0",
  },
  {
    accessory: "chat",
    background: "#ecfeff",
    category: "green_bubble",
    expression: "calm",
    hair: "side",
    hairColor: "#134e4a",
    id: "bubble-chat",
    jacket: "#0d9488",
    label: "绿泡泡会话头像",
    skin: "#edc2a4",
    tint: "#a5f3fc",
  },
  {
    accessory: "bubble",
    background: "#f0fdf4",
    category: "green_bubble",
    expression: "cute",
    hair: "curly",
    hairColor: "#166534",
    id: "bubble-cute",
    jacket: "#16a34a",
    label: "绿泡泡亲和头像",
    skin: "#e8b08d",
    tint: "#bbf7d0",
  },
  {
    accessory: "headset",
    background: "#f7fee7",
    category: "green_bubble",
    expression: "soft",
    hair: "wave",
    hairColor: "#365314",
    id: "bubble-online",
    jacket: "#65a30d",
    label: "绿泡泡在线头像",
    skin: "#efc4a5",
    tint: "#d9f99d",
  },
  {
    accessory: "chat",
    background: "#f8fafc",
    category: "green_bubble",
    expression: "bright",
    hair: "short",
    hairColor: "#0f172a",
    id: "bubble-brand",
    jacket: "#10b981",
    label: "绿泡泡品牌头像",
    skin: "#f1b999",
    tint: "#d1fae5",
  },
];

export const registerAvatarOptions: RegisterAvatarOption[] = avatarPresets.map((preset) => ({
  avatarUrl: createAvatarDataUrl(preset),
  category: preset.category,
  id: preset.id,
  label: preset.label,
}));

function createAvatarDataUrl(preset: AvatarPreset) {
  const cuteEyes = preset.expression === "cute";
  const mouthPath =
    preset.expression === "calm"
      ? "M42 58c3.8 2.5 8.5 2.5 12 0"
      : preset.expression === "bright"
        ? "M40 57c5.2 5.2 12.8 5.2 18 0"
        : "M41 57c4.8 4 11.2 4 16 0";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="bg" x1="10" y1="8" x2="86" y2="88" gradientUnits="userSpaceOnUse"><stop stop-color="${preset.background}"/><stop offset="1" stop-color="${preset.tint}"/></linearGradient><radialGradient id="gloss" cx="34" cy="24" r="60" gradientUnits="userSpaceOnUse"><stop stop-color="#fff" stop-opacity=".9"/><stop offset=".65" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#0f172a" flood-opacity=".16"/></filter></defs><rect width="96" height="96" rx="28" fill="url(#bg)"/><circle cx="78" cy="22" r="17" fill="#fff" opacity=".42"/><circle cx="19" cy="76" r="22" fill="#fff" opacity=".3"/>${backgroundAccessory(preset)}<g filter="url(#shadow)"><path d="M24 86c2.8-14.2 13.2-23 24-23s21.2 8.8 24 23Z" fill="${preset.jacket}"/><path d="M35 67h26l-3.5 16h-19Z" fill="#fff" opacity=".9"/><path d="${hairBackPath(preset.hair)}" fill="${preset.hairColor}"/><ellipse cx="48" cy="45" rx="20" ry="23" fill="${preset.skin}"/><path d="${hairFrontPath(preset.hair)}" fill="${preset.hairColor}"/><circle cx="40" cy="46" r="${cuteEyes ? 3 : 2.3}" fill="#1f2937"/><circle cx="56" cy="46" r="${cuteEyes ? 3 : 2.3}" fill="#1f2937"/><circle cx="42" cy="44" r="1.1" fill="#fff" opacity=".85"/><circle cx="58" cy="44" r="1.1" fill="#fff" opacity=".85"/><path d="${mouthPath}" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round" opacity=".72"/><path d="M38 39c2.7-1.6 5.1-1.6 7.2 0" fill="none" stroke="#1f2937" stroke-width="2.2" stroke-linecap="round" opacity=".45"/><path d="M52.8 39c2.7-1.6 5.1-1.6 7.2 0" fill="none" stroke="#1f2937" stroke-width="2.2" stroke-linecap="round" opacity=".45"/><path d="M32 76c8 4.6 24 4.6 32 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".4"/>${faceAccessory(preset.accessory)}</g><rect width="96" height="96" rx="28" fill="url(#gloss)" opacity=".55"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function backgroundAccessory(preset: AvatarPreset) {
  if (preset.category === "green_bubble") {
    return '<circle cx="72" cy="70" r="12" fill="#00c985" opacity=".22"/><path d="M22 18h23c6 0 10 4 10 9s-4 9-10 9H34l-9 7 2-7h-5c-6 0-10-4-10-9s4-9 10-9Z" fill="#00a572" opacity=".18"/>';
  }
  if (preset.category === "ai_beauty") {
    return '<path d="M72 18l2.2 5.2 5.4 1.8-5.4 1.8L72 32l-2.2-5.2-5.4-1.8 5.4-1.8Z" fill="#fff" opacity=".8"/><circle cx="22" cy="26" r="4" fill="#fff" opacity=".55"/>';
  }
  return '<circle cx="73" cy="71" r="6" fill="#fff" opacity=".52"/><circle cx="22" cy="22" r="5" fill="#fff" opacity=".46"/>';
}

function hairBackPath(hair: AvatarPreset["hair"]) {
  if (hair === "short") return "M28 43c0-15 9-25 22-25 12 0 19 9 19 23 0 10-4 18-8 23-2-11-7-24-28-21-2 8-2 15-1 22-5-7-4-16-4-22Z";
  if (hair === "bob") return "M27 47c0-18 10-29 22-29s22 11 22 29c0 10-3 19-8 25-2-13-5-21-15-21s-15 8-17 21c-5-6-4-15-4-25Z";
  if (hair === "long") return "M25 83c3-12 2-25 2-38 0-17 10-28 22-28s22 11 22 28c0 13-1 26 3 38-10 5-19 1-25-5-6 6-16 10-24 5Z";
  if (hair === "curly") return "M27 45c-3-9 4-20 12-19 3-8 17-8 21 0 8-1 15 10 12 19 4 7 0 17-8 18-2-12-8-20-16-20-8 0-14 8-16 20-8-1-12-11-5-18Z";
  if (hair === "side") return "M28 48c-1-16 8-29 23-29 14 0 22 10 22 25-15-2-26-8-36-15-5 6-7 13-7 21 0 8 1 14 3 20-7-4-5-15-5-22Z";
  return "M26 49c0-17 11-29 24-29 12 0 21 9 22 23-11-6-25-7-42 3 0 11 1 18 4 24-7-3-8-12-8-21Z";
}

function hairFrontPath(hair: AvatarPreset["hair"]) {
  if (hair === "short") return "M29 39c6-15 24-19 39-4-8-1-17-3-28-9-4 4-7 8-11 13Z";
  if (hair === "bob") return "M29 41c6-16 31-20 39 0-10-7-26-9-39 0Z";
  if (hair === "long") return "M30 41c5-17 30-21 38 1-12-7-22-9-38-1Z";
  if (hair === "curly") return "M29 40c6-17 31-20 39 0-5-3-11-4-18-4-8 0-14 1-21 4Z";
  if (hair === "side") return "M28 42c9-19 29-20 42-2-15 1-28-3-42-13v15Z";
  return "M28 42c8-18 31-20 42 0-13-7-27-8-42 0Z";
}

function faceAccessory(accessoryType?: AvatarPreset["accessory"]) {
  if (accessoryType === "headset") {
    return '<path d="M28 50c0-17 9-29 20-29s20 12 20 29" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" opacity=".75"/><rect x="23" y="47" width="9" height="15" rx="4" fill="#0f172a" opacity=".78"/><rect x="64" y="47" width="9" height="15" rx="4" fill="#0f172a" opacity=".78"/><path d="M65 61c0 8-6 12-15 12" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" opacity=".72"/><circle cx="48" cy="73" r="3" fill="#0f172a" opacity=".78"/>';
  }
  if (accessoryType === "glasses") {
    return '<path d="M35 46h12M53 46h12M47 46h6" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" opacity=".7"/><rect x="33" y="42" width="15" height="10" rx="5" fill="none" stroke="#0f172a" stroke-width="2" opacity=".65"/><rect x="52" y="42" width="15" height="10" rx="5" fill="none" stroke="#0f172a" stroke-width="2" opacity=".65"/>';
  }
  if (accessoryType === "ribbon") {
    return '<path d="M28 30l8 4-8 5ZM43 30l-8 4 8 5Z" fill="#fff" opacity=".82"/>';
  }
  if (accessoryType === "chat") {
    return '<path d="M61 28h13c4 0 7 2.8 7 6.2S78 40 74 40h-5l-6 5 1.3-5H61c-4 0-7-2.4-7-5.8S57 28 61 28Z" fill="#fff" opacity=".86"/><circle cx="64" cy="34" r="1.3" fill="#00a572"/><circle cx="69" cy="34" r="1.3" fill="#00a572"/><circle cx="74" cy="34" r="1.3" fill="#00a572"/>';
  }
  if (accessoryType === "bubble") {
    return '<circle cx="30" cy="31" r="5" fill="#fff" opacity=".78"/><circle cx="25" cy="38" r="2.5" fill="#fff" opacity=".64"/>';
  }
  return "";
}
