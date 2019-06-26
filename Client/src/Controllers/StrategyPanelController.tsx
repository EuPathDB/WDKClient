import { keyBy } from 'lodash';
import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { requestDeleteStrategy, requestDuplicateStrategy, requestPatchStrategyProperties, requestStrategy, requestUpdateStepProperties } from 'wdk-client/Actions/StrategyActions';
import { Loading } from 'wdk-client/Components';
import { RootState } from 'wdk-client/Core/State/Types';
import { RecordClass } from 'wdk-client/Utils/WdkModel';
import { StepTree, StrategyDetails } from 'wdk-client/Utils/WdkUser';
import StrategyPanel from 'wdk-client/Views/Strategy/StrategyPanel';
import { UiStepTree } from 'wdk-client/Views/Strategy/Types';
import { setInsertStepWizardVisibility } from 'wdk-client/Actions/StrategyPanelActions';

interface OwnProps {
  strategyId: number;
  stepId?: number;
  action?: string;
}

type MappedProps = 
| {
  isLoading: true;
} | {
  isLoading: false;
  strategy: StrategyDetails;
  uiStepTree: UiStepTree;
  insertStepVisibility?: number;
}

interface MappedDispatch {
  requestStrategy: (id: number) => void;
  onStrategyCopy: (signature: string) => void;
  onStrategyDelete: () => void;
  onStrategyRename: (name: string) => void;
  onStrategySave: (name: string, isPublic: boolean, description?: string) => void;
  onShowInsertStep: (stepId: number) => void;
  onHideInsertStep: () => void;
  onExpandNestedStrategy: (stepId: number) => void;
  onCollapseNestedStrategy: (stepId: number) => void;
}

type Props = OwnProps & MappedProps & MappedDispatch;

function mapStateToProps(state: RootState, ownProps: OwnProps): MappedProps {
  const panelState = state.strategyPanel[ownProps.strategyId];
  const insertStepVisibility = panelState && panelState.visibleInsertStepWizard;
  const entry = state.strategies.strategies[ownProps.strategyId];
  const strategy = entry && entry.status === 'success' ? entry.strategy : undefined;
  const { recordClasses } = state.globalData;
  const uiStepTree = strategy && recordClasses && makeUiStepTree(strategy, keyBy(recordClasses, 'urlSegment'));
  return strategy == null || uiStepTree == null
    ? { isLoading: true }
    : { isLoading: false, strategy, uiStepTree, insertStepVisibility };
}

function mapDispatchToProps(dispatch: Dispatch, props: OwnProps): MappedDispatch {
  return bindActionCreators({
    requestStrategy,
    onStrategyCopy: (sourceStrategySignature: string) => requestDuplicateStrategy({ sourceStrategySignature }),
    onStrategyDelete: () => requestDeleteStrategy(props.strategyId),
    onStrategyRename: (name: string) => requestPatchStrategyProperties(props.strategyId, { name }),
    onStrategySave: (name: string, isPublic: boolean, description?: string) => requestPatchStrategyProperties(props.strategyId, { isPublic, isSaved: true, name, description }),
    onShowInsertStep: (stepId: number) => setInsertStepWizardVisibility(String(props.strategyId), stepId),
    onHideInsertStep: () => setInsertStepWizardVisibility(String(props.strategyId), undefined),
    onExpandNestedStrategy: (stepId: number) => requestUpdateStepProperties(props.strategyId, stepId, { expanded: true }),
    onCollapseNestedStrategy: (stepId: number) => requestUpdateStepProperties(props.strategyId, stepId, { expanded: false }),
  }, dispatch);
}

function StrategyPanelController(props: Props) {
  useEffect(() => {
    props.requestStrategy(props.strategyId);
  }, [ props.strategyId ]);

  if (props.isLoading) return <Loading/>;

  return (
    <StrategyPanel {...props} />
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(StrategyPanelController);

/**
 * Transform a strategy's StepTree into a UiStepTree
 */
function makeUiStepTree(strategy: StrategyDetails, recordClassesByName: Record<string, RecordClass>): UiStepTree {
  const colorIter = colors([
    '#A000A0', // purple
    '#00A0A0', // teal
    '#0000A0', // blue
    '#A00000', // brown
    '#A0A000', // green
  ]);
  
  return recurse(strategy.stepTree);

  function recurse(stepTree: StepTree, color?: string): UiStepTree {
    const step = strategy.steps[stepTree.stepId];
    const recordClass = recordClassesByName[step.recordClassName];
    const primaryInput = stepTree.primaryInput && recurse(stepTree.primaryInput);
    // XXX Should we reset coloring when we traverse a new branch of secondary inputs?
    // only secondary inputs get a color
    const secondaryInput = stepTree.secondaryInput && recurse(stepTree.secondaryInput, colorIter.next().value);
    return {
      step,
      recordClass,
      primaryInput,
      secondaryInput,
      color
    };
  }
}

/**
 * Returns an iterable that cycles through the listed colors infinitely
 */
function* colors(choices: string[]) {
  while(true) yield* choices;
}
