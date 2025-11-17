// Preload runs in an isolated context. Keep it minimal.
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('svtplayApp', {
  version: '0.1.0'
})
