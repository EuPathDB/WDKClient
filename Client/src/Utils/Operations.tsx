import React, { ReactNode, useContext, useMemo, useCallback } from 'react';

import { pick, toUpper } from 'lodash/fp';

import { Step, StrategyDetails } from 'wdk-client/Utils/WdkUser';
import { AddStepOperationMenuProps, AddStepOperationFormProps } from 'wdk-client/Views/Strategy/AddStepPanel';
import { CombineStepMenu } from 'wdk-client/Views/Strategy/CombineStepMenu';
import { ConvertStepMenu } from 'wdk-client/Views/Strategy/ConvertStepMenu';
import { CombineStepForm } from 'wdk-client/Views/Strategy/CombineStepForm';
import { CombineWithStrategyForm } from 'wdk-client/Views/Strategy/CombineWithStrategyForm';
import { ConvertStepForm } from 'wdk-client/Views/Strategy/ConvertStepForm';

import { cxStepBoxes as cxOperator } from 'wdk-client/Views/Strategy/ClassNames';
import { Question, RecordClass } from 'wdk-client/Utils/WdkModel';
import { ReviseOperatorMenuItem } from 'wdk-client/Views/Strategy/CombineStepDetails';
import { requestUpdateStepSearchConfig, requestReplaceStep } from 'wdk-client/Actions/StrategyActions';

type OperatorMenuItem = {
  radioDisplay: ReactNode,
  dropdownDisplay: string,
  value: string
}

type OperatorMenuGroup = {
  name: string,
  display: string,
  items: OperatorMenuItem[]
}

export type ReviseOperationFormProps = {
  searchName: string,
  step: Step,
  strategy: StrategyDetails,
  primaryInputRecordClass: RecordClass,
  primaryInputQuestion: Question,
  secondaryInputRecordClass: RecordClass
  secondaryInputQuestion: Question,
  questions: Question[],
  onClose: () => void,
  requestUpdateStepSearchConfig: typeof requestUpdateStepSearchConfig,
  requestReplaceStep: typeof requestReplaceStep
};

export type ReviseOperationParameterConfiguration = 
  | { type: 'form', FormComponent: React.ComponentType<ReviseOperationFormProps> }
  | { type: 'inline' };

export type BinaryOperation = {
  name: string,
  AddStepMenuComponent: React.ComponentType<AddStepOperationMenuProps>,
  addStepFormComponents: Record<string, React.ComponentType<AddStepOperationFormProps>>,
  isOperationSearchName: (searchName: string) => boolean,
  baseClassName: string,
  operatorParamName: string,
  reviseOperatorParamConfiguration: ReviseOperationParameterConfiguration,
  operatorMenuGroup: OperatorMenuGroup
};

export const defaultBinaryOperations: BinaryOperation[] = [
  {
    name: 'combine',
    AddStepMenuComponent: CombineStepMenu,
    addStepFormComponents: {
      'combine-with-new-search': CombineStepForm,
      'combine-with-strategy': CombineWithStrategyForm
    },
    isOperationSearchName: searchName => searchName.startsWith('boolean_question'),
    baseClassName: 'CombineOperator',
    operatorParamName: 'bq_operator',
    reviseOperatorParamConfiguration: { type: 'inline' },
    operatorMenuGroup: {
      name: 'standard_boolean_operators',
      display: 'Revise as a boolean operation',
      items: [
        { 
          radioDisplay: <React.Fragment>A <strong>INTERSECT</strong> B</React.Fragment>,
          dropdownDisplay: 'intersected with',
          value: 'INTERSECT'
        },
        { 
          radioDisplay: <React.Fragment>A <strong>UNION</strong> B</React.Fragment>,
          dropdownDisplay: 'intersected with',
          value: 'UNION'
        },
        { 
          radioDisplay: <React.Fragment>A <strong>MINUS</strong> B</React.Fragment>,
          dropdownDisplay: 'intersected with',
          value: 'MINUS'
        },
        { 
          radioDisplay: <React.Fragment>B <strong>MINUS</strong> A</React.Fragment>,
          dropdownDisplay: 'intersected with',
          value: 'RMINUS'
        }
      ]
    }
  }
];

export const BinaryOperationsContext = React.createContext<BinaryOperation[]>(defaultBinaryOperations);

export const useBinaryOperations = () => useContext(BinaryOperationsContext);

