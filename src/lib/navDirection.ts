let _dir: 'left' | 'right' | null = null
export const setNavDirection   = (d: typeof _dir) => { _dir = d }
export const getNavDirection   = () => _dir
export const clearNavDirection = () => { _dir = null }
