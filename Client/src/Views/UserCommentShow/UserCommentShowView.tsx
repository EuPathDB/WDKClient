import React, { ReactNode } from 'react';
import { FormRowProps } from 'wdk-client/Views/UserCommentForm/FormRow';
import { FormBody } from 'wdk-client/Views/UserCommentForm/FormBody';

export interface UserCommentShowViewProps {
  title: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  formGroupFields: Record<string, (FormRowProps & { key: string })[]>;
  formGroupHeaders: Record<string, ReactNode>;
  formGroupOrder: string[];
  formGroupClassName?: string;
  formGroupHeaderClassName?: string;
  formGroupBodyClassName?: string;
}

export const UserCommentShowView: React.SFC<UserCommentShowViewProps> = ({
  title,
  className,
  headerClassName,
  bodyClassName,
  ...formBodyProps
}) => (
  <div className={className}>
    <div className={headerClassName}>
      {title}
    </div>
    <div className={bodyClassName}>
      <FormBody {...formBodyProps} />
    </div>
  </div>
);