type AddStepMenuConfig = Pick<BinaryOperation, 'name' | 'AddStepMenuComponent' | 'addStepFormComponents'>;

export type OperatorMetadata = {
  operatorName: string,
  searchName: string,
  baseClassName: string,
  paramName: string,
  paramValue: string,
  reviseOperatorParamConfiguration: ReviseOperationParameterConfiguration
};

export const useCompatibleOperatorMetadata = (questions: Question[] | undefined, outputRecordClass: string | undefined, primaryInputRecordClass: string | undefined, secondaryInputRecordClass: string | undefined): Record<string, OperatorMetadata> | undefined => {
  const binaryOperations = useBinaryOperations();

  const compatibleOperatorMetadata = useMemo(
    () => {
      if (!questions) {
        return undefined;
      }

      const compatibleOperatorMetadata = binaryOperations.reduce(
        (memo, { name, isOperationSearchName, operatorParamName, baseClassName, operatorMenuGroup, reviseOperatorParamConfiguration }) => {
          const operationQuestion = questions.find(
            question => 
              isOperationSearchName(question.urlSegment) &&
              (
                (
                  !!primaryInputRecordClass &&
                  !!secondaryInputRecordClass &&
                  !!question.allowedPrimaryInputRecordClassNames && 
                  !!question.allowedSecondaryInputRecordClassNames &&
                  question.outputRecordClassName === outputRecordClass &&
                  question.allowedPrimaryInputRecordClassNames.includes(primaryInputRecordClass) &&
                  question.allowedSecondaryInputRecordClassNames.includes(secondaryInputRecordClass)
                ) ||
                ( // Needed to handle the special case of "ignore" combine operators - maybe these operators could get their own questions?
                  name === 'combine' &&
                  question.outputRecordClassName === outputRecordClass
                )
              )
          );

          // Also needed to handle the special case of "ignore" combine operators
          const parameterValues = name === 'combine' && primaryInputRecordClass === secondaryInputRecordClass
            ? [
                ...operatorMenuGroup.items.map(({ value }) => value),
                'LONLY',
                'RONLY'
              ]
            : name === 'combine' && primaryInputRecordClass !== secondaryInputRecordClass
            ? [ 
                'LONLY',
                'RONLY'
              ]
            : operatorMenuGroup.items.map(({ value }) => value);
  
          const newMetadataEntries = operationQuestion && parameterValues.reduce(
            (memo, itemValue) => ({
              ...memo,
              [itemValue]: {
                operatorName: name,
                searchName: operationQuestion.urlSegment,
                paramName: operatorParamName,
                baseClassName,
                paramValue: itemValue,
                reviseOperatorParamConfiguration
              }
            }),
            {} as Record<string, OperatorMetadata>
          );

          return {
            ...memo,
            ...newMetadataEntries
          };
        },
        {} as Record<string, OperatorMetadata>
      );
      
      return compatibleOperatorMetadata;
    },
    [ binaryOperations, outputRecordClass, primaryInputRecordClass, secondaryInputRecordClass, questions ]
  );

  return compatibleOperatorMetadata;
};

export type ReviseOperatorMenuGroup = {
  name: string,
  display: string,
  items: ReviseOperatorMenuItem[]
}

const ignoreOperatorsPrimaryInputDifferentType: ReviseOperatorMenuItem[] = [
  { display: <React.Fragment><strong>IGNORE</strong> A</React.Fragment>, value: 'RONLY', iconClassName: cxOperator('--CombineOperator', 'RONLY') }
];

const ignoreOperatorsSecondaryInputDifferentType: ReviseOperatorMenuItem[] = [
  { display: <React.Fragment><strong>IGNORE</strong> B</React.Fragment>, value: 'LONLY', iconClassName: cxOperator('--CombineOperator', 'LONLY') }
];

const ignoreOperatorsInputsSameType: ReviseOperatorMenuItem[] = [
  { display: <React.Fragment><strong>IGNORE</strong> B</React.Fragment>, value: 'LONLY', iconClassName: cxOperator('--CombineOperator', 'LONLY') },
  { display: <React.Fragment><strong>IGNORE</strong> A</React.Fragment>, value: 'RONLY', iconClassName: cxOperator('--CombineOperator', 'RONLY') }
];

