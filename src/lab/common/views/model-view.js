/*global $ model_player define: false, d3: false */
// ------------------------------------------------------------
//
//   PTA View Container
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var labConfig             = require('lab.config'),
      PlayResetComponentSVG = require('cs!common/components/play_reset_svg'),
      PlayOnlyComponentSVG  = require('cs!common/components/play_only_svg'),
      PlaybackComponentSVG  = require('cs!common/components/playback_svg'),
      gradients             = require('common/views/gradients');

  return function ModelView(modelUrl, model, Renderer) {
        // Public API object to be returned.
    var api = {},
        renderer,
        containers = {},
        $el,
        node,
        emsize,
        imagePath,
        vis1, vis, plot,
        playbackComponent,
        cx, cy,
        padding, size, modelSize,
        playbackXPos, playbackYPos,

        // Basic scaling function, it transforms model units to "pixels".
        // Use it for dimensions of objects rendered inside the view.
        model2px,
        // Inverted scaling function transforming model units to "pixels".
        // Use it for Y coordinates, as model coordinate system has (0, 0) point
        // in lower left corner, but SVG has (0, 0) point in upper left corner.
        model2pxInv,

        // "Containers" - SVG g elements used to position layers of the final visualization.
        mainContainer,
        gridContainer,
        radialBondsContainer,
        VDWLinesContainer,
        imageContainerBelow,
        imageContainerTop,
        textContainerBelow,
        textContainerTop,

        offsetLeft, offsetTop;

    function processOptions(newModelUrl, newModel) {
      modelUrl = newModelUrl || modelUrl;
      model = newModel || model;
      if (modelUrl) {
        imagePath = labConfig.actualRoot + modelUrl.slice(0, modelUrl.lastIndexOf("/") + 1);
      }
    }

    // Padding is based on the calculated font-size used for the model view container.
    function updatePadding() {
      emsize = $el.css('font-size');
      // Remove "px", convert to number.
      emsize = Number(emsize.substring(0, emsize.length - 2));
      // Convert value to "em", using 18px as a basic font size.
      // It doesn't have to reflect true 1em value in current context.
      // It just means, that we assume that for 18px font-size,
      // padding and playback have scale 1.
      emsize /= 18;

      padding = {
         "top":    10 * emsize,
         "right":  10 * emsize,
         "bottom": 10 * emsize,
         "left":   10 * emsize
      };

      if (model.get("xunits")) {
        padding.bottom += (15  * emsize);
      }

      if (model.get("yunits")) {
        padding.left += (15  * emsize);
      }

      if (model.get("controlButtons")) {
        padding.bottom += (40  * emsize);
      } else {
        padding.bottom += (15  * emsize);
      }
    }

    function scale() {
      var modelWidth = model.get('width'),
          modelHeight = model.get('height'),
          aspectRatio = modelWidth / modelHeight,
          width, height;

      updatePadding();

      cx = $el.width();
      width = cx - padding.left  - padding.right;
      height = width / aspectRatio;
      cy = height + padding.top  + padding.bottom;
      node.style.height = cy + "px";

      // Plot size in px.
      size = {
        "width":  width,
        "height": height
      };
      // Model size in model units.
      modelSize = {
        "width":  modelWidth,
        "height": modelHeight
      };

      offsetTop  = node.offsetTop + padding.top;
      offsetLeft = node.offsetLeft + padding.left;

      switch (model.get("controlButtons")) {
        case "play":
          playbackXPos = padding.left + (size.width - (75 * emsize))/2;
          break;
        case "play_reset":
          playbackXPos = padding.left + (size.width - (140 * emsize))/2;
          break;
        case "play_reset_step":
          playbackXPos = padding.left + (size.width - (230 * emsize))/2;
          break;
        default:
          playbackXPos = padding.left + (size.width - (230 * emsize))/2;
      }

      playbackYPos = cy - 42 * emsize;

      // Basic model2px scaling function.
      model2px = d3.scale.linear()
          .domain([0, modelSize.width])
          .range([0, size.width]);

      // Inverted model2px scaling function (for y-coordinates, inverted domain).
      model2pxInv = d3.scale.linear()
          .domain([modelSize.height, 0])
          .range([0, size.height]);
    }

    function redraw() {
      var tx = function(d) { return "translate(" + model2px(d) + ",0)"; },
          ty = function(d) { return "translate(0," + model2pxInv(d) + ")"; },
          stroke = function(d) { return d ? "#ccc" : "#666"; },
          fx = model2px.tickFormat(5),
          fy = model2pxInv.tickFormat(5);

      if (d3.event && d3.event.transform) {
          d3.event.transform(model2px, model2pxInv);
      }

      // Regenerate x-ticks…
      var gx = gridContainer.selectAll("g.x")
          .data(model2px.ticks(5), String)
          .attr("transform", tx)
          .classed("axes", true);

      gx.select("text").text(fx);

      var gxe = gx.enter().insert("g", "a")
          .attr("class", "x")
          .attr("transform", tx);

      if (model.get("gridLines")) {
        gxe.append("line")
            .attr("stroke", stroke)
            .attr("y1", 0)
            .attr("y2", size.height);
      } else {
        gxe.selectAll("line").remove();
      }

      if (model.get("xunits")) {
        gxe.append("text")
            .attr("y", size.height)
            .attr("dy", "1.25em")
            .attr("text-anchor", "middle")
            .text(fx);
      } else {
        gxe.select("text").remove();
      }

      gx.exit().remove();

      // Regenerate y-ticks…
      var gy = gridContainer.selectAll("g.y")
          .data(model2pxInv.ticks(5), String)
          .attr("transform", ty)
          .classed("axes", true);

      gy.select("text")
          .text(fy);

      var gye = gy.enter().insert("g", "a")
          .attr("class", "y")
          .attr("transform", ty)
          .attr("background-fill", "#FFEEB6");

      if (model.get("gridLines")) {
        gye.append("line")
            .attr("stroke", stroke)
            .attr("x1", 0)
            .attr("x2", size.width);
      } else {
        gye.selectAll("line").remove();
      }

      if (model.get("yunits")) {
        gye.append("text")
            .attr("x", "-0.15em")
            .attr("dy", "0.30em")
            .attr("text-anchor", "end")
            .text(fy);
      } else {
        gye.select("text").remove();
      }

      gy.exit().remove();
    }

    function createGradients() {
      // "Marked" particle gradient.
      gradients.createRadialGradient("mark-grad", "#fceabb", "#fccd4d", "#f8b500", mainContainer);

      // "Charge" gradients.
      gradients.createRadialGradient("neg-grad", "#ffefff", "#fdadad", "#e95e5e", mainContainer);
      gradients.createRadialGradient("pos-grad", "#dfffff", "#9abeff", "#767fbf", mainContainer);
      gradients.createRadialGradient("neutral-grad", "#FFFFFF", "#f2f2f2", "#A4A4A4", mainContainer);

      // "Marked" atom gradient.
      gradients.createRadialGradient("mark-grad", "#fceabb", "#fccd4d", "#f8b500", mainContainer);

      // Colored gradients, used for MD2D Editable element
      gradients.createRadialGradient("green-grad", "#dfffef", "#75a643", "#2a7216", mainContainer);
      gradients.createRadialGradient("blue-grad", "#dfefff", "#7543a6", "#2a1672", mainContainer);
      gradients.createRadialGradient("purple-grad", "#EED3F0", "#D941E0", "#84198A", mainContainer);
      gradients.createRadialGradient("aqua-grad", "#DCF5F4", "#41E0D8", "#12827C", mainContainer);
      gradients.createRadialGradient("orange-grad", "#F0E6D1", "#E0A21B", "#AD7F1C", mainContainer);
    }

    // Setup background.
    function setupBackground() {
      // Just set the color.
      plot.style("fill", model.get("backgroundColor"));
    }

    function mousedown() {
      setFocus();
    }

    function setFocus() {
      if (model.get("enableKeyboardHandlers")) {
        node.focus();
      }
    }

    // ------------------------------------------------------------
    //
    // Handle keyboard shortcuts for model operation
    //
    // ------------------------------------------------------------

    function setupKeyboardHandler() {
      if (!model.get("enableKeyboardHandlers")) return;
      $(node).keydown(function(event) {
        var keycode = event.keycode || event.which;
        switch(keycode) {
          case 13:                 // return
          event.preventDefault();
          if (!model_player.isPlaying()) {
            model_player.play();
          }
          break;

          case 32:                 // space
          event.preventDefault();
          if (model_player.isPlaying()) {
            model_player.stop();
          } else {
            model_player.play();
          }
          break;

          case 37:                 // left-arrow
          event.preventDefault();
          if (model_player.isPlaying()) {
            model_player.stop();
          } else {
            model_player.back();
          }
          break;

          case 39:                 // right-arrow
          event.preventDefault();
          if (model_player.isPlaying()) {
            model_player.stop();
          } else {
            model_player.forward();
          }
          break;
        }
      });
    }

    function renderContainer() {
      // Update cx, cy, size and modelSize variables.
      scale();

      // Create container, or update properties if it already exists.
      if (vis === undefined) {
        vis1 = d3.select(node).append("svg")
          .attr({
            'xmlns': 'http://www.w3.org/2000/svg',
            'xmlns:xmlns:xlink': 'http://www.w3.org/1999/xlink', // hack: doubling xmlns: so it doesn't disappear once in the DOM
            width: cx,
            height: cy
          })
          // SVG element should always fit its parent container.
          .style({
            width: "100%",
            height: "100%"
          });

        vis = vis1.append("g").attr("class", "particle-container-vis");

        plot = vis.append("rect")
            .attr("class", "plot");

        if (model.get("enableKeyboardHandlers")) {
          d3.select(node)
            .attr("tabindex", 0)
            .on("mousedown", mousedown);
        }

        // Create and arrange "layers" of the final image (g elements).
        // Note that order of their creation is significant.
        gridContainer        = vis.append("g").attr("class", "grid-container");
        imageContainerBelow  = vis.append("g").attr("class", "image-container-below");
        textContainerBelow   = vis.append("g").attr("class", "text-container-below");
        radialBondsContainer = vis.append("g").attr("class", "radial-bonds-container");
        VDWLinesContainer    = vis.append("g").attr("class", "vdw-lines-container");
        mainContainer        = vis.append("g").attr("class", "main-container");
        imageContainerTop    = vis.append("g").attr("class", "image-container-top");
        textContainerTop     = vis.append("g").attr("class", "text-container-top");

        containers = {
          node: node,
          gridContainer:        gridContainer,
          imageContainerBelow:  imageContainerBelow,
          textContainerBelow:   textContainerBelow,
          radialBondsContainer: radialBondsContainer,
          VDWLinesContainer:    VDWLinesContainer,
          mainContainer:        mainContainer,
          imageContainerTop:    imageContainerTop,
          textContainerTop:     textContainerTop
        };

        setupKeyboardHandler();
        createGradients();
      } else {
        // TODO: ?? what g, why is it here?
        vis.selectAll("g.x").remove();
        vis.selectAll("g.y").remove();
      }

      // Set new dimensions of the top-level SVG container.
      vis1
        .attr({
          width: cx,
          height: cy
        });

      // Update padding, as it can be changed after rescaling.
      vis
        .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      // Rescale main plot.
      vis.select("rect.plot")
        .attr({
          width: size.width,
          height: size.height
        });

      redraw();
    }

    function setupPlaybackControls() {
      d3.select('.model-controller').remove();
      switch (model.get("controlButtons")) {
        case "play":
          playbackComponent = new PlayOnlyComponentSVG(vis1, model_player, playbackXPos, playbackYPos, emsize);
          break;
        case "play_reset":
          playbackComponent = new PlayResetComponentSVG(vis1, model_player, playbackXPos, playbackYPos, emsize);
          break;
        case "play_reset_step":
          playbackComponent = new PlaybackComponentSVG(vis1, model_player, playbackXPos, playbackYPos, emsize);
          break;
        default:
          playbackComponent = null;
      }
    }

    //
    // *** Main Renderer functions ***
    //

    //
    // init
    //
    // Called when Model View Container is created.
    //
    function init() {
      // render model container ... the chrome around the model
      renderContainer();
      setupPlaybackControls();

      // dynamically add modelUrl as a model property so the renderer
      // can find resources on paths relative to the model
      model.url = modelUrl;

      // Add a pos() function to containers so the model renderer can more easily
      // manipulate absolutely positioned dom elements it may create or manage
      containers.pos = function() {
        return  mainContainer.node().parentElement.getBoundingClientRect();
      }

      // create a model renderer ... if one hasn't already been created
      if (!renderer) {
        renderer = new Renderer(model, containers, model2px, model2pxInv);
      } else {
        renderer.reset(model, containers, model2px, model2pxInv);
      }

      // Redraw container each time when some visual-related property is changed.
      model.addPropertiesListener([ "backgroundColor"], repaint);
      model.addPropertiesListener(["gridLines", "xunits", "yunits"],
        function() {
          renderContainer();
          setupPlaybackControls();
          repaint();
        }
      );
    }

    //
    // repaint
    //
    // Call when container changes size.
    //
    function repaint() {
      setupBackground();
      renderer.repaint(model2px, model2pxInv);
    }

    api = {
      update: null,
      $el: null,
      scale: scale,
      setFocus: setFocus,
      resize: function() {
        processOptions();
        init();
        repaint();
      },
      getHeightForWidth: function (width) {
        var modelWidth = model.get('width'),
            modelHeight = model.get('height'),
            aspectRatio = modelWidth / modelHeight,
            height;

        updatePadding();

        width = width - padding.left - padding.right;
        height = width / aspectRatio;
        return height + padding.top  + padding.bottom;
      },
      repaint: function() {
        repaint();
      },
      reset: function(newModelUrl, newModel) {
        processOptions(newModelUrl, newModel);
        init();
        repaint();
      },
      model2px: function(val) {
        // Note that we shouldn't just do:
        // api.model2px = model2px;
        // as model2px local variable can be reinitialized
        // many times due container rescaling process.
        return model2px(val);
      },
      model2pxInv: function(val) {
        // See comments for model2px.
        return model2pxInv(val);
      }
    };

    // Initialization.
    // jQuery object with model container.
    $el = $("<div>")
      .attr({
        "id": "model-container",
        "class": "container"
      })
      // Set initial dimensions.
      .css({
        "width": "50px",
        "height": "50px"
      });
    // DOM element.
    node = $el[0];

    processOptions();
    init();

    // Extend Public withExport initialized object to initialized objects
    api.update = renderer.update;
    api.$el = $el;

    return api;
  };
});
