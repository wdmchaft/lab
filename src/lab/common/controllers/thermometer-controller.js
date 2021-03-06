/*global define $ model */

define(function (require) {

  var Thermometer = require('cs!common/components/thermometer'),
      metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  /**
    An 'interactive thermometer' object, that wraps a base Thermometer with a label for use
    in Interactives.

    Properties are:

     modelLoadedCallback:  Standard interactive component callback, called as soon as the model is loaded.
     getViewContainer:     DOM element containing the Thermometer div and the label div.
     getView:              Returns base Thermometer object, with no label.
  */
  return function ThermometerController(component) {
    var reading = component.reading,
        units,
        offset,
        scale,
        digits,

        labelIsReading,
        labelText,

        $thermometer, $label, $elem,

        thermometerComponent,
        controller,

        updateLabel = function (temperature) {
          temperature = scale * temperature + offset;
          $label.text(temperature.toFixed(digits) + " " + units);
        },

        // Updates thermometer using model property. Used in modelLoadedCallback.
        // Make sure that this function is only called when model is loaded.
        updateThermometer = function () {
          var t = model.get('targetTemperature');
          thermometerComponent.add_value(t);
          if (labelIsReading) updateLabel(t);
        };

    //
    // Initialization.
    //
    component = validator.validateCompleteness(metadata.thermometer, component);
    reading = component.reading;
    units = reading.units;
    offset = reading.offset;
    scale  = reading.scale;
    digits = reading.digits;

    labelIsReading = !!component.labelIsReading;
    labelText = labelIsReading ? "" : "Thermometer";

    $thermometer = $('<div>').attr('id', component.id);
    $label = $('<p class="label">').text(labelText);
    $elem = $('<div class="interactive-thermometer">')
      .append($thermometer)
      .append($label);
    // Each interactive component has to have class "component".
    $elem.addClass("component");

    // Support custom dimensions. Implementation may seem unclear,
    // but the goal is to provide most obvious behavior for authors.
    // We can simply set height of the most outer container.
    // Thermometer will adjusts itself appropriately.
    $elem.css("height", component.height);
    // Width is more tricky.
    if (!/%$/.test(component.width)) {
      // When it's ems or px, its enough to set thermometer width.
      $thermometer.css("width", component.width);
    } else {
      // Whet it's defined in %, set width of the most outer container
      // to that value and thermometer width to 100%.
      $elem.css("width", component.width);
      $thermometer.css("width", "100%");
    }

    thermometerComponent = new Thermometer($thermometer, null, component.min, component.max);

    // Public API.
    controller = {
      // No modelLoadeCallback is defined. In case of need:
      modelLoadedCallback: function () {
        // TODO: update to observe actual system temperature once output properties are observable
        model.addPropertiesListener('targetTemperature', function() {
          updateThermometer();
        });
        thermometerComponent.resize();
        updateThermometer();
      },

      // Returns view container.
      getViewContainer: function () {
        return $elem;
      },

      getView: function () {
        return thermometerComponent;
      },

      resize: function () {
        $thermometer.height($elem.height() - $label.height());
      },

      // Returns serialized component definition.
      serialize: function () {
        // Return the initial component definition.
        // Displayed value is always defined by the model,
        // so it shouldn't be serialized.
        return component;
      }
    };
    // Return Public API object.
    return controller;
  };
});
