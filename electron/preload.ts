import { contextBridge, ipcRenderer } from 'electron';

// Define the API object to expose to the renderer process
const api = {
  // Future IPC methods can be added here
  // Example: invoke: (channel: string, args?: any) => ipcRenderer.invoke(channel, args)
};

// Expose safe APIs through context bridge
contextBridge.exposeInMainWorld('electron', api);

// Expose ipcRenderer for future use (be selective about what you expose)
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel: string, ...args: any[]) => {
    // Whitelist allowed channels
    const allowedChannels = [];
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    console.warn(`IPC channel "${channel}" is not allowed`);
    return Promise.reject(new Error(`IPC channel not allowed: ${channel}`));
  },
  on: (channel: string, listener: (...args: any[]) => void) => {
    const allowedChannels = [];
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => listener(...args));
    } else {
      console.warn(`IPC channel "${channel}" is not allowed`);
    }
  },
  off: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.off(channel, listener as any);
  },
});
