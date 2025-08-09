SYSTEM_FILE   ?= system.json
TEMPLATE_FILE ?= template.json
SYSTEM_NAME   ?= cyberpunk-red-core

CI_JOBS ?= $(shell ./.gitlab/pipeline_utils/get-jobs.sh)
CI_COMMIT_BRANCH = master

# Cleanly (re)install nodejs dependencies
install:
	@rm -rf node_modules; npm install

# Run `npx gulp build`
build:
	@DEBUG=$(DEBUG) npx gulp build

# Run `npx gulp watch`
watch:
	@DEBUG=$(DEBUG) npx gulp watch

# Run `npx gulp clean`
clean:
	@DEBUG=$(DEBUG) npx gulp clean

# Run `npx gulp clean && npx gulp watch`
cbw: clean build watch

# Runs the full CI suite against the codebase
ci:
	@if [[ "$(CI_JOBS)" == "none" ]]; then \
		echo "Please install node dependencies with 'make install'"; \
	else \
		npx gitlab-ci-local \
		  --variable \
		    CI_COMMIT_BRANCH=$(CI_COMMIT_BRANCH) \
		    CI_DEFAULT_BRANCH=$(CI_COMMIT_BRANCH) \
		  --needs $(CI_JOBS); \
		rm -rf vars.env; \
	fi

# Runs the validate packs ci job
validate-packs:
	@if [[ "$(CI_JOBS)" == "none" ]]; then \
		echo "Please install node dependencies with 'make install'"; \
	else \
		npx gitlab-ci-local \
		  --variable \
		    CI_COMMIT_BRANCH=$(CI_COMMIT_BRANCH) \
		    CI_DEFAULT_BRANCH=$(CI_COMMIT_BRANCH) \
		  --needs \
		    init \
			validate-packs; \
		rm -rf vars.env; \
	fi

# Job to lint code quickly vs. a full ci run above
lint:
	@if [[ "$(CI_JOBS)" == "none" ]]; then \
		echo "Please install node dependencies with 'make install'"; \
	else \
		npx gitlab-ci-local \
		  --variable \
		    CI_COMMIT_BRANCH=$(CI_COMMIT_BRANCH) \
		    CI_DEFAULT_BRANCH=$(CI_COMMIT_BRANCH) \
		  --needs \
		    init \
			lint-code \
			code-formatting \
			handlebars-formatting \
			lint-handlebars; \
		rm -rf vars.env; \
	fi
