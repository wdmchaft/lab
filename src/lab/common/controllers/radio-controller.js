/*global define $ model */

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  return function RadioController(component, scriptingAPI, interactivesController) {
        // Public API.
    var controller,
        // DOM elements.
        $div, $option, $span,
        // Options definitions from component JSON definition.
        options,
        // List of jQuery objects wrapping <input type="radio"> elements.
        $options = [];

    // Updates radio using model property. Used in modelLoadedCallback.
    // Make sure that this function is only called when:
    // a) model is loaded,
    // b) radio is bound to some property.
    function updateRadio() {
      var value = model.get(component.property),
          i, len;

      for (i = 0, len = options.length; i < len; i++) {
        if (options[i].value === value) {
          $options[i].attr("checked", true);
        } else {
          $options[i].removeAttr("checked");
        }
      }
    }

    function initialize() {
      var i, len, option;

      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.radio, component);
      // Validate radio options too.
      options = component.options;
      for (i = 0, len = options.length; i < len; i++) {
        options[i] = validator.validateCompleteness(metadata.radioOption, options[i]);
      }

      // Create HTML elements.
      $div = $('<div>').attr('id', component.id);
      $div.addClass("interactive-radio");
      // Each interactive component has to have class "component".
      $div.addClass("component");
      // Add class defining component orientation - "horizontal" or "vertical".
      $div.addClass(component.orientation);

      // Create options (<input type="radio">)
      for (i = 0, len = options.length; i < len; i++) {
        option = options[i];
        $option = $('<input>')
          .attr('type', "radio")
          .attr('name', component.id);
        $options.push($option);

        if (option.disabled) {
          $option.attr("disabled", option.disabled);
        }
        if (option.selected) {
          $option.attr("checked", option.selected);
        }
        $span = $('<span>')
          .append($option)
          .append(option.text);
        $div.append($span);

        $option.change((function(option) {
          return function() {
            if (option.action){
              scriptingAPI.makeFunctionInScriptContext(option.action)();
            } else if (option.loadModel){
              model.stop();
              interactivesController.loadModel(option.loadModel);
            } else if (option.value !== undefined) {
              model.set(component.property, option.value);
            }
          };
        })(option));
      }
    }

    // Public API.
    controller = {
      modelLoadedCallback: function () {
        // Connect radio with model's property if its name is defined.
        if (component.property !== undefined) {
          // Register listener for property.
          model.addPropertiesListener([component.property], updateRadio);
          // Perform initial radio setup.
          updateRadio();
        }
      },

      // Returns view container.
      getViewContainer: function () {
        return $div;
      },

      // Returns serialized component definition.
      serialize: function () {
        var i, len;
        if (component.property === undefined) {
          // When property binding is not defined, we need to keep track
          // which option is currently selected.
          for (i = 0, len = options.length; i < len; i++) {
            if ($options[i].attr("checked")) {
              options[i].selected = true;
            } else {
              delete options[i].selected;
            }
          }
        }
        // Note that 'options' array above is a reference to component.options array.
        // Every thing is updated, return a copy.
        return $.extend(true, {}, component);
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});
