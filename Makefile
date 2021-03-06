# See the README for installation instructions.

# Utilities
JS_COMPILER = ./node_modules/uglify-js/bin/uglifyjs
COFFEESCRIPT_COMPILER = ./node_modules/coffee-script/bin/coffee
MARKDOWN_COMPILER = bin/kramdown
# Turns out that just pointing Vows at a directory doesn't work, and its test matcher matches on
# the test's title, not its pathname. So we need to find everything in test/vows first.
VOWS = find test/vows -type f -name '*.js' -o -name '*.coffee' ! -name '.*' | xargs ./node_modules/.bin/vows --isolate --dot-matrix
MOCHA = find test/mocha -type f -name '*.js' -o -name '*.coffee' ! -name '.*' | xargs node_modules/.bin/mocha --reporter dot
EXAMPLES_LAB_DIR = ./examples/lab
SASS_COMPILER = bin/sass -I src
BROWSERIFY = ./node_modules/.bin/browserify
R_OPTIMIZER = ./node_modules/.bin/r.js
GENERATE_INTERACTIVE_INDEX = ruby src/helpers/examples/interactives/process-interactives.rb

LAB_SRC_FILES := $(shell find src/lab -type f ! -name '.*' -print)
GRAPHER_SRC_FILES := $(shell find src/lab/grapher -type f ! -name '.*' -print)
IMPORT_EXPORT_SRC_FILES := $(shell find src/lab/import-export -type f ! -name '.*' -print)
ENERGY2D_SRC_FILES := $(shell find src/lab/energy2d -type f ! -name '.*' -print)
MD2D_SRC_FILES := $(shell find src/lab/md2d -type f ! -name '.*' -print)
COMMON_SRC_FILES := $(shell find src/lab/common -type f ! -name '.*' -print)
COMMON_SRC_FILES += src/lab/lab.version.js # files generated by script during build process,
COMMON_SRC_FILES += src/lab/lab.config.js  # so, cannot be listed using shell find.

GLSL_TO_JS_CONVERTER := ./node-bin/glsl-to-js-converter
LAB_GLSL_FILES := $(shell find src/lab -name '*.glsl' -print)

