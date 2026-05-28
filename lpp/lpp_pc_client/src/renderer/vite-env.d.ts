/// <reference types="vite/client" />

interface Window {
  __lppTestPushImMessage?: (payload: Record<string, unknown>) => void;
}
