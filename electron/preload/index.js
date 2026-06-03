const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (updates) => ipcRenderer.invoke('settings:set', updates)
  },

  // Codeforces auth
  cf: {
    login: () => ipcRenderer.invoke('cf:login'),
    checkLogin: () => ipcRenderer.invoke('cf:checkLogin'),
    logout: () => ipcRenderer.invoke('cf:logout'),
    getProblems: (filters) => ipcRenderer.invoke('cf:getProblems', filters),
    getUserInfo: (handle) => ipcRenderer.invoke('cf:getUserInfo', handle),
    getUserStatus: (handle) => ipcRenderer.invoke('cf:getUserStatus', handle),
    getSampleTests: (contestId, index) => ipcRenderer.invoke('cf:getSampleTests', contestId, index),
    submit: (params) => ipcRenderer.invoke('cf:submit', params),
    getSubmissionStatus: (submissionId, handle) =>
      ipcRenderer.invoke('cf:getSubmissionStatus', submissionId, handle)
  },

  // File system
  file: {
    browseDirectory: () => ipcRenderer.invoke('file:browseDirectory'),
    browseFile: () => ipcRenderer.invoke('file:browseFile'),
    readFile: (filePath) => ipcRenderer.invoke('file:readFile', filePath),
    getFilesInDir: (dir) => ipcRenderer.invoke('file:getFilesInDir', dir),
    runTests: (params) => ipcRenderer.invoke('file:runTests', params)
  },

  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  },

  // Event subscriptions (main → renderer)
  on: (channel, callback) => {
    const allowed = ['cf:submissionUpdate']
    if (!allowed.includes(channel)) return
    const handler = (_, ...args) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.off(channel, handler)
  }
})
