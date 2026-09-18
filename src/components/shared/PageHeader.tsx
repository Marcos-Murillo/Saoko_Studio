interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
      <div className="flex flex-col gap-1 min-w-0">
        <h2 className="text-[1.35rem] md:text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
          {title}
        </h2>
        {description && (
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="page-header-actions flex flex-wrap gap-2 w-full md:w-auto md:shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}
