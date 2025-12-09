/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production';
  }
}

interface Window {
  electron: {
    // Future electron APIs can be added here
  };
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    off: (channel: string, listener: (...args: any[]) => void) => void;
  };
}
