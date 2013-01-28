/*global
  define
*/
/*jslint onevar: true*/
define(function (require) {
  // Dependencies.
  var ModelController   = require("common/controllers/model-controller"),
      Model             = require('pta/models/modeler'),
      ModelContainer    = require('pta/views/view'),
      ScriptingAPI      = require('pta/controllers/scripting-api'),
      Benchmarks        = require('pta/benchmarks/benchmarks');

  return function (modelViewId, modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig) {
    return new ModelController(modelViewId, modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig,
                                     Model, ModelContainer, ScriptingAPI, Benchmarks);
  }
});
