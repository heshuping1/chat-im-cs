const fallbackProductName = "LPP 客服客户端";

function normalizeProductName(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : fallbackProductName;
}

export const appProductName = normalizeProductName(
  typeof __LPP_PC_PRODUCT_NAME__ === "undefined" ? undefined : __LPP_PC_PRODUCT_NAME__,
);

export const appIconSrc = `${import.meta.env.BASE_URL}app-icon-green-bubble.png`;
