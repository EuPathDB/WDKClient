import { isEmpty, keyBy, partial } from 'lodash';
import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { requestDeleteStrategy, requestDuplicateStrategy, requestPatchStrategyProperties, requestRemoveStepFromStepTree, requestStrategy, requestUpdateStepProperties } from 'wdk-client/Actions/StrategyActions';
import { nestStrategy, setInsertStepWizardVisibility, unnestStrategy, setReviseFormVisibility, openStrategyPanel, closeStrategyPanel } from 'wdk-client/Actions/StrategyPanelActions';
import { createNewTab } from 'wdk-client/Core/MoveAfterRefactor/Actions/StepAnalysis/StepAnalysisActionCreators';
import { RootState } from 'wdk-client/Core/State/Types';
import { RecordClass, Question } from 'wdk-client/Utils/WdkModel';
import { Step, StepTree, StrategyDetails } from 'wdk-client/Utils/WdkUser';
import StrategyPanel from 'wdk-client/Views/Strategy/StrategyPanel';
import { UiStepTree, AddType } from 'wdk-client/Views/Strategy/Types';
import {removeFromOpenedStrategies} from 'wdk-client/Actions/StrategyWorkspaceActions';
import {transitionToInternalPage} from 'wdk-client/Actions/RouterActions';

interface OwnProps {
  viewId: string;
  isActive: boolean;
  strategy?: StrategyDetails;
  isLoading: boolean;
  strategyId: number;
  stepId?: number;
  showCloseButton?: boolean;
}

interface MappedProps {
  uiStepTree?: UiStepTree;
  insertStepVisibility?: AddType;
  reviseFormStepId?: number;
}

interface MappedDispatch {
  openStrategyPanel: (viewId: string) => void;
  closeStrategyPanel: (viewId: string) => void;
  setReviseFormStepId: (stepId?: number) => void;
  requestStrategy: (id: number) => void;
  onStrategyClose: () => void;
  onStrategyCopy: (signature: string) => void;
  onStrategyDelete: () => void;
  onStrategyRename: (name: string) => void;
  onStrategySave: (name: string, isPublic: boolean, description?: string) => void;
  onShowInsertStep: (addType: AddType) => void;
  onHideInsertStep: () => void;
  onExpandNestedStrategy: (branchStepId: number) => void;
  onCollapseNestedStrategy: (branchStepId: number) => void;
  onRenameStep: (stepId: number, newName: string) => void;
  onRenameNestedStrategy: (branchStepId: number, newName: string) => void;
  onAnalyzeStep: () => void;
  onMakeNestedStrategy: (branchStepId: number) => void;
  onMakeUnnestedStrategy: (branchStepId: number) => void;
  onDeleteStep: (stepTree: StepTree, stepId: number) => void;
}

type Props = OwnProps & MappedProps & MappedDispatch;

function mapStateToProps(state: RootState, ownProps: OwnProps): MappedProps {
  const { strategy } = ownProps;
  const panelState = state.strategyPanel[ownProps.viewId];
  const insertStepVisibility = panelState && panelState.visibleInsertStepWizard;
  const nestedStrategyBranchIds = panelState ? panelState.nestedStrategyBranchIds : [];
  const reviseFormStepId = panelState && panelState.visibleReviseForm;
  // FIXME
  const { recordClasses, questions } = state.globalData;
  const uiStepTree = (
    strategy &&
    recordClasses &&
    questions &&
    makeUiStepTree(strategy, keyBy(recordClasses, 'urlSegment'), keyBy(questions, 'urlSegment'), nestedStrategyBranchIds)
  );
  return { uiStepTree, insertStepVisibility, reviseFormStepId };
}

