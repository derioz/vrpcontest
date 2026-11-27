import React from 'react';
import { PageHeader } from './kit';

export interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  /** Accepted for older call sites. Page titles stand without an icon tile. */
  icon?: React.ReactNode;
  iconBg?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminHeader({ title, subtitle, actions, className }: AdminHeaderProps) {
  return <PageHeader title={title} description={subtitle} actions={actions} className={className} />;
}

export default AdminHeader;
