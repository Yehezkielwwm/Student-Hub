import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileNavOpen: (open: boolean) => void
}

const initialCollapsed =
  typeof window !== 'undefined' && window.localStorage.getItem('sh-sidebar') === 'collapsed'

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: initialCollapsed,
  mobileNavOpen: false,
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    set({ sidebarCollapsed: next })
    window.localStorage.setItem('sh-sidebar', next ? 'collapsed' : 'expanded')
  },
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed })
    window.localStorage.setItem('sh-sidebar', collapsed ? 'collapsed' : 'expanded')
  },
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}))