COUCHDB_RUNNING := $(findstring couch,$(shell curl http://localhost:5984 2> /dev/null))

# targets

INTERACTIVE_FILES := $(shell find src/examples/interactives/interactives -name '*.json' -exec echo {} \; | sed s'/src\/\(.*\)/server\/public\/\1/' )
vpath %.json src

HAML_FILES := $(shell find src -name '*.haml' -exec echo {} \; | sed s'/src\/\(.*\)\.haml/server\/public\/\1/' )
vpath %.haml src

SASS_EXAMPLE_FILES := $(shell find src/examples -name '*.sass' -exec echo {} \; | sed s'/src\/\(.*\)\.sass/server\/public\/\1.css/' )
vpath %.sass src/examples

SASS_DOC_FILES := $(shell find src/doc -name '*.sass' -exec echo {} \; | sed s'/src\/\(.*\)\.sass/server\/public\/\1.css/' )
DOC_FILES := $(SASS_DOC_FILES)
vpath %.sass src/doc

DOC_FILES += $(shell find src/doc -name '*.html' -print | sed s'/src\/\(.*\)\.html/server\/public\/\1.html/')
vpath %.html src/doc

DOC_FILES += $(shell find src/doc -name '*.css' -print | sed s'/src\/\(.*\)\.css/server\/public\/\1.css/')
vpath %.css src/doc

SCSS_EXAMPLE_FILES := $(shell find src -type d -name 'sass' -prune -o -name '*.scss' -exec echo {} \; | grep -v bourbon | sed s'/src\/\(.*\)\.scss/server\/public\/\1.css/' )
vpath %.scss src

COFFEESCRIPT_EXAMPLE_FILES := $(shell find src/examples -name '*.coffee' -exec echo {} \; | sed s'/src\/\(.*\)\.coffee/server\/public\/\1.js/' )
vpath %.coffee src

MARKDOWN_EXAMPLE_FILES := $(shell find src -type d -name 'sass' -prune -o -name '*.md'  -maxdepth 1 -exec echo {} \; | grep -v vendor | sed s'/src\/\(.*\)\.md/server\/public\/\1.html/' )
vpath %.md src

LAB_JS_FILES = \
	server/public/lab/lab.grapher.js \
	server/public/lab/lab.energy2d.js \
	server/public/lab/lab.md2d.js \
	server/public/lab/lab.import-export.js \
	server/public/lab/lab.js

all: \
	src/vendor/d3 \
	node_modules \
	bin \
	server/public
	$(MAKE) src

.PHONY: everything
everything:
	$(MAKE) clean
	$(MAKE) all
	$(MAKE) jnlp-all

.PHONY: public
public:
	bash -O extglob -c 'rm -rf server/public/!(.git|jnlp|vendor)'
	$(MAKE) all

.PHONY: src
src: \
	$(MARKDOWN_EXAMPLE_FILES) \
	$(LAB_JS_FILES) \
	$(LAB_JS_FILES:.js=.min.js) \
	$(HAML_FILES) \
	$(SASS_EXAMPLE_FILES) \
	$(DOC_FILES) \
	$(SCSS_EXAMPLE_FILES) \
	$(COFFEESCRIPT_EXAMPLE_FILES) \
	$(INTERACTIVE_FILES) \
	server/public/examples/interactives/interactives.json \
	server/public/index.css \
	server/public/lab-amd

.PHONY: jnlp-all
jnlp-all: clean-jnlp \
	server/public/jnlp
	script/build-and-deploy-jars.rb --maven-update

clean:
	ruby script/check-development-dependencies.rb
	bundle install --binstubs
	cd server && bundle install --binstubs
	# Server dir cleanup.
	bash -O extglob -c 'rm -rf server/public/!(.git|jnlp)'
	# Remove auto-generated files.
	rm -f src/lab/lab.config.js
	rm -f src/lab/lab.version.js
	# Node modules.
	rm -rf node_modules
	-$(MAKE) submodule-update || $(MAKE) submodule-update-tags
	rm -f src/vendor/jquery/dist/jquery*.js
	rm -f src/vendor/jquery-ui/dist/jquery-ui*.js
	rm -f src/vendor/lightgl.js/lightgl.js

.PHONY: submodule-update
submodule-update:
	git submodule update --init --recursive

.PHONY: submodule-update-tags
submodule-update-tags:
	git submodule foreach --recursive 'git fetch --tags'
	git submodule update --init --recursive

clean-jnlp:
	rm -rf server/public/jnlp

src/vendor/d3:
	git submodule update --init --recursive

node_modules: node_modules/coffee-script \
	node_modules/jsdom \
	node_modules/sizzle \
	node_modules/backbone \
	node_modules/underscore \
	node_modules/uglify-js	\
	node_modules/vows \
	node_modules/mocha \
	node_modules/should \
	node_modules/sinon \
	node_modules/node-inspector \
	node_modules/d3 \
	node_modules/science \
	node_modules/browserify \
	node_modules/cheerio \
	node_modules/jade \
	node_modules/mkdirp \
	node_modules/arrays
	npm install

node_modules/coffee-script:
	npm install

node_modules/jsdom:
	npm install

node_modules/sizzle:
	npm install

node_modules/backbone:
	npm install

node_modules/underscore:
	npm install

node_modules/uglify-js:
	npm install

node_modules/vows:
	npm install

node_modules/mocha:
	npm install

node_modules/should:
	npm install

node_modules/sinon:
	npm install

node_modules/node-inspector:
	npm install

node_modules/d3:
	npm install src/vendor/d3

node_modules/science:
	npm install src/vendor/science.js

node_modules/browserify:
	npm install

node_modules/cheerio:
	npm install

node_modules/jade:
	npm install

node_modules/mkdirp:
	npm install

node_modules/arrays:
	npm install src/modules/arrays

bin:
	bundle install --binstubs

server/public: \
	server/public/lab \
	server/public/lab-amd \
	server/public/vendor \
	server/public/resources \
	server/public/examples \
	server/public/doc \
	server/public/experiments \
	server/public/imports \
	server/public/jnlp \
	create_public_symlinks

create_public_symlinks:
	cd server/public; \
	ln -s -f examples/interactives/embeddable-author.html embeddable-author.html; \
	ln -s -f examples/interactives/embeddable.html embeddable.html; \
	ln -s -f examples/interactives/interactives.html interactives.html; \
	ln -s -f examples/interactives/embeddable-author.css embeddable-author.css; \
	ln -s -f examples/interactives/embeddable.css embeddable.css; \
	ln -s -f examples/interactives/molecules-view.css molecules-view.css; \
	ln -s -f examples/interactives/interactives.css interactives.css; \
	ln -s -f examples/interactives/application.js application.js;

server/public/examples:
	mkdir -p server/public/examples
	# copy everything (including symbolic links) except files that are used to generate
  # resources from src/examples/ to server/public/examples/
	rsync -aq --filter '+ */' --exclude='*.haml' --exclude='*.sass' --exclude='*.scss' --exclude='*.yaml' --exclude='*.coffee' src/examples/ server/public/examples/
	$(INTERACTIVES_JSON)

server/public/doc: \
	server/public/doc/interactives \
	server/public/doc/models
	# copy HTML/CSS, directories, javascript, json, and image resources from src/doc/
	rsync -aq --filter '+ */' --include='*.html' --include='*.css' --include='*.js' --include='*.json' --include='*.gif' --include='*.png' --include='*.jpg'  --filter 'hide,! */' src/doc/ server/public/doc/

server/public/doc/interactives:
	mkdir -p server/public/doc/interactives

server/public/doc/models:
	mkdir -p server/public/doc/models

server/public/lab-amd: $(LAB_SRC_FILES)
	mkdir -p server/public/lab-amd
	rsync -aq src/lab/* server/public/lab-amd

.PHONY: server/public/experiments
server/public/experiments:
	mkdir -p server/public/experiments
	rsync -aq src/experiments server/public/

.PHONY: server/public/jnlp
server/public/jnlp:
	mkdir -p server/public/jnlp
	rsync -aq src/jnlp server/public/

# MML->JSON conversion uses MD2D models for validation and default values handling
# so it depends on appropriate sources.
.PHONY: server/public/imports
server/public/imports: \
	$(MD2D_SRC_FILES) \
	$(COMMON_SRC_FILES)
	mkdir -p server/public/imports
	rsync -aq imports/ server/public/imports/
	$(MAKE) convert-mml
	rsync -aq --exclude 'converted/***' --filter '+ */'  --prune-empty-dirs --exclude '*.mml' --exclude '*.cml' --exclude '.*' --exclude '/*' server/public/imports/legacy-mw-content/ server/public/imports/legacy-mw-content/converted/

.PHONY: convert-mml
convert-mml:
	./node-bin/convert-mml-files
	./node-bin/create-mml-html-index
	./src/helpers/md2d/post-batch-processor.rb

.PHONY: convert-all-mml
convert-all-mml:
	./node-bin/convert-mml-files -a
	./node-bin/create-mml-html-index
	./src/helpers/md2d/post-batch-processor.rb

server/public/resources:
	cp -R ./src/resources ./server/public/

server/public/vendor: \
	server/public/vendor/d3 \
	server/public/vendor/d3-plugins \
	server/public/vendor/jquery/jquery.min.js \
	server/public/vendor/jquery-ui/jquery-ui.min.js \
	server/public/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js \
	server/public/vendor/tinysort/jquery.tinysort.js \
	server/public/vendor/jquery-context-menu \
	server/public/vendor/science.js \
	server/public/vendor/modernizr \
	server/public/vendor/sizzle \
	server/public/vendor/hijs \
	server/public/vendor/mathjax \
	server/public/vendor/fonts \
	server/public/vendor/codemirror \
	server/public/vendor/dsp.js \
	server/public/vendor/lightgl.js \
	server/public/vendor/requirejs \
	server/public/vendor/text \
	server/public/vendor/domReady \
	server/public/favicon.ico

server/public/vendor/dsp.js:
	mkdir -p server/public/vendor/dsp.js
	cp src/vendor/dsp.js/dsp.js server/public/vendor/dsp.js
	cp src/vendor/dsp.js/LICENSE server/public/vendor/dsp.js/LICENSE
	cp src/vendor/dsp.js/README server/public/vendor/dsp.js/README

server/public/vendor/lightgl.js: src/vendor/lightgl.js/lightgl.js
	mkdir -p server/public/vendor/lightgl.js
	cp src/vendor/lightgl.js/lightgl.js server/public/vendor/lightgl.js
	cp src/vendor/lightgl.js/LICENSE server/public/vendor/lightgl.js/LICENSE
	cp src/vendor/lightgl.js/README.md server/public/vendor/lightgl.js/README.md

server/public/vendor/d3:
	mkdir -p server/public/vendor/d3
	cp src/vendor/d3/d3*.js server/public/vendor/d3
	cp src/vendor/d3/LICENSE server/public/vendor/d3/LICENSE
	cp src/vendor/d3/README.md server/public/vendor/d3/README.md

server/public/vendor/d3-plugins:
	mkdir -p server/public/vendor/d3-plugins/cie
	cp src/vendor/d3-plugins/LICENSE server/public/vendor/d3-plugins/LICENSE
	cp src/vendor/d3-plugins/README.md server/public/vendor/d3-plugins/README.md
	cp src/vendor/d3-plugins/cie/*.js server/public/vendor/d3-plugins/cie
	cp src/vendor/d3-plugins/cie/README.md server/public/vendor/d3-plugins/cie/README.md

server/public/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js: \
	server/public/vendor/jquery-ui-touch-punch
	cp src/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js server/public/vendor/jquery-ui-touch-punch

server/public/vendor/jquery-ui-touch-punch:
	mkdir -p server/public/vendor/jquery-ui-touch-punch

server/public/vendor/jquery-context-menu:
	mkdir -p server/public/vendor/jquery-context-menu
	cp src/vendor/jquery-context-menu/src/jquery.contextMenu.js server/public/vendor/jquery-context-menu
	cp src/vendor/jquery-context-menu/src/jquery.contextMenu.css server/public/vendor/jquery-context-menu

server/public/vendor/jquery/jquery.min.js: \
	src/vendor/jquery/dist/jquery.min.js \
	server/public/vendor/jquery
	cp src/vendor/jquery/dist/jquery*.js server/public/vendor/jquery
	cp src/vendor/jquery/MIT-LICENSE.txt server/public/vendor/jquery
	cp src/vendor/jquery/README.md server/public/vendor/jquery

server/public/vendor/jquery:
	mkdir -p server/public/vendor/jquery

server/public/vendor/jquery-ui/jquery-ui.min.js: \
	src/vendor/jquery-ui/dist/jquery-ui.min.js \
	server/public/vendor/jquery-ui
	cp -r src/vendor/jquery-ui/dist/* server/public/vendor/jquery-ui
	cp -r src/vendor/jquery-ui/themes/base/images server/public/vendor/jquery-ui
	cp src/vendor/jquery-ui/MIT-LICENSE.txt server/public/vendor/jquery-ui

server/public/vendor/jquery-ui:
	mkdir -p server/public/vendor/jquery-ui

server/public/vendor/tinysort:
	mkdir -p server/public/vendor/tinysort

server/public/vendor/tinysort/jquery.tinysort.js: \
	server/public/vendor/tinysort
	cp -r src/vendor/tinysort/src/* server/public/vendor/tinysort
	cp src/vendor/tinysort/README.md server/public/vendor/tinysort

server/public/vendor/science.js:
	mkdir -p server/public/vendor/science.js
	cp src/vendor/science.js/science*.js server/public/vendor/science.js
	cp src/vendor/science.js/LICENSE server/public/vendor/science.js
	cp src/vendor/science.js/README.md server/public/vendor/science.js

server/public/vendor/modernizr:
	mkdir -p server/public/vendor/modernizr
	cp src/vendor/modernizr/modernizr.js server/public/vendor/modernizr
	cp src/vendor/modernizr/readme.md server/public/vendor/modernizr

server/public/vendor/sizzle:
	mkdir -p server/public/vendor/sizzle
	cp src/vendor/sizzle/sizzle.js server/public/vendor/sizzle
	cp src/vendor/sizzle/LICENSE server/public/vendor/sizzle
	cp src/vendor/sizzle/README server/public/vendor/sizzle

server/public/vendor/hijs:
	mkdir -p server/public/vendor/hijs
	cp src/vendor/hijs/hijs.js server/public/vendor/hijs
	cp src/vendor/hijs/LICENSE server/public/vendor/hijs
	cp src/vendor/hijs/README.md server/public/vendor/hijs

server/public/vendor/mathjax:
	mkdir -p server/public/vendor/mathjax
	cp src/vendor/mathjax/MathJax.js server/public/vendor/mathjax
	cp src/vendor/mathjax/LICENSE server/public/vendor/mathjax
	cp src/vendor/mathjax/README.md server/public/vendor/mathjax
	cp -R src/vendor/mathjax/jax server/public/vendor/mathjax
	cp -R src/vendor/mathjax/extensions server/public/vendor/mathjax
	cp -R src/vendor/mathjax/images server/public/vendor/mathjax
	cp -R src/vendor/mathjax/fonts server/public/vendor/mathjax
	cp -R src/vendor/mathjax/config server/public/vendor/mathjax

server/public/vendor/fonts:
	mkdir -p server/public/vendor/fonts
	cp -R src/vendor/fonts server/public/vendor/

server/public/vendor/requirejs:
	mkdir -p server/public/vendor/requirejs
	cp src/vendor/requirejs/require.js server/public/vendor/requirejs
	cp src/vendor/requirejs/LICENSE server/public/vendor/requirejs
	cp src/vendor/requirejs/README.md server/public/vendor/requirejs

server/public/vendor/text:
	mkdir -p server/public/vendor/text
	cp src/vendor/text/text.js server/public/vendor/text
	cp src/vendor/text/LICENSE server/public/vendor/text
	cp src/vendor/text/README.md server/public/vendor/text

server/public/vendor/domReady:
	mkdir -p server/public/vendor/domReady
	cp src/vendor/domReady/domReady.js server/public/vendor/domReady
	cp src/vendor/domReady/LICENSE server/public/vendor/domReady
	cp src/vendor/domReady/README.md server/public/vendor/domReady

server/public/vendor/codemirror:
	mkdir -p server/public/vendor/codemirror
	cp src/vendor/codemirror/LICENSE server/public/vendor/codemirror
	cp src/vendor/codemirror/README.md server/public/vendor/codemirror
	cp -R src/vendor/codemirror/lib server/public/vendor/codemirror
	cp -R src/vendor/codemirror/mode server/public/vendor/codemirror
	cp -R src/vendor/codemirror/theme server/public/vendor/codemirror
	cp -R src/vendor/codemirror/keymap server/public/vendor/codemirror
	# remove codemirror modules excluded by incompatible licensing
	rm -rf server/public/vendor/codemirror/mode/go
	rm -rf server/public/vendor/codemirror/mode/rst
	rm -rf server/public/vendor/codemirror/mode/verilog

server/public/favicon.ico:
	cp -f src/favicon.ico server/public/favicon.ico

src/vendor/lightgl.js/lightgl.js:
	cd src/vendor/lightgl.js; python build.py

src/vendor/jquery/dist/jquery.min.js: src/vendor/jquery
	cd src/vendor/jquery; npm install; \
	 npm rm grunt-compare-size; npm install grunt-compare-size@0.2.0; \
	 ./node_modules/grunt/bin/grunt

src/vendor/jquery:
	git submodule update --init --recursive

src/vendor/jquery-ui/dist/jquery-ui.min.js: src/vendor/jquery-ui
	cd src/vendor/jquery-ui; npm install; ./node_modules/grunt/bin/grunt build

src/vendor/jquery-ui:
	git submodule update --init --recursive

server/public/lab:
	mkdir -p server/public/lab

server/public/lab/lab.js: $(LAB_SRC_FILES)
	$(R_OPTIMIZER) -o src/lab/lab.build.js

src/lab/lab.version.js: script/generate-js-version.rb
	./script/generate-js-version.rb

src/lab/lab.config.js: \
	script/generate-js-config.rb \
	config/config.yml
	./script/generate-js-config.rb

server/public/lab/lab.energy2d.js: \
	$(ENERGY2D_SRC_FILES) \
	$(COMMON_SRC_FILES)
	$(R_OPTIMIZER) -o src/lab/energy2d/energy2d.build.js

server/public/lab/lab.grapher.js: \
	$(GRAPHER_SRC_FILES) \
	$(COMMON_SRC_FILES)
	$(R_OPTIMIZER) -o src/lab/grapher/grapher.build.js

server/public/lab/lab.import-export.js: \
	$(IMPORT_EXPORT_SRC_FILES) \
	$(COMMON_SRC_FILES)
	$(R_OPTIMIZER) -o src/lab/import-export/import-export.build.js

server/public/lab/lab.md2d.js: \
	$(MD2D_SRC_FILES) \
	$(COMMON_SRC_FILES)
	$(R_OPTIMIZER) -o src/lab/md2d/md2d.build.js

server/public/lab/lab.mw-helpers.js: src/mw-helpers/*.coffee
	cat $^ | $(COFFEESCRIPT_COMPILER) --stdio --print > $@
	@chmod ug+w $@

test: test/layout.html \
	src/vendor/d3 \
	server/public \
	$(LAB_JS_FILES) \
	$(JS_FILES:.js=.min.js)
	@echo
	@echo 'Mocha tests ...'
	@$(MOCHA)
	@echo 'Vows tests ...'
	@$(VOWS)
	@echo

.PHONY: test-src
test-src: test/layout.html \
	$(LAB_JS_FILES) \
	$(JS_FILES:.js=.min.js)
	@echo 'Running Mocha tests ...'
	@$(MOCHA)
	@echo 'Running Vows tests ...'
	@$(VOWS)

# run vows test WITHOUT trying to build Lab JS first. Run 'make; make test-mocha' to build & test.
.PHONY: test-vows
test-vows:
	@echo 'Running Vows tests ...'
	@$(VOWS)

# run mocha test WITHOUT trying to build Lab JS first. Run 'make; make test-mocha' to build & test.
.PHONY: test-mocha
test-mocha:
	@echo 'Running Mocha tests ...'
	@$(MOCHA)

.PHONY: debug-mocha
debug-mocha:
	@echo 'Running Mocha tests in debug mode...'
	@$(MOCHA) --debug-brk

%.min.js: %.js
	@rm -f $@
ifndef LAB_DEVELOPMENT
	$(JS_COMPILER) < $< > $@
	@chmod ug+w $@
else
endif

test/%.html: test/%.html.haml
	haml $< $@

server/public/%.html: src/%.html.haml
	haml -r ./script/setup.rb $< $@

server/public/%.html: src/%.html
	mkdir -p `dirname $@`
	cp $< $@

server/public/%.css: src/%.css
	mkdir -p `dirname $@`
	cp $< $@

server/public/index.css:
	$(SASS_COMPILER) src/index.sass server/public/index.css

server/public/examples/%.css: %.sass
	$(SASS_COMPILER) $< $@

server/public/doc/%.css: %.sass
	$(SASS_COMPILER) $< $@

server/public/lab/%.css: %.sass
	$(SASS_COMPILER) $< $@

lab/%.css: %.sass
	$(SASS_COMPILER) $< $@

server/public/%.css: %.scss
	$(SASS_COMPILER) $< $@

server/public/%.js: %.coffee
	@rm -f $@
	$(COFFEESCRIPT_COMPILER) --compile --print $< > $@

server/public/%.html: %.md
	@rm -f $@
	$(MARKDOWN_COMPILER) $< --toc-levels 2..6 --template src/layouts/$*.html.erb > $@

server/public/examples/interactives/interactives/%.json: src/examples/interactives/interactives/%.json
	@cp $< $@

server/public/examples/interactives/interactives.json: $(INTERACTIVE_FILES)
	$(GENERATE_INTERACTIVE_INDEX)

.PHONY: h
h:
	@echo $(HAML_FILES)

.PHONY: se
se:
	@echo $(SASS_EXAMPLE_FILES)

.PHONY: sce
sce:
	@echo $(SCSS_EXAMPLE_FILES)

.PHONY: sd
sd:
	@echo $(DOC_FILES)

.PHONY: s1
sl:
	@echo $(SASS_LIBRARY_FILES)

.PHONY: c
c:
	@echo $(COFFEESCRIPT_EXAMPLE_FILES)

.PHONY: cm
cm:
	@echo $(COMMON_SRC_FILES)

.PHONY: m
m:
	@echo $(MARKDOWN_EXAMPLE_FILES)

.PHONY: md2
md2:
	@echo $(MD2D_SRC_FILES)

.PHONY: gr
gr:
	@echo $(GRAPHER_SRC_FILES)

.PHONY: int
int:
	@echo $(INTERACTIVE_FILES)

.PHONY: cdb
cdb:
	@echo $(COUCHDB_RUNNING)

.PHONY: sources
sources:
	@echo $(LAB_SRC_FILES)

.PHONY: cdb-status
cdb-status:
ifeq ($(COUCHDB_RUNNING),couch)
	@echo "couchdb running"
else
	@echo "couchdb not running"
endif

