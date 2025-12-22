'use client'

import dynamic from 'next/dynamic'

const RedocStandalone = dynamic(
  () => import('redoc').then(mod => mod.RedocStandalone),
  { ssr: false }
)

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <RedocStandalone 
        specUrl="/api/openapi.json"
        options={{
          scrollYOffset: 0,
          theme: {
            colors: {
              primary: {
                main: '#0ea5e9'
              }
            },
            typography: {
              fontSize: '14px',
              fontFamily: 'Inter, system-ui, sans-serif'
            }
          }
        }}
      />
    </div>
  )
}
