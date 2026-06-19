import type { LocalDataDriver } from "./local-data-driver.js";

interface LocalDataServiceOptions {
  driver: LocalDataDriver;
}

export function createLocalDataService(options: LocalDataServiceOptions) {
  return {
    close: options.driver.close.bind(options.driver),
    clearScope: options.driver.clearScope.bind(options.driver),
    cleanup: options.driver.cleanup.bind(options.driver),
    deleteMessage: options.driver.deleteMessage.bind(options.driver),
    deleteOutbox: options.driver.deleteOutbox.bind(options.driver),
    getMediaVariant: options.driver.getMediaVariant.bind(options.driver),
    getStorageStats: options.driver.getStorageStats.bind(options.driver),
    listCustomerServiceThreads: options.driver.listCustomerServiceThreads.bind(options.driver),
    listMessages: options.driver.listMessages.bind(options.driver),
    listOutbox: options.driver.listOutbox.bind(options.driver),
    repair: options.driver.repair.bind(options.driver),
    searchMessages: options.driver.searchMessages.bind(options.driver),
    upsertCustomerServiceThread: options.driver.upsertCustomerServiceThread.bind(options.driver),
    upsertMedia: options.driver.upsertMedia.bind(options.driver),
    upsertMessages: options.driver.upsertMessages.bind(options.driver),
    upsertOutbox: options.driver.upsertOutbox.bind(options.driver),
  };
}

export type LocalDataService = ReturnType<typeof createLocalDataService>;
