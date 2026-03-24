import { invoke } from '@tauri-apps/api/core'
import type { NoteMetadata } from '@/types/note'


// 直接使用 invoke，在非 Tauri 环境下调用时会自然抛出异常（由各函数的 try/catch 捕获）
async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(command, args)
}

/**
 * File system operations using Tauri commands
 */
export function useFileSystem() {
  /**
   * Get the iCloud path for storing notes
   */
  async function getICloudPath(): Promise<string> {
    try {
      return await safeInvoke<string>('get_icloud_path')
    } catch (e) {
      console.error('Failed to get iCloud path:', e)
      throw new Error('Failed to access iCloud directory')
    }
  }

  /**
   * Read metadata.json file
   */
  async function readMetadata(): Promise<NoteMetadata> {
    try {
      const path = await getICloudPath()
      const content = await safeInvoke<string>('read_metadata', { basePath: path })
      return JSON.parse(content)
    } catch (e) {
      // If file doesn't exist or not in Tauri, return empty metadata
      console.error('Failed to read metadata, creating new:', e)
      return {
        version: 1,
        notes: [],
      }
    }
  }

  /**
   * Write metadata.json file
   */
  async function writeMetadata(metadata: NoteMetadata): Promise<void> {
    try {
      const path = await getICloudPath()
      const content = JSON.stringify(metadata, null, 2)
      await safeInvoke('write_metadata', { basePath: path, content })
    } catch (e) {
      console.error('Failed to write metadata:', e)
    }
  }

  /**
   * Read a single note file
   */
  async function readNote(id: string): Promise<string> {
    try {
      const path = await getICloudPath()
      return await safeInvoke<string>('read_note', { basePath: path, id })
    } catch (e) {
      console.error(`Failed to read note ${id}:`, e)
      return ''
    }
  }

  /**
   * Write a single note file
   */
  async function writeNote(id: string, content: string): Promise<void> {
    try {
      const path = await getICloudPath()
      await safeInvoke('write_note', { basePath: path, id, content })
    } catch (e) {
      console.error(`Failed to write note ${id}:`, e)
    }
  }

  /**
   * Delete a note file
   */
  async function deleteNote(id: string): Promise<void> {
    try {
      const path = await getICloudPath()
      await safeInvoke('delete_note', { basePath: path, id })
    } catch (e) {
      console.error(`Failed to delete note ${id}:`, e)
    }
  }

  return {
    getICloudPath,
    readMetadata,
    writeMetadata,
    readNote,
    writeNote,
    deleteNote,
  }
}
