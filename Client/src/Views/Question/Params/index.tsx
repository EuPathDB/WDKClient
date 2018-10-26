import * as React from 'react';

import { Parameter } from 'wdk-client/Utils/WdkModel';

import { Context, isPropsType, ParamModule, Props } from 'wdk-client/Views/Question/Params/Utils';

import CheckboxEnumParamModule from 'wdk-client/Views/Question/Params/CheckboxEnumParam';
import DatasetParamModule from 'wdk-client/Views/Question/Params/DatasetParam';
import DateParamModule from 'wdk-client/Views/Question/Params/DateParam';
import DateRangeParamModule from 'wdk-client/Views/Question/Params/DateRangeParam';
import FilterParamNewModule from 'wdk-client/Views/Question/Params/FilterParamNew';
import NumberParamModule from 'wdk-client/Views/Question/Params/NumberParam';
import NumberRangeParamModule from 'wdk-client/Views/Question/Params/NumberRangeParam';
import SelectEnumParamModule from 'wdk-client/Views/Question/Params/SelectEnumParam';
import StringParamModule from 'wdk-client/Views/Question/Params/StringParam';
import TreeBoxEnumParamModule from 'wdk-client/Views/Question/Params/TreeBoxEnumParam';
import TypeAheadEnumParamModule from 'wdk-client/Views/Question/Params/TypeAheadEnumParam';
import { combineEpics } from 'redux-observable';

// Param modules
// -------------
const paramModules: ParamModule[] = [
  CheckboxEnumParamModule as ParamModule,
  DatasetParamModule as ParamModule,
  DateParamModule as ParamModule,
  DateRangeParamModule as ParamModule,
  FilterParamNewModule as ParamModule,
  NumberParamModule as ParamModule,
  NumberRangeParamModule as ParamModule,
  SelectEnumParamModule as ParamModule,
  StringParamModule as ParamModule,
  TreeBoxEnumParamModule as ParamModule,
  TypeAheadEnumParamModule as ParamModule,
];

// API used by Question{ActionCreators,Controller,Store}
// -----------------------------------------------------

/**
 * Parameter renderer.
 */
export function ParamComponent<T extends Parameter>(props: Props<T, any>) {
  for (let paramModule of paramModules) {
    if (isPropsType(props, paramModule.isType)) {
      return <paramModule.Component {...props} />
    }
  }
  return (
    <div>
      <em style={{color: 'red'}}>Unknown parameter type {props.parameter.type} </em>
      <input type="text" value={props.value} readOnly />
    </div>
  );
}

/**
 * Parameter state-action reducer.
 */
export function reduce<T extends Parameter>(parameter: T, state: any, action: any): any {
  for (let paramModule of paramModules) {
    if (paramModule.isType(parameter) && paramModule.reduce) {
      return paramModule.reduce(state, action);
    }
  }
  return state;
}

export const observeParam =
  combineEpics(...(paramModules.map(m => m.observeParam)));

export const getValueFromState: ParamModule['getValueFromState'] = (context, state, services) => {
  for (let paramModule of paramModules) {
    if (paramModule.isType(context.parameter)) {
      return paramModule.getValueFromState(context, state, services);
    }
  }
  return state.paramValues[context.parameter.name];
}



export function isParamValueValid(context: Context<Parameter>, state: any) {
  for (let paramModule of paramModules) {
    if (paramModule.isType(context.parameter)) {
      return paramModule.isParamValueValid(context, state);
    }
  }
  return true;
}
