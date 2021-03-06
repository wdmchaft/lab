/*global define, d3 */

define(function (require) {
  // Dependencies.
  var Backbone = require('backbone'),

      VIEW = {
        padding: {
          left:   10,
          top:    10,
          right:  10,
          bottom: 10
        }
      },

      // Get real width SVG of element using bounding box.
      getRealWidth = function (d3selection) {
        return d3selection.node().getBBox().width;
      },

      // Get real height SVG of element using bounding box.
      getRealHeight = function (d3selection) {
        return d3selection.node().getBBox().height;
      },

      // Bar graph scales itself according to the given height.
      // We assume some CANONICAL_HEIGHT. All values which should
      // be scaled, should assume this canonical height as basic
      // reference.
      CANONICAL_HEIGHT = 500,
      getScaleFunc = function (height) {
        var factor = height / CANONICAL_HEIGHT;
        // Prevent from too small fonts.
        if (factor < 0.6)
          factor = 0.6;

        return function (val) {
          return val * factor;
        };
      },

      setupValueLabelPairs = function (yAxis, ticks) {
        var values = [],
            labels = {},
            i, len;

        for (i = 0, len = ticks.length; i < len; i++) {
          values[i] = ticks[i].value;
          labels[values[i]] = ticks[i].label;
        }

        yAxis
          .tickValues(values)
          .tickFormat(function (value) {
            return labels[value];
          });
      },

      BarGraphView = Backbone.View.extend({
        // Container is a DIV.
        tagName: "div",

        className: "bar-graph",

        initialize: function () {
          // Create all SVG elements ONLY in this function.
          // Avoid recreation of SVG elements while rendering.
          this.vis = d3.select(this.el).append("svg");
          this.fill = this.vis.append("rect");
          this.bar = this.vis.append("rect");
          this.title = this.vis.append("text");
          this.axisContainer = this.vis.append("g");

          this.yScale = d3.scale.linear();
          this.heightScale = d3.scale.linear();
          this.yAxis = d3.svg.axis();

          // Register callbacks!
          this.model.on("change", this.modelChanged, this);
        },

        // Render whole bar graph.
        render: function () {
              // toJSON() returns all attributes of the model.
              // This is equivalent to many calls like:
              // property1 = model.get("property1");
              // property2 = model.get("property2");
              // etc.
          var options    = this.model.toJSON(),
              // Scale function.
              scale      = getScaleFunc(options.height),
              // Basic padding (scaled).
              paddingLeft   = scale(VIEW.padding.left),
              paddingTop    = scale(VIEW.padding.top),
              paddingBottom = scale(VIEW.padding.bottom),
              // Note that right padding is especially important
              // in this function, as we are constructing bar graph
              // from right to left side. This variable holds current
              // padding. Later it is modified by appending of title,
              // axis, labels and all necessary elements.
              paddingRight  = scale(VIEW.padding.right);

          // Setup SVG element.
          this.vis
            .attr({
              "width":  options.width,
              "height": options.height
            })
            .style({
              "font-size": scale(15) + "px"
            });

          // Setup Y scale.
          this.yScale
            .domain([options.minValue, options.maxValue])
            .range([options.height - paddingTop, paddingBottom]);

          // Setup scale used to translation of the bar height.
          this.heightScale
            .domain([options.minValue, options.maxValue])
            .range([0, options.height - paddingTop - paddingBottom]);

          // Setup title.
          if (options.title !== undefined) {
            this.title
              .text(options.title)
              .style({
                "font-size": "140%",
                "text-anchor": "middle",
                "fill": options.textColor
              });

            // Rotate title and translate it into right place.
            // We do we use height for calculating right margin?
            // Text will be rotated 90*, so current height is expected width.
            paddingRight += getRealHeight(this.title);
            this.title
              .attr("transform", "translate(" + (options.width - paddingRight) + ", " + options.height / 2 + ") rotate(90)");
          }

          // Setup Y axis.
          this.yAxis
            .scale(this.yScale)
            .tickSubdivide(options.tickSubdivide)
            .tickSize(scale(10), scale(5), scale(10))
            .orient("right");

          if (typeof options.ticks === "number") {
            // Just normal tics.
            this.yAxis
              .ticks(options.ticks)
              .tickFormat(d3.format(options.labelFormat));
          } else {
            // Array with value - label pairs.
            setupValueLabelPairs(this.yAxis, options.ticks);
          }

          // Create and append Y axis.
          this.axisContainer
            .call(this.yAxis);

          // Style Y axis.
          this.axisContainer
            .style({
              "stroke": options.textColor,
              "stroke-width": scale(2),
              "fill": "none"
            });

          // Style Y axis labels.
          this.axisContainer.selectAll("text")
            .style({
              "fill": options.textColor,
              "stroke": "none",
              // Workaround for hiding numeric labels. D3 doesn't provide any convenient function
              // for that. Returning empty string as tickFormat causes that bounding box width is
              // calculated incorrectly.
              "font-size": options.displayLabels ? "100%" : 0
          });

          // Remove axis completely if ticks are equal to 0.
          if (options.ticks === 0)
            this.axisContainer.selectAll("*").remove();

          // Translate axis into right place, add narrow empty space.
          // Note that this *have* to be done after all styling to get correct width of bounding box!
          paddingRight += getRealWidth(this.axisContainer) + scale(7);
          this.axisContainer
            .attr("transform", "translate(" + (options.width - paddingRight) + ", 0)");

          // Setup background of the bar.
          paddingRight += scale(5);
          this.fill
            .attr({
              "width": (options.width - paddingLeft - paddingRight),
              "height": this.heightScale(options.maxValue),
              "x": paddingLeft,
              "y": this.yScale(options.maxValue)
            })
            .style({
              "fill": options.fillColor
            });

          // Setup the main bar.
          this.bar
            .attr({
              "width": (options.width - paddingLeft - paddingRight),
              "x": paddingLeft
            })
            .style({
              "fill": options.barColor
            });

          // Finally, update bar.
          this.updateBar();
        },

        // Updates only bar height.
        updateBar: function () {
          var value = this.model.get("value");
          this.bar
            .attr("height", this.heightScale(value))
            .attr("y", this.yScale(value));
        },

        // This function should be called whenever model attribute is changed.
        modelChanged: function () {
          var changedAttributes = this.model.changedAttributes(),
              changedAttrsCount = 0,
              name;

          // There are two possible cases.
          // Only "value" has changed, so update only bar height.
          // Other attributes have changed, so redraw whole bar graph.

          // Case 1. Check how many attributes have been changed.
          for (name in changedAttributes) {
            if (changedAttributes.hasOwnProperty(name)) {
              changedAttrsCount++;
              if (changedAttrsCount > 1) {
                // If 2 or more, redraw whole bar graph.
                this.render();
                return;
              }
            }
          }

          // Case 2. Only one attribute has changed, check if it's "value".
          if (changedAttributes.value !== undefined) {
            this.updateBar();
          } else {
            this.render();
          }
        }
      });

  return BarGraphView;
});
