export interface Pagination<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalRecords: number;
  };
  message?: string;
  errors?: any;
}