export const useReviseOperatorConfigs = (questions: Question[] | undefined, outputRecordClass: string | undefined, primaryInputRecordClass: string | undefined, secondaryInputRecordClass: string | undefined) => {
  const binaryOperations = useBinaryOperations();
  const operatorMetadata = useCompatibleOperatorMetadata(questions, outputRecordClass, primaryInputRecordClass, secondaryInputRecordClass);

  const reviseOperatorConfigsWithoutIgnore = useMemo(
    () => operatorMetadata && binaryOperations.reduce(
      (memo, { baseClassName, operatorMenuGroup }) => {
        return operatorMenuGroup.items.some(menuItem => !operatorMetadata[menuItem.value])
          ? memo
          : [
              ...memo,
              {
                name: operatorMenuGroup.name,
                display: operatorMenuGroup.display,
                items: operatorMenuGroup.items.map(
                  (menuItem) => ({
                    display: menuItem.radioDisplay,
                    iconClassName: cxOperator(`--${baseClassName}`, toUpper(menuItem.value)),
                    value: menuItem.value
                  })
                )
              }
          ]
      }, 
      [] as ReviseOperatorMenuGroup[]
    ),
    [ binaryOperations, operatorMetadata ]
  );

  const reviseOperatorConfigs = useMemo(
    () => reviseOperatorConfigsWithoutIgnore && primaryInputRecordClass !== undefined && secondaryInputRecordClass !== undefined && [
      ...reviseOperatorConfigsWithoutIgnore,
      {
        name: 'ignore_boolean_operators',
        display: 'Ignore one of the inputs',
        items: primaryInputRecordClass !== outputRecordClass
          ? ignoreOperatorsPrimaryInputDifferentType
          : secondaryInputRecordClass !== outputRecordClass
          ? ignoreOperatorsSecondaryInputDifferentType
          : ignoreOperatorsInputsSameType
      }
    ],
    [ 
      reviseOperatorConfigsWithoutIgnore, 
      primaryInputRecordClass, 
      secondaryInputRecordClass, 
      ignoreOperatorsPrimaryInputDifferentType,
      ignoreOperatorsSecondaryInputDifferentType,
      ignoreOperatorsInputsSameType
    ]
  );
  
  return reviseOperatorConfigs;
};

const toAddStepMenuConfig = pick<BinaryOperation, keyof AddStepMenuConfig>(['name', 'AddStepMenuComponent', 'addStepFormComponents']);

const convertConfig = {
  name: 'convert',
  AddStepMenuComponent: ConvertStepMenu,
  addStepFormComponents: {
    'convert': ConvertStepForm
  }
};

export const useAddStepMenuConfigs = (): AddStepMenuConfig[] => {
  const binaryOperations = useBinaryOperations();
  const menuConfigs = useMemo(
    () => [
      ...binaryOperations.filter(({ name }) => name === 'combine').map(toAddStepMenuConfig),
      convertConfig,
      ...binaryOperations.filter(({ name }) => name !== 'combine').map(toAddStepMenuConfig)
    ],
    [ binaryOperations ]
  );

  return menuConfigs;
};

export const useSelectedAddStepFormComponent = (formName: string | undefined): React.ComponentType<AddStepOperationFormProps> => {
  const menuConfigs = useAddStepMenuConfigs();
  const operationFormsByName = useMemo(
    () => menuConfigs.reduce(
      (memo, { addStepFormComponents }) => ({ ...memo, ...addStepFormComponents }), 
      {} as Record<string, React.ComponentType<AddStepOperationFormProps>>
    ),
    [ menuConfigs ]
  );

  const DefaultFormComponent = useCallback(
    () => null, 
    []
  );

  return (formName && operationFormsByName[formName]) || DefaultFormComponent;
};

export const useBinaryStepBoxClassName = (step: Step) => {
  const binaryOperations = useBinaryOperations();
  
  const binaryOperation = useMemo(
    () => binaryOperations.find(({ isOperationSearchName }) => isOperationSearchName(step.searchName)),
    [ binaryOperations, step ]
  );
  
  if (!binaryOperation) {
    return undefined;
  }

  const { baseClassName, operatorParamName } = binaryOperation;

  const classNameModifier = toUpper(step.searchConfig.parameters[operatorParamName])

  return classNameModifier
    ? cxOperator(`--${baseClassName}`, classNameModifier)
    : cxOperator(`--${baseClassName}`);
};