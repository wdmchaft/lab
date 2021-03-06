/*global define: false, $: false */

// For now, only defaultValue, readOnly and immutable
// meta-properties are supported.
define(function(require) {

  var arrays = require('arrays');

  // Create a new object, that prototypically inherits from the Error constructor.
  // It provides a direct information which property of the input caused an error.
  function ValidationError(prop, message) {
      this.prop = prop;
      this.message = message;
  }
  ValidationError.prototype = new Error();
  ValidationError.prototype.constructor = ValidationError;

  function checkConflicts(input, propName, conflictingProps) {
    var i, len;
    for (i = 0, len = conflictingProps.length; i < len; i++) {
      if (input.hasOwnProperty(conflictingProps[i])) {
        throw new ValidationError(propName, "Properties set contains conflicting properties: " +
          conflictingProps[i] + " and " + propName);
      }
    }
  }

  return {

    // Basic validation.
    // Check if provided 'input' hash doesn't try to overwrite properties
    // which are marked as read-only or immutable. Don't take into account
    // 'defaultValue' as the 'input' hash is allowed to be incomplete.
    // It should be used *only* for update of an object.
    // While creating new object, use validateCompleteness() instead!
    validate: function (metadata, input, ignoreImmutable) {
      var result = {},
          prop, propMetadata;

      if (arguments.length < 2) {
        throw new Error("Incorrect usage. Provide metadata and hash which should be validated.");
      }

      for (prop in input) {
        if (input.hasOwnProperty(prop)) {
          // Try to get meta-data for this property.
          propMetadata = metadata[prop];
          // Continue only if the property is listed in meta-data.
          if (propMetadata !== undefined) {
            // Check if this is readOnly property.
            if (propMetadata.readOnly === true) {
              throw new ValidationError(prop, "Properties set tries to overwrite read-only property " + prop);
            }
            if (!ignoreImmutable && propMetadata.immutable === true) {
              throw new ValidationError(prop, "Properties set tries to overwrite immutable property " + prop);
            }
            if (propMetadata.conflictsWith) {
              checkConflicts(input, prop, propMetadata.conflictsWith);
            }
            result[prop] = input[prop];
          }
        }
      }
      return result;
    },

    // Complete validation.
    // Assume that provided 'input' hash is used for creation of new
    // object. Start with checking if all required values are provided,
    // and using default values if they are provided.
    // Later perform basic validation.
    validateCompleteness: function (metadata, input) {
      var result = {},
          prop, propMetadata;

      if (arguments.length < 2) {
        throw new Error("Incorrect usage. Provide metadata and hash which should be validated.");
      }

      for (prop in metadata) {
        if (metadata.hasOwnProperty(prop)) {
          propMetadata = metadata[prop];

          if (input[prop] === undefined || input[prop] === null) {
            // Value is not declared in the input data.
            if (propMetadata.required === true) {
              throw new ValidationError(prop, "Properties set is missing required property " + prop);
            } else if (arrays.isArray(propMetadata.defaultValue)) {
              // Copy an array defined as a default value.
              // Do not use instance defined in metadata.
              result[prop] = arrays.copy(propMetadata.defaultValue, []);
            } else if (typeof propMetadata.defaultValue === "object") {
              // Copy an object defined as a default value.
              // Do not use instance defined in metadata.
              result[prop] = $.extend(true, {}, propMetadata.defaultValue);
            } else if (propMetadata.defaultValue !== undefined) {
              // If it's basic type, just set value.
              result[prop] = propMetadata.defaultValue;
            }
          } else if (!arrays.isArray(input[prop]) && typeof input[prop] === "object" && typeof propMetadata.defaultValue === "object") {
            // Note that typeof [] is also "object" - that is the reason of the isArray() check.
            result[prop] = $.extend(true, {}, propMetadata.defaultValue, input[prop]);
          } else if (arrays.isArray(input[prop])) {
            // Deep copy of an array.
            result[prop] = $.extend(true, [], input[prop]);
          } else {
            // Basic type like number, so '=' is enough.
            result[prop] = input[prop];
          }
        }
      }

      // Perform standard check like for hash meant to update object.
      // However, ignore immutable check, as these properties are supposed
      // to create a new object.
      return this.validate(metadata, result, true);
    },

    // Expose ValidationError. It can be useful for the custom validation routines.
    ValidationError: ValidationError
  };
});
