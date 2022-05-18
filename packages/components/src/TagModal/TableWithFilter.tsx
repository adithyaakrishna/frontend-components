import React, { Fragment } from 'react';
import { Pagination, Bullseye, EmptyState, EmptyStateVariant, Title, EmptyStateBody } from '@patternfly/react-core';
import { Table, TableHeader, TableBody } from '@patternfly/react-table';
import { EmptyTable } from '../EmptyTable';
import { TableToolbar } from '../TableToolbar';
import { PrimaryToolbar } from '../PrimaryToolbar';
import { Skeleton } from '../Skeleton';
import { SkeletonTable } from '../SkeletonTable';

export type PaginationShape = {
  count: number;
  page: number;
  perPage: number;
};

const defaultProps = {
  entityName: 'tags',
};

const TableWithFilter = ({
  rows,
  onSelect,
  selected,
  onUpdateData,
  pagination,
  loaded,
  calculateChecked,
  unique,
  filters,
  primaryToolbarProps,
  children,
  title,
  systemName,
  columns,
  tableProps,
  entityName,
  bulkSelect,
}: {
  rows: Array<any>;
  onSelect: (...args: any[]) => any;
  selected: Array<any>;
  onUpdateData?: (...args: any[]) => any;
  pagination?: PaginationShape;
  loaded?: boolean;
  calculateChecked: (...args: any[]) => any;
  unique: (...args: any[]) => any;
  filters?: Array<any>;
  primaryToolbarProps?: Record<string, unknown>;
  children?: React.ReactNode;
  title?: string;
  systemName?: string;
  columns: Array<any>;
  tableProps?: Record<string, unknown>;
  entityName?: string;
  bulkSelect?: any;
}) => {
  const onRowSelect = ({ isSelected, rowId }: { isSelected: boolean; rowId: number }) => {
    const currRow = rows?.[rowId];
    if (currRow) {
      onSelect(isSelected ? [...selected, currRow] : selected.filter(({ id }: { id: number }) => id !== currRow.id));
    }
  };

  return (
    <Fragment>
      {onUpdateData && (
        <PrimaryToolbar
          {...(onSelect &&
            pagination && {
              bulkSelect: {
                count: selected?.length,
                onSelect: (isSelected) => {
                  if (isSelected) {
                    onSelect(unique?.([...rows, ...selected]));
                  } else {
                    onSelect(selected.filter(({ id }) => !rows.find(({ id: rowId }) => rowId === id)));
                  }
                },
                checked: loaded && calculateChecked?.(rows, selected),
                items: [
                  {
                    title: 'Select none (0)',
                    onClick: () => onSelect([]),
                  },
                  {
                    ...(loaded && rows?.length > 0
                      ? {
                          title: `Select page (${rows.length})`,
                          onClick: () => onSelect(unique([...rows, ...selected])),
                        }
                      : {}),
                  },
                ],
                ...(bulkSelect || {}),
              },
            })}
          {...(filters && {
            filterConfig: {
              items: filters,
            },
          })}
          pagination={
            loaded ? (
              {
                ...(pagination || {}),
                itemCount: pagination?.count,
                onSetPage: (_e, page) => onUpdateData({ ...pagination, page }),
                onPerPageSelect: (_e, perPage) => onUpdateData({ ...pagination, page: 1, perPage }),
              }
            ) : (
              <Skeleton size="lg" />
            )
          }
          {...primaryToolbarProps}
        />
      )}
      {children}
      {loaded ? (
        <Table
          aria-label={title || `${systemName} ${entityName}`}
          variant="compact"
          className="ins-c-tag-modal__table"
          cells={columns}
          rows={
            rows?.length
              ? rows
              : [
                  {
                    cells: [
                      {
                        title: (
                          <EmptyTable>
                            <Bullseye>
                              <EmptyState variant={EmptyStateVariant.full}>
                                <Title headingLevel="h5" size="lg">
                                  No {entityName} found
                                </Title>
                                <EmptyStateBody>
                                  This filter criteria matches no {entityName}. <br /> Try changing your filter settings.
                                </EmptyStateBody>
                              </EmptyState>
                            </Bullseye>
                          </EmptyTable>
                        ),
                        props: {
                          colSpan: columns.length,
                        },
                      },
                    ],
                  },
                ]
          }
          {...(onSelect() &&
            rows?.length && {
              onSelect: (_event, isSelected, rowId) => onRowSelect({ isSelected, rowId }),
            })}
          {...tableProps}
        >
          <TableHeader />
          <TableBody />
        </Table>
      ) : (
        <SkeletonTable columns={columns} rowSize={pagination?.perPage || 10} />
      )}
      {onUpdateData && pagination && loaded && (
        <TableToolbar isFooter className="ins-c-inventory__table--toolbar">
          <Pagination
            itemCount={pagination?.count}
            perPage={pagination?.perPage}
            page={pagination?.page || 0}
            variant="bottom"
            onSetPage={(_event, page) => onUpdateData({ ...pagination, page })}
            onPerPageSelect={(_event, perPage) => onUpdateData({ ...pagination, page: 1, perPage })}
          />
        </TableToolbar>
      )}
    </Fragment>
  );
};

TableWithFilter.defaultProps = defaultProps;

export default TableWithFilter;
