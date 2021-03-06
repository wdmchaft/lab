/*global
  define
*/
/*jslint onevar: true*/
define(function (require) {
  // Dependencies.
  var ModelController   = require("common/controllers/model-controller"),
      Model             = require('md2d/models/modeler'),
      ModelContainer    = require('md2d/views/view'),
      ScriptingAPI      = require('md2d/controllers/scripting-api'),
      Benchmarks        = require('md2d/benchmarks/benchmarks');

  return function (modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig) {
    return new ModelController(modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig,
                                     Model, ModelContainer, ScriptingAPI, Benchmarks);
  };
});
