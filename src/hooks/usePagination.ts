import { TableProps } from 'antd';
import { useState } from 'react';

import { PaginationParams } from '../types/endpoints';

export interface UsePaginationReturn<T> {
  currentPage: number;
  pageSize: number;
  paginationParams: PaginationParams;
  handleTableChange: TableProps<T>['onChange'];
  paginationProps: TableProps<T>['pagination'];
}

export const usePagination = <T>(
  initialPageSize: number = 10,
): UsePaginationReturn<T> => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const offset = (currentPage - 1) * pageSize;
  const paginationParams: PaginationParams = { limit: pageSize, offset };

  const handleTableChange: TableProps<T>['onChange'] = (pagination) => {
    if (pagination?.current) setCurrentPage(pagination.current);
    if (pagination?.pageSize) setPageSize(pagination.pageSize);
  };

  const paginationProps = {
    current: currentPage,
    pageSize,
    total: 0, // Will be overridden when used
    showSizeChanger: true,
  };

  return {
    currentPage,
    pageSize,
    paginationParams,
    handleTableChange,
    paginationProps,
  };
};
