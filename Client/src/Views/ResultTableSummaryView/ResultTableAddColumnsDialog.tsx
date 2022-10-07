import React from 'react';
import { CategoryTreeNode, getId } from 'wdk-client/Utils/CategoryUtils';
import { pure } from 'wdk-client/Utils/ComponentUtils';
import Dialog from 'wdk-client/Components/Overlays/Dialog';
import CategoriesCheckboxTree from 'wdk-client/Components/CheckboxTree/CategoriesCheckboxTree';
import { Answer, Question } from 'wdk-client/Utils/WdkModel';
import { flatMap, concat } from 'wdk-client/Utils/IterableUtils';
import {
  ShowHideAddColumnsDialog,
  UpdateColumnsDialogSelection,
  UpdateColumnsDialogSearchString,
  UpdateColumnsDialogExpandedNodes,
  RequestColumnsChoiceUpdate
} from 'wdk-client/Views/ResultTableSummaryView/Types';
import { LinksPosition, CheckboxTreeStyleSpec } from '@veupathdb/coreui/dist/components/inputs/checkboxes/CheckboxTree/CheckboxTree';

const styleOverrides: CheckboxTreeStyleSpec = {
  treeLinks: {
    container: {
      textAlign: 'center',
      height: 'auto',
      margin: '0 1em',
    }
  },
  searchBox: {
    container: {
      margin: '0 1em',
    },
    input: {
      padding: '0.2em 0.5em 0.2em 2em',
    },
    optionalIcon: {
      top: '2px'
    }
  },
  treeSection: {
    ul: {
      padding: 0,
    }
  },
}

export interface Props {
  answer: Answer;
  viewId: string;
  question: Question;
  columnsDialogIsOpen: boolean;
  columnsDialogSelection?: string[];
  columnsDialogExpandedNodes?: string[];
  columnsDialogSearchString?: string;
  columnsTree: CategoryTreeNode;
  showHideAddColumnsDialog: ShowHideAddColumnsDialog;
  updateColumnsDialogSelection: UpdateColumnsDialogSelection;
  updateColumnsDialogSearchString: UpdateColumnsDialogSearchString;
  updateColumnsDialogExpandedNodes: UpdateColumnsDialogExpandedNodes;
  requestColumnsChoiceUpdate: RequestColumnsChoiceUpdate;
}

function ResultTableAddColumnsDialog({
  answer,
  question,
  columnsDialogExpandedNodes,
  columnsDialogIsOpen,
  columnsDialogSelection,
  columnsDialogSearchString = '',
  columnsTree,
  showHideAddColumnsDialog,
  updateColumnsDialogSelection,
  updateColumnsDialogSearchString,
  updateColumnsDialogExpandedNodes,
  requestColumnsChoiceUpdate,
}: Props) {
  if (!columnsDialogIsOpen) return null;

  const isActiveSearch = !!columnsDialogSearchString.length
  const conditionalStyleOverrides: CheckboxTreeStyleSpec = {
    ...styleOverrides,
    treeNode: {
      topLevelNode: {
        height: '1.5em',
        alignItems: 'center',
        overflow: 'hidden',
      },
      leafNodeLabel: {
        marginLeft: isActiveSearch ? 0 : '2em',
        padding: isActiveSearch ? 0 : '0.125em 0',
      },
      checkboxLabel: {
        margin: isActiveSearch ? '0.125em 0 0.125em 0.25em' : 'auto 0 auto 0.25em',
      },
    },
    treeSection: {
      ...styleOverrides.treeSection,
      container: {
        margin: isActiveSearch ? '0.5em 0 1em 1em' : '0.5em 0 1em 0.25em',
      }
    }
  }

  const button = (
    <div style={{ textAlign: 'center' }}>
      <button
        type="button"
        className="btn"
        onClick={() => {
          if (columnsDialogSelection) {
            requestColumnsChoiceUpdate(columnsDialogSelection, question.urlSegment)
          }
          showHideAddColumnsDialog(false);
        }}
      >
        Update Columns
      </button>
    </div>
  );

  return (
    <Dialog
      open
      modal
      draggable
      resizable
      title="Select Columns"
      className="AddColumnsDialog"
      onClose={() => {
        showHideAddColumnsDialog(false);
        if (answer && columnsTree) {
          updateColumnsDialogSelection(answer.meta.attributes);
          updateColumnsDialogExpandedNodes(getExpandedBranches(answer, columnsTree));
        }
      }}
    >
      <>
        {button}
        <CategoriesCheckboxTree
          tree={columnsTree}
          searchBoxPlaceholder="Search Columns"
          leafType="column"
          selectedLeaves={columnsDialogSelection || answer.meta.attributes}
          currentSelection={answer.meta.attributes}
          defaultSelection={question.defaultAttributes}
          expandedBranches={getExpandedBranches(answer, columnsTree, columnsDialogExpandedNodes)}
          searchTerm={columnsDialogSearchString}
          onChange={updateColumnsDialogSelection}
          onUiChange={updateColumnsDialogExpandedNodes}
          onSearchTermChange={updateColumnsDialogSearchString}
          linksPosition={LinksPosition.Top}
          styleOverrides={conditionalStyleOverrides}
        />
      </>
    </Dialog>
  );
}

export default pure(ResultTableAddColumnsDialog);

function getExpandedBranches(
  answer: Answer,
  columnsTree: CategoryTreeNode,
  expandedBranches?: string[]
) {
  return expandedBranches != null
    ? expandedBranches
    : Array.from(findAncestors(new Set(answer.meta.attributes), columnsTree));
}

function findAncestors(
  leaves: Set<string>,
  root: CategoryTreeNode,
  ancestors: Iterable<string> = []
): Iterable<string> {
  const id = getId(root);
  return leaves.has(id)
    ? []
    : root.children.some(child => leaves.has(getId(child)))
    ? [ id ]
    : concat(
        flatMap(child => findAncestors(leaves, child, ancestors), root.children),
        ancestors
      );
}
