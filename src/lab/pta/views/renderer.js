/*global $ alert ACTUAL_ROOT model_player define: false, d3: false */
// ------------------------------------------------------------
//
//   PTA View Renderer
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var console               = require('common/console'),
      layout                = require('common/layout/layout'),
      wrapSVGText           = require('cs!common/layout/wrap-svg-text');

  return function PTAView(model, containers, m2px, m2pxInv) {
        // Public API object to be returned.
    var api = {},

        mainContainer,

        modelWidth,
        modelHeight,
        aspectRatio,

        model2px = m2px,
        model2pxInv = m2pxInv,

        // The model function get_results() returns a 2 dimensional array
        // of particle indices and properties that is updated every model tick.
        // This array is not garbage-collected so the view can be assured that
        // the latest results will be in this array when the view is executing
        modelResults,

        // Array which defines a gradient assigned to a given turtle.
        gradientNameForTurtle = [],

        turtleTooltipOn,

        turtle,
        label, labelEnter,
        turtleDiv, turtleDivPre,

        // for model clock
        timeLabel,
        modelTimeFormatter = d3.format("5.0f"),
        timePrefix = "",
        timeSuffix = "",

        // Basic scaling function, it transforms model units to "pixels".
        // Use it for dimensions of objects rendered inside the view.
        model2px,
        // Inverted scaling function transforming model units to "pixels".
        // Use it for Y coordinates, as model coordinate system has (0, 0) point
        // in lower left corner, but SVG has (0, 0) point in upper left corner.
        model2pxInv;

    function modelTimeLabel() {
      return timePrefix + modelTimeFormatter(model.get('time')) + timeSuffix;
    }

    // Returns gradient appropriate for a given turtle.
    // d - turtle data.
    function getTurtleGradient(d) {
      if (d.marked) {
        return "url(#mark-grad)";
      } else {
        return "url(#neutral-grad)";
      }
    }

    function updateTurtleRadius() {
      mainContainer.selectAll("circle").data(modelResults).attr("r",  function(d) { return model2px(d.radius); });
    }

    function setupColorsOfTurtles() {
      var i, len;

      gradientNameForTurtle.length = modelResults.length;
      for (i = 0, len = modelResults.length; i < len; i++)
        gradientNameForTurtle[i] = getTurtleGradient(modelResults[i]);
    }

    function setupTurtles() {

      mainContainer.selectAll("circle").remove();
      mainContainer.selectAll("g.label").remove();

      turtle = mainContainer.selectAll("circle").data(modelResults);

      turtleEnter();

      label = mainContainer.selectAll("g.label")
          .data(modelResults);

      labelEnter = label.enter().append("g")
          .attr("class", "label")
          .attr("transform", function(d) {
            return "translate(" + model2px(d.x) + "," + model2pxInv(d.y) + ")";
          });

      labelEnter.each(function (d) {
        var selection = d3.select(this),
            txtValue, txtSelection;
        // Append appropriate label. For now:
        // If 'turtleNumbers' option is enabled, use indices.
        // If not and there is available 'label'/'symbol' property, use one of them
        if (model.get("turtleNumbers")) {
          selection.append("text")
            .text(d.idx)
            .style("font-size", model2px(1.4 * d.radius) + "px");
        }
        // Set common attributes for labels (+ shadows).
        txtSelection = selection.selectAll("text");
        // Check if node exists and if so, set appropriate attributes.
        if (txtSelection.node()) {
          txtSelection
            .attr("pointer-events", "none")
            .style({
              "font-weight": "bold",
              "opacity": 0.7
            });
          txtSelection
            .attr({
              // Center labels, use real width and height.
              // Note that this attrs should be set *after* all previous styling options.
              // .node() will return first node in selection. It's OK - both texts
              // (label and its shadow) have the same dimension.
              "x": -txtSelection.node().getComputedTextLength() / 2,
              "y": "0.31em"//bBox.height / 4
            });
        }
        // Set common attributes for shadows.
        selection.select("text.shadow")
          .style({
            "stroke": "#fff",
            "stroke-width": 0.15 * model2px(d.radius),
            "stroke-opacity": 0.7
          });
      });
    }

    /**
      Call this wherever a d3 selection is being used to add circles for turtles
    */

    function turtleEnter() {
      turtle.enter().append("circle")
          .attr({
            "r":  function(d) {
              return model2px(d.radius); },
            "cx": function(d) {
              return model2px(d.x); },
            "cy": function(d) {
              return model2pxInv(d.y); }
          })
          .style({
            "fill-opacity": function(d) { return d.visible; },
            "fill": function (d, i) { return gradientNameForTurtle[i]; }
          })
          .on("mousedown", turtleMouseDown)
          .on("mouseover", turtleMouseOver)
          .on("mouseout", turtleMouseOut);
    }

    function turtleUpdate() {
      turtle.attr({
        "r":  function(d) {
          return model2px(d.radius); },
        "cx": function(d) {
          return model2px(d.x); },
        "cy": function(d) {
          return model2pxInv(d.y); }
      });

      if (turtleTooltipOn === 0 || turtleTooltipOn > 0) {
        renderTurtleTooltip(turtleTooltipOn);
      }
    }

    function turtleMouseOver(d, i) {
      if (model.get("enableTurtleTooltips")) {
        renderTurtleTooltip(i);
      }
    }

    function turtleMouseDown(d, i) {
      containers.node.focus();
      if (model.get("enableTurtleTooltips")) {
        if (turtleTooltipOn !== false) {
          turtleDiv.style("opacity", 1e-6);
          turtleDiv.style("display", "none");
          turtleTooltipOn = false;
        } else {
          if (d3.event.shiftKey) {
            turtleTooltipOn = i;
          } else {
            turtleTooltipOn = false;
          }
          renderTurtleTooltip(i);
        }
      }
    }

    function renderTurtleTooltip(i) {
      turtleDiv
            .style("opacity", 1.0)
            .style("display", "inline")
            .style("background", "rgba(100%, 100%, 100%, 0.7)")
            .style("left", model2px(modelResults[i].x) + 60 + "px")
            .style("top",  model2pxInv(modelResults[i].y) + 30 + "px")
            .style("zIndex", 100)
            .transition().duration(250);

      turtleDivPre.text(
          "turtle: " + i + "\n" +
          "time: " + modelTimeLabel() + "\n" +
          "speed: " + d3.format("+6.3e")(modelResults[i].speed) + "\n" +
          "vx:    " + d3.format("+6.3e")(modelResults[i].vx)    + "\n" +
          "vy:    " + d3.format("+6.3e")(modelResults[i].vy)    + "\n" +
          "ax:    " + d3.format("+6.3e")(modelResults[i].ax)    + "\n" +
          "ay:    " + d3.format("+6.3e")(modelResults[i].ay)    + "\n"
        );
    }

    function turtleMouseOut() {
      if (!turtleTooltipOn && turtleTooltipOn !== 0) {
        turtleDiv.style("opacity", 1e-6).style("zIndex" -1);
      }
    }

    function setupTooTips() {
      if ( turtleDiv === undefined) {
        turtleDiv = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 1e-6);
        turtleDivPre = turtleDiv.append("pre");
      }
    }

    function setupClock() {
      var xunitOffset;
      xunitOffset = model.get("xunits") ? 30 : 0;
      // add model time display
      mainContainer.selectAll('.modelTimeLabel').remove();
      // Update clock status.
      showClock = model.get("showClock");
      if (showClock) {
        timeLabel = mainContainer.append("text")
          .attr("class", "modelTimeLabel")
          .text(modelTimeLabel())
          // Set text position to (0nm, 0nm) (model domain) and add small, constant offset in px.
          .attr("x", model2px(0) + 5 * emsize)
          .attr("y", model2pxInv(0) + 30 * emsize + xunitOffset * emsize)
          .style("text-anchor","start");
      }
    }

    //
    // *** Main Renderer functions ***
    //

    //
    // PTA Renderer: init
    //
    // Called when Renderer is created.
    //
    function init() {
      mainContainer = containers.mainContainer,
      modelResults  = model.get_results();
      modelWidth    = model.get('width');
      modelHeight   = model.get('height');
      aspectRatio   = modelWidth / modelHeight;

      setupTooTips();
      repaint();
      model.on('addTurtle', repaint);
      model.on('removeTurtle', repaint);
    }

    //
    // MD2D Renderer: reset
    //
    // Call when model is reset or reloaded.
    //
    function reset(mod, cont, m2px, m2pxInv) {
      model = mod;
      containers = cont;
      model2px = m2px;
      model2pxInv = m2pxInv;
      init();
    }

    //
    // PTA Renderer: repaint
    //
    // Call when container being rendered into changes size, in that case
    // pass in new D3 scales for model2pcx transformations.
    //
    // Also call when the number of objects changes suc that the conatiner
    // must be setup again.
    //
    function repaint(m2px, m2pxInv) {
      if (arguments.length) {
        model2px = m2px;
        model2pxInv = m2pxInv;
      }
      emsize = layout.getVizProperties().emsize;
      setupClock();
      setupColorsOfTurtles();
      setupTurtles();
    }

    //
    // PTA Renderer: update
    //
    // Call to update visualization when model result state changes.
    // Normally called on every model tick.
    //
    function update() {
      console.time('view update');

      // update model time display
      if (showClock) {
        timeLabel.text(modelTimeLabel());
      }

      turtleUpdate();

      console.timeEnd('view update');
    }

    //
    // Public API to instantiated Renderer
    //
    api = {
      // Expose private methods.
      update: update,
      repaint: repaint,
      reset: reset,
      model2px: function(val) {
        // Note that we shouldn't just do:
        // api.nm2px = nm2px;
        // as nm2px local variable can be reinitialized
        // many times due container rescaling process.
        return model2px(val);
      },
      model2pxInv: function(val) {
        // See comments for nm2px.
        return model2pxInv(val);
      }
    };

    // Initialization.
    init();

    return api;
  };
});
