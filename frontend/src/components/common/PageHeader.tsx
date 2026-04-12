import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, actions }) => {
  return (
    <div
      data-testid="page-header"
      className="mb-6 flex min-h-[64px] flex-col justify-center gap-2 md:flex-row md:items-center md:justify-between"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-display text-text-primary">{title}</h1>
      </div>
      {actions && <div className="shrink-0 self-start md:self-center">{actions}</div>}
    </div>
  );
};

export default PageHeader;
