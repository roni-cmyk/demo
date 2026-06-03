import { PaginatedResult } from '../interfaces/paginated-result.interface';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

export function createPaginationResult<T>(
  data: T[],
  totalItems: number,
  query: PaginationQueryDto,
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalItems / query.limit);

  return {
    data,
    meta: {
      totalItems,
      itemCount: data.length,
      itemsPerPage: query.limit,
      totalPages: totalPages === 0 && data.length === 0 ? 0 : Math.max(1, totalPages),
      currentPage: query.page,
    },
  };
}
