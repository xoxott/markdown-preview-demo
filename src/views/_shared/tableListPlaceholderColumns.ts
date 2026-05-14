/**
 * 满足 `useTable` / `@suga/hooks` 的 columns 协议；真实列由 `TablePage` 的 `columns` 提供。 泛型 `A`
 * 取列表接口函数类型，以便列类型与 `TableDataWithIndex<GetTableData<A>>` 对齐。
 */
export function tableListPlaceholderColumns<A extends NaiveUI.TableApiFn>(): NaiveUI.TableColumn<
  NaiveUI.TableDataWithIndex<NaiveUI.GetTableData<A>>
>[] {
  type Row = NaiveUI.TableDataWithIndex<NaiveUI.GetTableData<A>>;
  const col: NaiveUI.TableColumnWithKey<Row> = { title: ' ', key: 'index', width: 1 };
  return [col];
}
