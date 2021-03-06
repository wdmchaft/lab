/*globals $ CodeMirror controllers model alert DEVELOPMENT: true */
/*jshint boss:true */

DEVELOPMENT = true;

var ROOT = "/experiments",
    ROOT_REGEX = new RegExp(ROOT + "/.*$"),
    ACTUAL_ROOT = document.location.pathname.replace(ROOT_REGEX, '');

(function() {

  var interactiveDefinitionLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),

      selectInteractive = document.getElementById('select-interactive'),
      exportData = document.getElementById('export-data'),
      showData = document.getElementById('show-data'),
      exportedData = document.getElementById('exported-data'),

      $exportedData = $("exported-data"),
      editor,
      controller,
      indent = 2,
      interactiveUrl,
      interactive,
      hash,
      jsonModelPath, contentItems, mmlPath, cmlPath,
      viewType,
      dgPaylod, dgUrl,
      appletString, applet,
      nl_obj_panel, nl_obj_workspace, nl_obj_world,
      nl_obj_program, nl_obj_observer, nl_obj_globals,
      nlGlobals,
      clearDataReady;

  if (!document.location.hash) {
    if (selectInteractive) {
      selectInteractiveHandler();
    } else {
      document.location.hash = '#interactives/IS-harmonic-motion-model.json';
    }
  }

  if (hash = document.location.hash) {
    interactiveUrl = hash.substr(1, hash.length);

    $.get(interactiveUrl).done(function(results) {
      if (typeof results === 'string') results = JSON.parse(results);
      interactive = results;

      // Use the presense of selectInteractive as a proxy indicating that the
      // rest of the elements on the non-iframe-embeddable version of the page
      // are present and should be setup.
      if (selectInteractive) {
        setupFullPage();
      } else {
        viewType = 'interactive-iframe';
      }

      if (interactive.model.modelType == "netlogo-applet") {
        appletString =
          ['<applet id="netlogo-applet" code="org.nlogo.lite.Applet"',
          '     width="' + interactive.model.viewOptions.appletDimensions.width + '" height="' + interactive.model.viewOptions.appletDimensions.height + '" MAYSCRIPT="true"',
          '     archive="' + ACTUAL_ROOT + '/jnlp/org/nlogo/NetLogoLite.jar"',
          '     MAYSCRIPT="true">',
          '  <param name="DefaultModel" value="' + interactive.model.url + '"/>',
          '  <param name="java_arguments" value="-Djnlp.packEnabled=true">',
          '  <param name="MAYSCRIPT" value="true"/>',
          '  Your browser is completely ignoring the applet tag!',
          '</applet>'].join('\n');

        document.getElementById("applet-container").innerHTML = appletString;
        applet = document.getElementById('netlogo-applet');
        applet.ready = false;
        applet.checked_more_than_once = false;
        var self = this;
        window.setTimeout (function() {
          appletReady();
        }, 250);
      }
      interactiveDefinitionLoaded.resolve();
    });
  }

  function appletReady() {
    var globalsStr;
    try {
      nl_obj_panel     = applet.panel();                                           // org.nlogo.lite.Applet object
      nl_obj_workspace = nl_obj_panel.workspace();                                 // org.nlogo.lite.LiteWorkspace
      nl_obj_world     = nl_obj_workspace.org$nlogo$lite$LiteWorkspace$$world;     // org.nlogo.agent.World
      nl_obj_program   = nl_obj_world.program();                                   // org.nlogo.api.Program
      nl_obj_observer  = nl_obj_world.observer();
      nl_obj_globals   = nl_obj_program.globals();
      globalsStr = nl_obj_globals.toString();
      nlGlobals = globalsStr.substr(1, globalsStr.length-2).split(",").map(function(e) { return stripWhiteSpace(e); });
      applet.ready = true;
      window.setInterval(buttonStatusCallback, 250);
    } catch (e) {
      applet.checked_more_than_once = window.setTimeout(function() { appletReady(); }, 250);
    }
    return applet.ready;
  }

  function buttonStatusCallback() {
    var export_button = exportData,
        show_button = showData,
        dgready = "DATA-EXPORT:DATA-READY?",
        observer = nl_obj_observer,
        globals = nlGlobals,
        enable = false;

    try {
      enable = observer.getVariable(globals.indexOf(dgready));
      if (enable) {
        export_button.disabled = false;
        show_button.disabled = false;
      } else {
        export_button.disabled = true;
        show_button.disabled = true;
      }
    } catch (e) {
      // Do nothing--we'll try again in the next timer interval.
    }
  }

  $(window).load(function() {
    windowLoaded.resolve();
  });

  $.when(interactiveDefinitionLoaded, windowLoaded).done(function(results) {
    // controller = controllers.interactivesController(interactive, '#interactive-container', viewType);
  });

  $(window).bind('hashchange', function() {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });

  function stripWhiteSpace(str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  }

  function nl_cmd_execute(cmd) {
    nl_obj_panel.commandLater(cmd);
  }

  function nl_read_global(global) {
    return nl_obj_observer.getVariable(nlGlobals.indexOf(global));
  }

  function dgDataReady() {
    return nl_read_global("DATA-EXPORT:DATA-READY?");
  }

  function getExportedData() {
    return nl_read_global("DATA-EXPORT:MODEL-DATA");
  }

  function exportDataHandler() {
    nl_cmd_execute("data-export:make-model-data");
    clearDataReady = window.setInterval(exportDataReadyCallback, 250);
  }

  function exportDataReadyCallback() {
    var modelDataDesc,
        dataSeries,
        runSeries,
        dgExportDone = dgDataReady();
    if (dgExportDone) {
      clearInterval(clearDataReady);
      modelData = nl_read_global("DATA-EXPORT:MODEL-DATA");
      if (exportedData) {
        exportedData.textContent = modelData;
        if (editor) {
          editor.setValue(modelData);
        }
      } else {
        console.log(modelData);
      }
    }
  }

  if (exportData) {
    exportData.onclick = exportDataHandler;
  }

  //
  // The following functions are only used when rendering the
  // non-embeddable Interactive page
  //
  function selectInteractiveHandler() {
    document.location.hash = '#' + selectInteractive.value;
  }

  function setupFullPage() {
    selectInteractive.value = interactiveUrl;

    // construct link to embeddable version of Interactive
    $("#embeddable-link").attr("href", function(i, href) { return href + hash; });

    // construct link to DataGames embeddable version of Interactive
    $("#datagames-link").attr("href", function(i, href) {
      dgPayload = [{
        "name": $(selectInteractive).find("option:selected").text(),
        "dimensions": interactive.model.viewOptions.dimensions,
        "url": "DataGames/Games/concord-lab" + "/experiments/netlogo-is-exporter/embeddable.html#" +  interactiveUrl
      }];
      dgUrl = "http://is.kcptech.com/dg?moreGames=" + JSON.stringify(dgPayload);
      return encodeURI(dgUrl);
    });
    setupCodeEditor();
    selectInteractive.onchange = selectInteractiveHandler;
  }

  //
  // Interactive Code Editor
  //
  function setupCodeEditor() {
    $exportedData.text("");
    foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder);
    if (!editor) {
      editor = CodeMirror.fromTextArea(exportedData, {
        mode: { name: "javascript", json: true },
        indentUnit: indent,
        lineNumbers: true,
        lineWrapping: false
      });
    }
    editor.on("gutterClick", foldFunc);
  }

  function autoFormatEditorContent(ed) {
    var cursorStart = ed.getCursor("start"),
        cursorEnd = ed.getCursor("end"),
        lastLine = ed.lineCount(),
        viewPort = ed.getViewport();
    ed.autoFormatRange({ ch:0, line: 0 }, { ch:0, line: lastLine });
    ed.setSelection(cursorStart, cursorEnd);
    ed.scrollIntoView({ ch:0, line: viewPort.from });
  }

  // startButtonStatusCallback();

}());
