// Preload runs in an isolated context. Expose safe APIs if needed.
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('svtplayApp', {
  version: '0.1.0'
})

