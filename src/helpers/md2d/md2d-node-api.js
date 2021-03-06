var requirejs = require('requirejs'),
    path      = require('path');

// Set up any vendored libraries that are normally included via script tag in the modules under test.
// Note that d3 handles all necessary dependencies like 'jsdom'.
d3 = require('d3');
require(path.normalize(__dirname + "/../../vendor/jquery/dist/jquery.min.js"));
$  = window.jQuery;

// Use Lab RequireJS configuration.
requirejs.config({
  // Set baseUrl to lab/src/lab using relative path of this file.
  baseUrl: path.normalize(__dirname + '/../../lab'),
  nodeRequire: require,
  paths: {
    'cs' :'../vendor/require-cs/cs'
  }
});

requirejs([
  'md2d/models/modeler',
  'common/validator',
  'md2d/models/metadata',
  'cs!md2d/models/solvent'
], function (Modeler, validator, metadata, Solvent) {
  // Export API for Node.js scripts.
  exports.Modeler   = Modeler;
  // Used by MML -> JSON conversion script.
  exports.validator = validator;
  exports.metadata  = metadata;
  exports.Solvent   = Solvent;
});
