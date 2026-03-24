// 跟踪原生对话框是否正在显示，防止窗口自动隐藏
let isNativeDialogOpen = false

export function setNativeDialogOpen(value: boolean) {
  isNativeDialogOpen = value
}

export function isNativeDialogCurrentlyOpen(): boolean {
  return isNativeDialogOpen
}
