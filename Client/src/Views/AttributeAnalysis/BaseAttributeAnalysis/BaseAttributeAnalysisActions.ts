import { from, Observable } from 'rxjs';
import { filter, mergeMap, takeUntil } from 'rxjs/operators';

import { State } from 'wdk-client/Views/AttributeAnalysis/BaseAttributeAnalysis/BaseAttributeAnalysisState';

import { EpicDependencies } from 'wdk-client/Core/Store';
import { Action, makeActionCreator } from 'wdk-client/Utils/ActionCreatorUtils';
import { PluginContext } from 'wdk-client/Utils/ClientPlugin';
import { Reporter } from 'wdk-client/Utils/WdkModel';
import { ServiceError } from 'wdk-client/Utils/WdkService';

// Actions
// -------

// Scoped analysis action
export const ScopedAnalysisAction =
  makeActionCreator<{ action: Action, reporter: Reporter, stepId: number, context: PluginContext }, 'attribute-reporter/scoped-action'>('attribute-reporter/scoped-action');

// Report requested
export const AttributeReportRequested =
  makeActionCreator<{ stepId: number; reporterName: string; }, 'attribute-reporter/requested'>('attribute-reporter/requested')

// Report success reposonse
export const AttributeReportReceived =
  makeActionCreator<{ report: any }, 'attribute-reporter/received'>('attribute-reporter/received')


// Report failed response
export const AttributeReportFailed =
  makeActionCreator<{ error: ServiceError }, 'attribute-reporter/failed'>('attribute-reporter/failed')


// Report cancelled
export const AttributeReportCancelled =
  makeActionCreator('attribute-reporter/cancelled')

export const TablePaged =
  makeActionCreator<number, 'attribute-reporter/table-paged'>('attribute-reporter/table-paged');

export const TableRowsPerPageChanged =
  makeActionCreator<number, 'attribute-reporter/table-rows-per-page-changed'>('attribute-reporter/table-rows-per-page-changed');

export const TableSorted =
  makeActionCreator<{ key: string, direction: 'asc' | 'desc' }, 'attribute-reporter/table-sorted'>('attribute-reporter/table-sorted');

export const TableSearched =
  makeActionCreator<string, 'attribute-reporter/table-searched'>('attribute-reporter/table-searched');

export const TabSelected =
  makeActionCreator<string, 'attribute-reporter/tab-selected'>('attribute-reporter/tab-selected');

export function observeReportRequests<T extends string>(action$: Observable<Action>, state$: Observable<State<T>>, { wdkService }: EpicDependencies): Observable<Action> {
  return action$.pipe(
    filter(AttributeReportRequested.test),
    mergeMap(({ payload: { reporterName, stepId }}) =>
      from(
        wdkService.getStepAnswer(stepId, { format: reporterName }).then(
          report => AttributeReportReceived.create({ report }),
          error => AttributeReportFailed.create({ error })
        )).pipe(
          takeUntil(action$.pipe(filter(AttributeReportCancelled.test))))
        )
      )
}
