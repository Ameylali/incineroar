export interface BaseRepository<T> {
  getById(id: string): Promise<T>;
  create(model: T): Promise<T>;
}

export interface CRUDRepository<T> extends BaseRepository<T> {
  updateById(id: string, model: Partial<T>): Promise<T>;
  deleteById(id: string): Promise<void>;
}