function mapDispatchToProps(dispatch: Dispatch, props: OwnProps): MappedDispatch {
  return bindActionCreators({
    requestStrategy,
    openStrategyPanel,
    closeStrategyPanel,
    onStrategyClose: () => [
      removeFromOpenedStrategies([props.strategyId]),
      transitionToInternalPage('/workspace/strategies')
    ],
    setReviseFormStepId: (stepId?: number) => setReviseFormVisibility(props.viewId, stepId),
    onStrategyCopy: (sourceStrategySignature: string) => requestDuplicateStrategy({ sourceStrategySignature }),
    onStrategyDelete: () => requestDeleteStrategy(props.strategyId),
    onStrategyRename: (name: string) => requestPatchStrategyProperties(props.strategyId, { name }),
    onStrategySave: (name: string, isPublic: boolean, description?: string) => requestPatchStrategyProperties(props.strategyId, { isPublic, isSaved: true, name, description }),
    onShowInsertStep: (addType: AddType) => setInsertStepWizardVisibility(props.viewId, addType),
    onHideInsertStep: () => setInsertStepWizardVisibility(props.viewId, undefined),
    onExpandNestedStrategy: (branchStepId: number) => requestUpdateStepProperties(props.strategyId, branchStepId, { expanded: true }),
    onCollapseNestedStrategy: (branchStepId: number) => requestUpdateStepProperties(props.strategyId, branchStepId, { expanded: false }),
    onRenameStep: (stepId: number, newName: string) => requestUpdateStepProperties(props.strategyId, stepId, { customName: newName }),
    onRenameNestedStrategy: (branchStepId: number, newName: string) =>
      requestUpdateStepProperties(props.strategyId, branchStepId, {
        expanded: true,
        expandedName: newName
      }),
    // FIXME These details should be better encapsulated
    onAnalyzeStep: () => createNewTab({
      type: 'ANALYSIS_MENU_STATE',
      displayName: 'New Analysis',
      status: 'AWAITING_USER_CHOICE',
      errorMessage: null 
    }),
    onMakeNestedStrategy: (branchStepId: number) => nestStrategy(props.viewId, branchStepId),
    onMakeUnnestedStrategy: (branchStepId: number) => unnestStrategy(props.viewId, branchStepId),
    onDeleteStep: (stepTree: StepTree, stepId: number) => requestRemoveStepFromStepTree(props.strategyId, stepId, stepTree)
  }, dispatch);
}

function StrategyPanelController(props: Props) {
  useEffect(() => {
    props.openStrategyPanel(props.viewId);
    return () => props.closeStrategyPanel(props.viewId);
  }, [props.strategyId]);

  return (
    <StrategyPanel
      {...props}
      onDeleteStep={props.strategy == null ? () => {} : partial(props.onDeleteStep, props.strategy.stepTree)}
    />
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(StrategyPanelController);

/**
 * Transform a strategy's StepTree into a UiStepTree
 */
function makeUiStepTree(
  strategy: StrategyDetails,
  recordClassesByName: Record<string, RecordClass>,
  questionsByName: Record<string, Question>,
  nestedBranchIds: number[]
): UiStepTree {
  const colorIter = colors([
    '#A000A0', // purple
    '#00A0A0', // teal
    '#0000A0', // blue
    '#A00000', // brown
    '#A0A000', // green
  ]);
  
  return _recurse(strategy.stepTree);

  function _recurse(stepTree: StepTree, nestedControlStep?: Step, color?: string, isNested: boolean = false): UiStepTree {
    const step = strategy.steps[stepTree.stepId];
    const recordClass = recordClassesByName[step.recordClassName];
    const question = questionsByName[step.searchName];
    const primaryInput = stepTree.primaryInput && _recurse(stepTree.primaryInput);
    // XXX Should we reset coloring when we traverse a new branch of secondary inputs?
    // only secondary inputs get a color
    const secondaryInput = stepTree.secondaryInput && _recurse(
      stepTree.secondaryInput,
      step,
      colorIter.next().value,
      // should the step be rendered as nested...
      nestedBranchIds.includes(step.id) || !isEmpty(step.expandedName) || stepTree.secondaryInput.primaryInput != null
    );
    return {
      step,
      recordClass,
      question,
      primaryInput,
      secondaryInput,
      nestedControlStep,
      color,
      isNested
    };
  }
}

/**
 * Returns an iterable that cycles through the listed colors infinitely
 */
function* colors(choices: string[]) {
  while(true) yield* choices;
}
