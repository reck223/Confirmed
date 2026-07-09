'use client'
import { useLayoutEffect, useState } from 'react'
import { getNavDirection, clearNavDirection } from '@/lib/navDirection'

export default function Template({ children }: { children: React.ReactNode }) {
  const [cls, setCls] = useState('page-enter')

  // useLayoutEffect fires before paint — direction is consumed synchronously
  // so the enter animation class is correct from the very first frame
  useLayoutEffect(() => {
    const dir = getNavDirection()
    clearNavDirection()
    if (dir === 'left')  setCls('page-enter-from-right')
    if (dir === 'right') setCls('page-enter-from-left')
  }, [])

  return <div className={cls}>{children}</div>
}
