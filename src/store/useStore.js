import { create } from 'zustand'

const useStore = create((set, get) => ({
  // Settings
  settings: {},
  setSettings: (settings) => set({ settings }),
  updateSettings: (updates) => set(s => ({ settings: { ...s.settings, ...updates } })),

  // Auth
  isLoggedIn: false,
  setLoggedIn: (v) => set({ isLoggedIn: v }),

  // Problem browser
  problems: [],
  setProblems: (problems) => set({ problems }),
  allTags: [],
  setAllTags: (tags) => set({ allTags: tags }),

  // Currently viewed problem
  activeProblem: null,
  setActiveProblem: (problem) => set({ activeProblem: problem }),

  // Sample tests for active problem
  sampleTests: [],
  setSampleTests: (tests) => set({ sampleTests: tests }),

  // Local test run results
  testResults: [],
  setTestResults: (results) => set({ testResults: results }),
  isRunningTests: false,
  setRunningTests: (v) => set({ isRunningTests: v }),

  // Submission state
  currentSubmission: null,
  setCurrentSubmission: (sub) => set({ currentSubmission: sub }),
  submissionHistory: [],
  addSubmission: (sub) => set(s => ({
    submissionHistory: [sub, ...s.submissionHistory].slice(0, 50)
  })),
  updateSubmission: (id, updates) => set(s => ({
    currentSubmission: s.currentSubmission?.id === id
      ? { ...s.currentSubmission, ...updates }
      : s.currentSubmission,
    submissionHistory: s.submissionHistory.map(s =>
      s.id === id ? { ...s, ...updates } : s
    )
  })),

  // UI state
  activeTab: 'problems', // problems | settings
  setActiveTab: (tab) => set({ activeTab: tab }),
  sidebarCollapsed: false,
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed }))
}))

export default useStore
