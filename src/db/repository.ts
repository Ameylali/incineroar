export interface BaseRepository<T, CreatTData = T> {
  getById(id: string): Promise<T>;
  create(model: CreatTData): Promise<T>;
}

export interface CRUDRepository<T> extends BaseRepository<T> {
  updateById(id: string, model: Partial<T>): Promise<T>;
  deleteById(id: string): Promise<void>;
}
