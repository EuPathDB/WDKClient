/* global __DEV__ */
import { createBrowserHistory } from 'history';
import stringify from 'json-stable-stringify';
import { identity, isString, memoize } from 'lodash';
import { createElement } from 'react';
import * as ReactDOM from 'react-dom';
import * as Components from '../Components';
import { ClientPluginRegistryEntry, mergePluginsByType } from '../Utils/ClientPlugin'; // eslint-disable-line no-unused-vars
import { createMockHistory } from '../Utils/MockHistory';
import { getTransitioner } from '../Utils/PageTransitioner';
import WdkService from '../Utils/WdkService';
import { updateLocation } from './ActionCreators/RouterActionCreators';
import { loadAllStaticData } from './ActionCreators/StaticDataActionCreators';
import * as Controllers from './Controllers';
import Root from './Root';
import wdkRoutes from './routes';

import storeModules from './State/StoreModules';
import { createWdkStore } from './Store';


/**
 * Initialize the application.
 *
 * @param {object} options
 * @param {string} options.rootUrl Root URL used by the router. If the current
 *   page's url does not begin with this option's value, the application will
 *   not render automatically.
 * @param {string|HTMLElement} options.rootElement Where to mount the
 *   application. Can be a selector string or an element. If this option does
 *   not resolve to an element after the DOMContentLoaded event is fired, the
 *   application will not render automatically.
 * @param {string} options.endpoint Base URL for WdkService.
 * @param {Function} [options.wrapRoutes] A function that takes a WDK Routes array
 *   and returns a modified copy.
 * @param {Function} [options.wrapStoreModules] A function that takes WDK StoreModules
 *   and returns a modified copy.
 * @param {Function} [options.wrapWdkService] A functino that takes WdkService
 *   class and returns a sub class.
 * @param {Function} [options.onLocationChange] Callback function called whenever
 *   the location of the page changes. The function is called with a Location
 *   object.
 * @param {ClientPluginRegistryEntry[]} [options.pluginConfig]
 */
export function initialize(options) {
  let {
    rootUrl,
    rootElement,
    endpoint,
    wrapRoutes = identity,
    wrapStoreModules = identity,
    wrapWdkService = identity,
    onLocationChange,
    pluginConfig = []
  } = options;

  if (!isString(rootUrl)) throw new Error(`Expected rootUrl to be a string, but got ${typeof rootUrl}.`);
  if (!isString(endpoint)) throw new Error(`Expected endpoint to be a string, but got ${typeof endpoint}.`);

  let canUseRouter = location.pathname.startsWith(rootUrl);
  // define the elements of the Flux architecture

  let history = canUseRouter
    ? createBrowserHistory({ basename: rootUrl })
    : createMockHistory({ basename: rootUrl });
  let wdkService = wrapWdkService(WdkService).getInstance(endpoint);
  let transitioner = getTransitioner(history);
  let locatePlugin = makeLocatePlugin(pluginConfig);
  let store = createWdkStore(wrapStoreModules(storeModules), locatePlugin, wdkService, transitioner);

  // load static WDK data into service cache and view stores that need it
  store.dispatch(loadAllStaticData());

  if (canUseRouter) {
    // render the root element once page has completely loaded
    document.addEventListener('DOMContentLoaded', function() {
      let container = rootElement instanceof HTMLElement
        ? rootElement
        : document.querySelector(rootElement);
      let handleLocationChange = location => {
        if (onLocationChange) onLocationChange(location);
        store.dispatch(updateLocation(location));
      };
      if (container != null) {
        let applicationElement = createElement(
          Root, {
            rootUrl,
            store,
            history,
            routes: wrapRoutes(wdkRoutes),
            onLocationChange: handleLocationChange,
            locatePlugin
          });
        ReactDOM.render(applicationElement, container);
      }
      else if (__DEV__) {
        console.debug('Could not resolve rootElement %o. Application will not render automatically.', rootElement);
      }
    });
  }
  else if (__DEV__) {
    console.debug('The current page url does not start with the rootUrl %o. Application router will not be rendered.', rootUrl);
  }

  // return WDK application components
  return { wdkService, store, history, locatePlugin };
}

/**
 * 
 * @param {ClientPluginRegistryEntry[]} pluginConfig
 */
function makeLocatePlugin(pluginConfig) {
  return memoize(locatePlugin, stringify);

  /**
   * 
   * @param {string} type 
   */
  function locatePlugin(type) {
    return mergePluginsByType(pluginConfig, type);
  }
}

/**
 * Apply Component wrappers to WDK components and controllers. Keys of
 * 'componentWrappers' should correspond to Component or Controller names in
 * WDK. Values of `componentWrappers` are factories that return a new component.
 *
 * Note that this function applies wrappers "globally", meaning that all apps
 * returned by initialize will use the wrapped components, regardless of when
 * initialize and wrapComponents are called.
 *
 * @param {Object} componentWrappers
 */
export function wrapComponents(componentWrappers) {
  for (let key in componentWrappers) {
    // look in Components for class by this name
    let Component = Components[key];
    // if not found, look in Controllers
    if (Component == null) {
      Component = Controllers[key];
    }
    // if still not found, warn and skip
    if (Component == null) {
      console.warn("Cannot wrap unknown WDK Component '" + key + "'.  Skipping...");
      continue;
    }
    // if found component/controller is not wrappable, log error and skip
    if (!("wrapComponent" in Component)) {
      console.error("Warning: WDK Component `%s` is not wrappable.  WDK version will be used.", key);
      continue;
    }
    // wrap found component/controller
    Component.wrapComponent(componentWrappers[key]);
  }
}
