/*global sinon $*/
var fs = require('fs');

/**
  Sets up a simulated browser environment using jsdom, layout.html, jQuery, and d3.
*/
exports.setupBrowserEnvironment = function() {
  require('../env');
  global.alert = function() {};
};

/**
  Performs "continuation" (presumably some kind of operation that causes interactives controller
  to load a model) with a stubbed XHR, then unstubs XHR and calls the XHR completion callback with
  the passed-in model.
*/
exports.withModel = function(model, continuation) {
  var doneCallback, stub;

  stub = sinon.stub($, 'get').returns({
    done: function(callback) { doneCallback = callback; }
  });

  continuation();
  stub.restore();
  doneCallback(model);
};

/**
  Returns JSON model specification for a model file located in test/fixtures/models and named
  either *.json or *.mml
*/
exports.getModel = function(filename) {
  if (endsWith(filename, '.json')) {
    return JSON.parse(getModelJSONFromFile(filename));
  } else if (endsWith(filename, '.mml')) {
    return getModelJSONFromMMLFile(filename);
  } else {
    throw new Error("getModel helper: was asked to load \"" + filename + "\" but need a filename ending in .json or .mml");
  }
};

/**
  Returns a freshly imported 'requirejs' and configures it using the labConfig defined in test/

  Use this in any test which modifies the requirejs config (for example to mock dependencies
  by defining a substitute module and mapping it to the real module name by manipulating requirejs'
  'map' config)
*/
exports.getRequireJS = function() {
  // Forces reloading of the cached requirejs module
  delete require.cache[require.resolve('requirejs')];

  var config    = require('../requirejs-config'),
      requirejs = require('requirejs');

  requirejs.config(config.labConfig);
  return requirejs;
};

/**
  Passes a freshly created 'requirejs' to 'continuation' which may modify its requirejs config
  freely. Subsequently sets the global 'requirejs' to a fresh instance of requirejs unaffected
  by the changed config. (Note that it appears that you cannot reuse the original requirejs import.)
*/
exports.withIsolatedRequireJS = function(continuation) {
  continuation(exports.getRequireJS());
  // It turns out that, having deleted the old requirejs module from Node's require cache, we can't
  // keep using the reference to it which we still have (tests break when I try to do so). However,
  // a freshly created 'requirejs' global works fine.
  global.requirejs = exports.getRequireJS();
};

/**
  Passes a freshly created 'requirejs' to 'continuation' which may modify its requirejs config
  freely. This functions also mocks a lot of view-related dependencies. Some of them are
  problematic because JSDOM doesn't support SVG 1.1 spec (graphs, MD2D Renderer).
  Also SemanticLayout is mocked, because it modifies a lot of DOM elements using jQuery what is really
  slow in node.js + JSDOM environment (at the same time, it isn't necessary for the most of unit tests).

  Subsequently sets the global 'requirejs' to a fresh instance of requirejs unaffected
  by the changed config. (Note that it appears that you cannot reuse the original requirejs import.)
*/
exports.withIsolatedRequireJSAndViewsMocked = function(continuation) {
  var requirejs = exports.getRequireJS(),
      BarGraphView = function() {
        return {
          initialize: function() {},
          render: function() {},
          updateBar: function() {},
          getParentHeight: function() {},
          getParentWidth: function() {},
          modelChanged: function() {}
        };
      },
      RealTimeGraph = function() {
        return {
          new_data: function() {},
          add_points: function() {},
          updateOrRescale: function() {},
          showMarker: function() {},
          reset: function() {},
          resize: function() {},
          getXDomain: function() {
            return [0, 10];
          },
          getYDomain: function() {
            return [0, 10];
          }
        };
      },
      Renderer = function() {
        return {
          update: function() {},
          repaint: function() {},
          reset: function() {},
          model2px: function() {},
          model2pxInv: function() {}
        };
      },
      SemanticLayout = function() {
        return {
          setupInteractive: function() {},
          layoutInteractive: function() {}
        };
      };
  // Mock dependencies.
  requirejs.define('grapher/core/real-time-graph', [], function() { return RealTimeGraph; });
  requirejs.define('grapher/bar-graph/bar-graph-view', [], function() { return BarGraphView; });
  requirejs.define('md2d/views/renderer', [], function() { return Renderer; });
  requirejs.define('common/layout/semantic-layout', [], function() { return SemanticLayout; });
  // Execute 'continuation' with prepared requirejs instance.
  continuation(requirejs);
  // It turns out that, having deleted the old requirejs module from Node's require cache, we can't
  // keep using the reference to it which we still have (tests break when I try to do so). However,
  // a freshly created 'requirejs' global works fine.
  global.requirejs = exports.getRequireJS();
};

// helpers helpers
function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function getModelJSONFromMMLFile(mmlFileName) {
  require('coffee-script');

  var parseMML    = require('../../src/helpers/md2d/mml-parser').parseMML,
      mmlPath     = 'test/fixtures/models/' + mmlFileName,
      mmlContents = fs.readFileSync(mmlPath).toString(),
      results     = parseMML(mmlContents);

  return results.json;
}

function getModelJSONFromFile(modelFileName) {
  var modelPath = 'test/fixtures/models/' + modelFileName;

  return fs.readFileSync(modelPath).toString();
}
