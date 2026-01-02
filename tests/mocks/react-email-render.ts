// Mock for @react-email/render module
export const render = async (component: unknown) => {
  void component
  return '<html><body>Mocked Email</body></html>'
}

export const renderAsync = async (component: unknown) => {
  void component
  return '<html><body>Mocked Email</body></html>'
}
