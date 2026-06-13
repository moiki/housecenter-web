import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--hc-text-primary)' }}>
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--hc-text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  )
}
